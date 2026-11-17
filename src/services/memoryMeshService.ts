import {
  DriveLibraryMatrix,
  FrameSequenceRecord,
  LibraryAnalysisResult,
  MemoryMeshNode,
  MemoryMeshResponse,
} from '../types/matrix';

export async function fetchMemoryMesh(query = ''): Promise<MemoryMeshResponse> {
  const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  const res = await fetch(`/api/memory-mesh${qs}`);
  if (!res.ok) {
    throw new Error(`Memory Mesh fetch failed (${res.status})`);
  }
  return (await res.json()) as MemoryMeshResponse;
}

export async function transcribeToMemoryMesh(payload: {
  node?: Partial<MemoryMeshNode>;
  nodes?: Array<Partial<MemoryMeshNode>>;
  sequence?: FrameSequenceRecord;
  enrichWithGemini?: boolean;
}): Promise<{ ok: boolean; filePath: string; totalNodes: number; totalSequences: number; nodes: MemoryMeshNode[] }> {
  const res = await fetch('/api/memory-mesh/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Transcription failed (${res.status})`);
  }
  return await res.json();
}

export async function clearMemoryMesh(): Promise<void> {
  const res = await fetch('/api/memory-mesh', { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`Failed clearing memory mesh (${res.status})`);
  }
}

export async function processLibraryTextWithGemini(payload: {
  sourceTitle: string;
  sourceKind: string;
  rawText: string;
}): Promise<Omit<DriveLibraryMatrix, 'version' | 'updatedAt'>> {
  const res = await fetch('/api/gemini/library-process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `Gemini processing failed (${res.status})`);
  }
  return json;
}

export async function analyzeLibraryMatrixWithGemini(payload: {
  question: string;
  events: DriveLibraryMatrix['events'];
  memoryNodes: MemoryMeshNode[];
}): Promise<LibraryAnalysisResult> {
  const res = await fetch('/api/gemini/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `Gemini analysis failed (${res.status})`);
  }
  return json as LibraryAnalysisResult;
}
