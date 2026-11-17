import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const MEMORY_MESH_PATH = path.join(DATA_DIR, 'memory-mesh.json');

interface MemoryNodeRecord {
  id: string;
  timestamp: string;
  eventType: string;
  title: string;
  transcript: string;
  keywords: string[];
  slideId?: string;
  pageNumber?: number;
  transitionMode?: string;
  photoStyle?: string;
  emergenceMode?: string;
  frameCount?: number;
  frameSequenceId?: string;
  driveFileId?: string;
  encodedPayload?: Record<string, unknown>;
}

interface FrameSequenceRecord {
  id: string;
  name: string;
  createdAt: string;
  durationMs: number;
  frameCount: number;
  startSlide: string;
  endSlide: string;
  transitionMode: string;
  keyFrames: Array<{
    idx: number;
    t: number;
    prog: number;
    foldAngle: number;
    foldY: number;
    fps: number;
  }>;
}

interface MemoryMeshStore {
  version: string;
  updatedAt: string;
  totalNodes: number;
  totalSequences: number;
  nodes: MemoryNodeRecord[];
  sequences: FrameSequenceRecord[];
}

function createEmptyMesh(): MemoryMeshStore {
  return {
    version: '2.0.0',
    updatedAt: new Date().toISOString(),
    totalNodes: 0,
    totalSequences: 0,
    nodes: [],
    sequences: [],
  };
}

async function readMemoryMesh(): Promise<MemoryMeshStore> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(MEMORY_MESH_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<MemoryMeshStore>;
    const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const sequences = Array.isArray(parsed.sequences) ? parsed.sequences : [];
    return {
      version: parsed.version || '2.0.0',
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      totalNodes: nodes.length,
      totalSequences: sequences.length,
      nodes,
      sequences,
    };
  } catch {
    const empty = createEmptyMesh();
    await writeMemoryMesh(empty);
    return empty;
  }
}

async function writeMemoryMesh(mesh: MemoryMeshStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const next: MemoryMeshStore = {
    version: mesh.version || '2.0.0',
    updatedAt: new Date().toISOString(),
    totalNodes: mesh.nodes.length,
    totalSequences: mesh.sequences.length,
    nodes: mesh.nodes.slice(0, 400),
    sequences: mesh.sequences.slice(0, 120),
  };
  await fs.writeFile(MEMORY_MESH_PATH, JSON.stringify(next, null, 2), 'utf8');
}

function extractKeywords(text: string, extras: string[] = []): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  const stop = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'are', 'was', 'have']);
  const counts = new Map<string, number>();
  for (const w of words) {
    if (!stop.has(w)) counts.set(w, (counts.get(w) || 0) + 1);
  }
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
  return Array.from(new Set([...extras.filter(Boolean).map((x) => x.toLowerCase()), ...ranked])).slice(0, 12);
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // 1. Quick retrieval from separate memory-mesh.json file
  app.get('/api/memory-mesh', async (req, res) => {
    try {
      const mesh = await readMemoryMesh();
      const query = String(req.query.q || '').trim().toLowerCase();
      if (!query) {
        return res.json({
          filePath: 'data/memory-mesh.json',
          ...mesh,
        });
      }
      const terms = query.split(/\s+/).filter(Boolean);
      const matchedNodes = mesh.nodes.filter((n) => {
        const hay = `${n.title} ${n.transcript} ${n.eventType} ${n.keywords.join(' ')} ${n.transitionMode || ''}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
      const matchedSequences = mesh.sequences.filter((s) => {
        const hay = `${s.name} ${s.startSlide} ${s.endSlide} ${s.transitionMode}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
      return res.json({
        filePath: 'data/memory-mesh.json',
        version: mesh.version,
        updatedAt: mesh.updatedAt,
        totalNodes: matchedNodes.length,
        totalSequences: matchedSequences.length,
        nodes: matchedNodes,
        sequences: matchedSequences,
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed reading memory-mesh.json',
      });
    }
  });

  // Download raw memory-mesh.json directly
  app.get('/api/memory-mesh/download', async (_req, res) => {
    try {
      const mesh = await readMemoryMesh();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="memory-mesh.json"');
      return res.send(JSON.stringify(mesh, null, 2));
    } catch (err) {
      return res.status(500).json({ error: 'Failed exporting memory mesh JSON.' });
    }
  });

  // 2. Transcribe & store encoded event or frame sequence into memory-mesh.json
  app.post('/api/memory-mesh/transcribe', async (req, res) => {
    try {
      const body = req.body as {
        node?: Partial<MemoryNodeRecord>;
        nodes?: Array<Partial<MemoryNodeRecord>>;
        sequence?: FrameSequenceRecord;
        enrichWithGemini?: boolean;
      };

      const mesh = await readMemoryMesh();
      const incoming = body.nodes ? body.nodes : body.node ? [body.node] : [];
      const createdNodes: MemoryNodeRecord[] = [];

      for (const item of incoming) {
        let transcript = String(item.transcript || item.title || '').trim();
        let keywords = Array.isArray(item.keywords) ? item.keywords : [];

        if (body.enrichWithGemini && process.env.GEMINI_API_KEY && transcript.length > 0) {
          try {
            const ai = getGeminiClient();
            const promptText = `Transcribe and structure this encoded visual/document event concisely into a crisp factual summary and searchable keywords. Title: ${item.title || 'Event'}. Raw data: ${transcript.slice(0, 4000)}`;
            const aiRes = await ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: promptText,
              config: {
                systemInstruction: 'Return concise factual transcription text (max 3 sentences).',
              },
            });
            if (aiRes.text) {
              transcript = aiRes.text.trim();
            }
          } catch {
            // Fall back cleanly to direct deterministic transcription
          }
        }

        keywords = extractKeywords(`${item.title || ''} ${transcript}`, [
          String(item.eventType || ''),
          String(item.transitionMode || ''),
          String(item.photoStyle || ''),
          ...keywords,
        ]);

        const record: MemoryNodeRecord = {
          id: item.id || `mesh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: item.timestamp || new Date().toISOString(),
          eventType: item.eventType || 'encoded-event',
          title: item.title || 'Untitled Matrix Event',
          transcript,
          keywords,
          slideId: item.slideId,
          pageNumber: item.pageNumber,
          transitionMode: item.transitionMode,
          photoStyle: item.photoStyle,
          emergenceMode: item.emergenceMode,
          frameCount: item.frameCount,
          frameSequenceId: item.frameSequenceId,
          driveFileId: item.driveFileId,
          encodedPayload: item.encodedPayload,
        };

        mesh.nodes.unshift(record);
        createdNodes.push(record);
      }

      if (body.sequence) {
        mesh.sequences.unshift(body.sequence);
      }

      await writeMemoryMesh(mesh);
      return res.json({
        ok: true,
        filePath: 'data/memory-mesh.json',
        addedCount: createdNodes.length,
        nodes: mesh.nodes,
        totalNodes: mesh.nodes.length,
        totalSequences: mesh.sequences.length,
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed transcribing into memory-mesh.json',
      });
    }
  });

  app.delete('/api/memory-mesh', async (_req, res) => {
    try {
      const empty = createEmptyMesh();
      await writeMemoryMesh(empty);
      return res.json({ ok: true, ...empty });
    } catch (err) {
      return res.status(500).json({ error: 'Failed clearing memory-mesh.json' });
    }
  });

  // 3. Smart Library Mode: Read stored text -> Process via Gemini -> Encode Matrix of Events
  app.post('/api/gemini/library-process', async (req, res) => {
    try {
      const { sourceTitle, rawText, sourceKind } = req.body as {
        sourceTitle?: string;
        rawText?: string;
        sourceKind?: string;
      };

      const content = String(rawText || '').trim();
      if (!content) {
        return res.status(400).json({ error: 'No stored text provided to process.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze the following ${sourceKind || 'document'} text ("${sourceTitle || 'Library Source'}") and encode it into a structured Library Matrix of Events for archival storage in Google Drive and future data analysis.\n\nSOURCE TEXT:\n${content.slice(0, 28000)}`,
        config: {
          systemInstruction:
            'You are a precision archival intelligence engine. Extract structured chronological or thematic events, named entities, quantitative metrics, and concise analytical takeaways.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              libraryTitle: { type: Type.STRING },
              summary: { type: Type.STRING },
              themes: { type: Type.ARRAY, items: { type: Type.STRING } },
              insights: { type: Type.ARRAY, items: { type: Type.STRING } },
              events: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timestampLabel: { type: Type.STRING },
                    category: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    significance: { type: Type.STRING },
                    entities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    metrics: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['timestampLabel', 'category', 'title', 'description', 'significance', 'entities', 'metrics'],
                },
              },
            },
            required: ['libraryTitle', 'summary', 'themes', 'insights', 'events'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        libraryTitle?: string;
        summary?: string;
        themes?: string[];
        insights?: string[];
        events?: Array<{
          timestampLabel: string;
          category: string;
          title: string;
          description: string;
          significance: string;
          entities: string[];
          metrics: string[];
        }>;
      };

      const now = new Date().toISOString();
      const normalizedEvents = (parsed.events || []).map((ev, idx) => ({
        id: `ev_${Date.now()}_${idx}`,
        sourceTitle: sourceTitle || 'Stored Text',
        timestampLabel: ev.timestampLabel || `Segment ${idx + 1}`,
        category: ev.category || 'General',
        title: ev.title || `Event ${idx + 1}`,
        description: ev.description || '',
        significance: (['low', 'medium', 'high', 'critical'].includes((ev.significance || '').toLowerCase())
          ? ev.significance.toLowerCase()
          : 'medium') as 'low' | 'medium' | 'high' | 'critical',
        entities: Array.isArray(ev.entities) ? ev.entities : [],
        metrics: Array.isArray(ev.metrics) ? ev.metrics : [],
        encodedAt: now,
      }));

      // Also auto-transcribe these processed events into the local memory-mesh.json
      const mesh = await readMemoryMesh();
      mesh.nodes.unshift({
        id: `mesh_gemini_${Date.now()}`,
        timestamp: now,
        eventType: 'gemini-analysis',
        title: parsed.libraryTitle || sourceTitle || 'Gemini Library Matrix',
        transcript: parsed.summary || `Encoded ${normalizedEvents.length} events from ${sourceTitle}.`,
        keywords: extractKeywords(
          `${parsed.summary || ''} ${(parsed.themes || []).join(' ')}`,
          parsed.themes || []
        ),
        encodedPayload: { eventCount: normalizedEvents.length, themes: parsed.themes || [] },
      });
      await writeMemoryMesh(mesh);

      return res.json({
        libraryTitle: parsed.libraryTitle || sourceTitle || 'Encoded Event Library',
        summary: parsed.summary || '',
        themes: parsed.themes || [],
        insights: parsed.insights || [],
        events: normalizedEvents,
        encodedAt: now,
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Gemini library processing failed.',
      });
    }
  });

  // 4. Data Analysis across Pulled Google Drive Library Matrix + Memory Mesh
  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      const { question, events, memoryNodes } = req.body as {
        question?: string;
        events?: unknown[];
        memoryNodes?: unknown[];
      };

      const ai = getGeminiClient();
      const q = String(question || '').trim() || 'Synthesize key patterns, trends, category distributions, and anomalies across this event matrix.';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `DATA ANALYSIS QUESTION:\n${q}\n\nGOOGLE DRIVE EVENT MATRIX (${Array.isArray(events) ? events.length : 0} events):\n${JSON.stringify(events || []).slice(0, 18000)}\n\nLOCAL MEMORY MESH SNAPSHOT (${Array.isArray(memoryNodes) ? memoryNodes.length : 0} nodes):\n${JSON.stringify(memoryNodes || []).slice(0, 8000)}`,
        config: {
          systemInstruction:
            'Provide sharp, quantitative, evidence-backed data analysis using only the provided matrix events and memory mesh entries.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              answer: { type: Type.STRING },
              keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['headline', 'answer', 'keyFindings', 'recommendedActions'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({
        analyzedAt: new Date().toISOString(),
        ...parsed,
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Gemini data analysis failed.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Matrix Slide OS server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
