import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  CloudUpload,
  Cpu,
  Database,
  Download,
  FileText,
  Film,
  Layers,
  LogOut,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { EMERGENCE_MODES, PHOTO_STYLES, TRANSITION_MODES } from '../data/imagePool';
import {
  DesignMatrixConfig,
  DriveFileMeta,
  DriveLibraryMatrix,
  EmergenceMode,
  FrameSample,
  FrameSequenceRecord,
  LibraryAnalysisResult,
  MemoryMeshNode,
  PhotoStyleId,
  SidePanelTab,
  SlideItem,
} from '../types/matrix';

interface HyperSymmetricSidePanelProps {
  open: boolean;
  activeTab: SidePanelTab;
  onToggleOpen: () => void;
  onChangeTab: (tab: SidePanelTab) => void;

  // Deeper Design Matrix & Frame Scrubber
  designConfig: DesignMatrixConfig;
  onChangeDesign: (next: Partial<DesignMatrixConfig>) => void;
  activeMode: number;
  photoStyle: PhotoStyleId;
  emergenceMode: EmergenceMode;
  onTriggerMode: (modeId: number) => void;
  onChangePhotoStyle: (style: PhotoStyleId) => void;
  onChangeEmergence: (em: EmergenceMode) => void;

  // Whole-Event Frame Sequence
  liveProg: number;
  liveFoldY: number;
  liveFrames: FrameSample[];
  sequences: FrameSequenceRecord[];
  onScrubFrame: (prog: number) => void;
  onReplaySequence: (seq: FrameSequenceRecord) => void;

  // Smart Memory Mesh JSON
  memoryNodes: MemoryMeshNode[];
  memoryUpdatedAt: string;
  memoryQuery: string;
  onSearchMemory: (q: string) => void;
  onTranscribeCurrent: (enrichWithGemini: boolean) => void;
  onClearMemory: () => void;

  // Smart Library Mode + Google Drive + Gemini
  slides: SlideItem[];
  googleUser: User | null;
  hasDriveToken: boolean;
  authBusy: boolean;
  onGoogleSignIn: () => void;
  onGoogleLogout: () => void;
  driveFiles: DriveFileMeta[];
  driveBusy: boolean;
  libraryMatrix: DriveLibraryMatrix | null;
  analysisResult: LibraryAnalysisResult | null;
  onScanDriveFiles: () => void;
  onProcessDriveFile: (file: DriveFileMeta) => void;
  onAutoProcessStoredText: () => void;
  onUploadLibraryText: (file: File) => void;
  onRequestSaveLibraryToDrive: () => void;
  onPullLibraryFromDrive: () => void;
  onAnalyzeLibrary: (question: string) => void;
}

export const HyperSymmetricSidePanel: React.FC<HyperSymmetricSidePanelProps> = ({
  open,
  activeTab,
  onToggleOpen,
  onChangeTab,
  designConfig,
  onChangeDesign,
  activeMode,
  photoStyle,
  emergenceMode,
  onTriggerMode,
  onChangePhotoStyle,
  onChangeEmergence,
  liveProg,
  liveFoldY,
  liveFrames,
  sequences,
  onScrubFrame,
  onReplaySequence,
  memoryNodes,
  memoryUpdatedAt,
  memoryQuery,
  onSearchMemory,
  onTranscribeCurrent,
  onClearMemory,
  slides,
  googleUser,
  hasDriveToken,
  authBusy,
  onGoogleSignIn,
  onGoogleLogout,
  driveFiles,
  driveBusy,
  libraryMatrix,
  analysisResult,
  onScanDriveFiles,
  onProcessDriveFile,
  onAutoProcessStoredText,
  onUploadLibraryText,
  onRequestSaveLibraryToDrive,
  onPullLibraryFromDrive,
  onAnalyzeLibrary,
}) => {
  const [enrichGemini, setEnrichGemini] = useState(true);
  const [analysisQuestion, setAnalysisQuestion] = useState(
    'Identify primary themes, high-significance events, and timeline patterns.'
  );
  const textUploadRef = React.useRef<HTMLInputElement | null>(null);

  const storedTextCount =
    slides.filter((s) => Boolean(s.extractedText)).length + memoryNodes.length;

  // Compute category distribution for data analysis visualization
  const categoryStats = React.useMemo(() => {
    const events = libraryMatrix?.events || [];
    const counts = new Map<string, number>();
    for (const ev of events) {
      const cat = ev.category || 'General';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }));
  }, [libraryMatrix]);

  return (
    <>
      {/* Left Mirror Hyper-Symmetric Telemetry & Frame Rail */}
      <aside className="fractal-mirror-rail" aria-label="Symmetric Fold and Frame Telemetry">
        <div className="fractal-corner-ticks" aria-hidden="true" />
        <div className="fractal-rail-group">
          <button
            type="button"
            className="os-btn os-icon-btn os-icon-btn--square"
            onClick={onToggleOpen}
            title={open ? 'Collapse Fractal Glass Side Panel' : 'Open Fractal Glass Side Panel'}
            aria-label={open ? 'Collapse side panel' : 'Open side panel'}
          >
            {open ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </button>

          <div className="fractal-metric-block">
            <span className="fractal-metric-k">SYMM</span>
            <span className="fractal-metric-v">{designConfig.symmetryOrder || 'OFF'}</span>
          </div>

          <div className="fractal-metric-block">
            <span className="fractal-metric-k">FOLD</span>
            <span className="fractal-metric-v">{Math.round(liveProg * 100)}%</span>
          </div>

          <div className="fractal-metric-block">
            <span className="fractal-metric-k">ANCHOR</span>
            <span className="fractal-metric-v">{liveFoldY.toFixed(2)}</span>
          </div>

          <div className="fractal-metric-block">
            <span className="fractal-metric-k">MESH</span>
            <span className="fractal-metric-v">{memoryNodes.length}</span>
          </div>
        </div>

        <div className="fractal-rail-group">
          <button
            type="button"
            className={`os-btn os-icon-btn os-icon-btn--square ${open && activeTab === 'design' ? 'os-btn-active' : ''}`}
            onClick={() => {
              onChangeTab('design');
              if (!open) onToggleOpen();
            }}
            title="Design Matrix"
            aria-label="Open Design Matrix tab"
          >
            <Layers size={13} />
          </button>
          <button
            type="button"
            className={`os-btn os-icon-btn os-icon-btn--square ${open && activeTab === 'memory' ? 'os-btn-active' : ''}`}
            onClick={() => {
              onChangeTab('memory');
              if (!open) onToggleOpen();
            }}
            title="Smart Memory Mesh JSON"
            aria-label="Open Memory Mesh tab"
          >
            <Database size={13} />
          </button>
          <button
            type="button"
            className={`os-btn os-icon-btn os-icon-btn--square ${open && activeTab === 'library' ? 'os-btn-active' : ''}`}
            onClick={() => {
              onChangeTab('library');
              if (!open) onToggleOpen();
            }}
            title="Smart Library & Google Drive"
            aria-label="Open Smart Library tab"
          >
            <BookOpen size={13} />
          </button>
        </div>
      </aside>

      {/* Right Docked Micro Fractal Glass HUD Hyper-Symmetric Side Panel */}
      {open && (
        <aside
          className="fractal-glass-sidepanel os-scroll"
          aria-label="Micro Fractal Glass HUD Hyper-Symmetric Side Panel"
        >
          <div className="fractal-corner-ticks" aria-hidden="true" />

          {/* Clean Symmetric Header & Tabs */}
          <div className="fractal-panel-head">
            <div className="fractal-sym-axis" aria-hidden="true" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="panel-heading" style={{ color: '#e2e8f0' }}>
                Hyper-Symmetric Glass Studio
              </span>
              <button
                type="button"
                className="os-win-ctrl-btn"
                onClick={onToggleOpen}
                aria-label="Close side panel"
              >
                <PanelRightClose size={13} />
              </button>
            </div>

            <div className="seg-group" role="tablist" aria-label="Side Panel Workspace">
              {(
                [
                  { id: 'design', label: 'Design Matrix' },
                  { id: 'memory', label: `Mesh (${memoryNodes.length})` },
                  { id: 'library', label: 'Smart Library' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.id}
                  className={`seg-btn ${activeTab === t.id ? 'seg-btn--active' : ''}`}
                  onClick={() => onChangeTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fractal-panel-body os-scroll">
            {/* TAB 1: DEEPER DESIGN MATRIX & FRAME SEQUENCE SCRUBBER */}
            {activeTab === 'design' && (
              <>
                <div className="panel-section">
                  <div className="panel-label-row">
                    <span className="panel-heading">Hyper-Symmetric Folding Geometry</span>
                    <span className="font-mono" style={{ fontSize: 10.5, color: '#7dd3fc' }}>
                      {designConfig.symmetryOrder === 0 ? 'Planar' : `${designConfig.symmetryOrder}-Fold`}
                    </span>
                  </div>

                  <div className="seg-group" role="group" aria-label="Symmetry Order">
                    {([0, 2, 4, 6, 8] as const).map((ord) => (
                      <button
                        key={ord}
                        type="button"
                        className={`seg-btn ${designConfig.symmetryOrder === ord ? 'seg-btn--active' : ''}`}
                        onClick={() => onChangeDesign({ symmetryOrder: ord })}
                      >
                        {ord === 0 ? 'Clean' : `${ord}x`}
                      </button>
                    ))}
                  </div>

                  <div className="slider-row">
                    <span style={{ color: '#94a3b8' }}>Glass Prism</span>
                    <input
                      type="range"
                      className="os-slider"
                      min={0}
                      max={1.5}
                      step={0.05}
                      value={designConfig.refraction}
                      onChange={(e) => onChangeDesign({ refraction: parseFloat(e.target.value) })}
                      aria-label="Glass refraction dispersion"
                    />
                    <span className="slider-val">{designConfig.refraction.toFixed(2)}</span>
                  </div>

                  <div className="slider-row">
                    <span style={{ color: '#94a3b8' }}>Fractal Grid</span>
                    <input
                      type="range"
                      className="os-slider"
                      min={0}
                      max={1}
                      step={0.05}
                      value={designConfig.fractalLattice}
                      onChange={(e) => onChangeDesign({ fractalLattice: parseFloat(e.target.value) })}
                      aria-label="Micro fractal lattice intensity"
                    />
                    <span className="slider-val">{designConfig.fractalLattice.toFixed(2)}</span>
                  </div>

                  <div className="slider-row">
                    <span style={{ color: '#94a3b8' }}>Fold Stiffness</span>
                    <input
                      type="range"
                      className="os-slider"
                      min={0.5}
                      max={1.8}
                      step={0.05}
                      value={designConfig.foldCurlTension}
                      onChange={(e) => onChangeDesign({ foldCurlTension: parseFloat(e.target.value) })}
                      aria-label="Draggable page curl tension"
                    />
                    <span className="slider-val">{designConfig.foldCurlTension.toFixed(2)}</span>
                  </div>

                  <div className="slider-row">
                    <span style={{ color: '#94a3b8' }}>Corner Tilt</span>
                    <input
                      type="range"
                      className="os-slider"
                      min={-0.6}
                      max={0.6}
                      step={0.05}
                      value={designConfig.foldCornerBias}
                      onChange={(e) => onChangeDesign({ foldCornerBias: parseFloat(e.target.value) })}
                      aria-label="Diagonal page fold tilt"
                    />
                    <span className="slider-val">{designConfig.foldCornerBias.toFixed(2)}</span>
                  </div>
                </div>

                {/* Whole-Event Frame Scrubber */}
                <div className="panel-section">
                  <div className="panel-label-row">
                    <span className="panel-heading">Whole-Event Frame Sequence</span>
                    <span className="font-mono" style={{ fontSize: 10.5, color: '#94a3b8' }}>
                      {liveFrames.length} frames · {Math.round(liveProg * 100)}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      className="os-btn os-icon-btn os-icon-btn--square"
                      onClick={() => onScrubFrame(Math.max(0.02, liveProg - 0.08))}
                      title="Step backward 1 frame increment"
                      aria-label="Step frame back"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <input
                      type="range"
                      className="os-slider"
                      style={{ flex: 1 }}
                      min={0}
                      max={0.99}
                      step={0.01}
                      value={liveProg}
                      onChange={(e) => onScrubFrame(parseFloat(e.target.value))}
                      aria-label="Scrub whole-event frame sequence"
                    />
                    <button
                      type="button"
                      className="os-btn os-icon-btn os-icon-btn--square"
                      onClick={() => onScrubFrame(Math.min(0.99, liveProg + 0.08))}
                      title="Step forward 1 frame increment"
                      aria-label="Step frame forward"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                    Drag horizontally from anywhere on the canvas to bend, fold, and peel pages interactively. Release past 26% to turn or let go early to spring back.
                  </p>
                </div>

                {/* Quick Style + Emergence + Matrix Trigger */}
                <div className="panel-section">
                  <span className="panel-heading">Photo Style & Emergence Matrix</span>
                  <div className="photo-style-grid">
                    {PHOTO_STYLES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        className={`photo-style-chip ${photoStyle === st.id ? 'photo-style-chip--active' : ''}`}
                        onClick={() => onChangePhotoStyle(st.id)}
                      >
                        <span className="photo-style-swatch" style={{ backgroundColor: st.swatch }} />
                        <span className="photo-style-label">{st.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="emerge-grid">
                    {EMERGENCE_MODES.map((em) => (
                      <button
                        key={em.id}
                        type="button"
                        className={`seg-btn ${emergenceMode === em.id ? 'seg-btn--active' : ''}`}
                        style={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: emergenceMode === em.id ? 'rgba(56,189,248,0.2)' : 'rgba(0,0,0,0.32)',
                        }}
                        onClick={() => onChangeEmergence(em.id)}
                      >
                        {em.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="panel-section">
                  <span className="panel-heading">14-Node Transition Triggers</span>
                  <div className="matrix-grid">
                    {TRANSITION_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`matrix-node ${m.id === activeMode ? 'matrix-node--active' : ''}`}
                        onClick={() => onTriggerMode(m.id)}
                      >
                        <div className="matrix-node-top">
                          <span className="matrix-node-code" style={{ color: m.accent }}>
                            FX {m.code}
                          </span>
                        </div>
                        <span className="matrix-node-name">{m.shortName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: SMART MEMORY MESH & FRAME SEQUENCES */}
            {activeTab === 'memory' && (
              <>
                <div className="panel-section">
                  <div className="panel-label-row">
                    <span className="panel-heading">Smart Memory Mesh JSON</span>
                    <span className="font-mono" style={{ fontSize: 10, color: '#94a3b8' }}>
                      data/memory-mesh.json
                    </span>
                  </div>

                  <div className="os-cmd-form" style={{ width: '100%', minWidth: 0 }}>
                    <Search size={12} color="#38bdf8" />
                    <input
                      type="text"
                      className="os-cmd-input"
                      value={memoryQuery}
                      onChange={(e) => onSearchMemory(e.target.value)}
                      placeholder="Quick retrieval search across mesh..."
                      aria-label="Search transcribed memory mesh"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <button
                      type="button"
                      className="os-btn os-icon-btn os-btn-active"
                      onClick={() => onTranscribeCurrent(enrichGemini)}
                    >
                      <Cpu size={12} /> Transcribe Slide
                    </button>
                    <a
                      href="/api/memory-mesh/download"
                      download="memory-mesh.json"
                      className="os-btn os-icon-btn"
                      style={{ textDecoration: 'none' }}
                    >
                      <Download size={12} /> Export JSON
                    </a>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <button
                      type="button"
                      className={`os-btn os-icon-btn ${enrichGemini ? 'os-btn-active' : ''}`}
                      style={{ height: 24, fontSize: 10.5 }}
                      onClick={() => setEnrichGemini((v) => !v)}
                    >
                      <Sparkles size={11} /> Gemini Enrich: {enrichGemini ? 'On' : 'Off'}
                    </button>
                    <button
                      type="button"
                      className="os-btn os-icon-btn"
                      style={{ height: 24, fontSize: 10.5 }}
                      onClick={onClearMemory}
                    >
                      <Trash2 size={11} color="#f87171" /> Reset Mesh
                    </button>
                  </div>
                </div>

                {/* Recorded Whole-Event Frame Sequences */}
                <div className="panel-section">
                  <div className="panel-label-row">
                    <span className="panel-heading">Event Frame Sequences ({sequences.length})</span>
                    <span className="font-mono" style={{ fontSize: 10, color: '#64748b' }}>
                      {memoryUpdatedAt ? memoryUpdatedAt.slice(11, 19) : 'Ready'}
                    </span>
                  </div>

                  {sequences.slice(0, 6).map((seq) => (
                    <div key={seq.id} className="mesh-entry-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#e2e8f0' }}>
                          {seq.transitionMode}
                        </span>
                        <button
                          type="button"
                          className="os-btn os-icon-btn"
                          style={{ height: 22, padding: '0 7px', fontSize: 10 }}
                          onClick={() => onReplaySequence(seq)}
                        >
                          <Film size={10} /> Replay ({seq.frameCount}f)
                        </button>
                      </div>
                      <div className="mesh-entry-meta">
                        <span>{seq.startSlide} -&gt; {seq.endSlide}</span>
                        <span>·</span>
                        <span>{seq.durationMs}ms</span>
                      </div>
                      {/* Visual Frame Sequence Strip */}
                      <div className="frame-strip">
                        {seq.keyFrames.slice(0, 12).map((kf) => (
                          <span
                            key={kf.idx}
                            className="frame-bar"
                            style={{
                              height: `${Math.max(20, Math.round(kf.prog * 100))}%`,
                              opacity: 0.4 + kf.prog * 0.6,
                            }}
                            title={`Frame ${kf.idx} · ${Math.round(kf.prog * 100)}% · ${kf.fps} FPS`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {sequences.length === 0 && (
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Flip or transition a page to capture its complete multi-frame sequence into JSON.
                    </div>
                  )}
                </div>

                {/* Transcribed Memory Nodes */}
                <div className="panel-section">
                  <span className="panel-heading">Transcribed Nodes ({memoryNodes.length})</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {memoryNodes.slice(0, 25).map((node) => (
                      <div key={node.id} className="mesh-entry-card">
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>
                          {node.title}
                        </div>
                        <div className="mesh-entry-meta">
                          <span>{node.eventType}</span>
                          <span>·</span>
                          <span>{node.timestamp.slice(11, 19)}</span>
                          {node.frameCount ? (
                            <>
                              <span>·</span>
                              <span>{node.frameCount} frames</span>
                            </>
                          ) : null}
                        </div>
                        <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 }}>
                          {node.transcript}
                        </div>
                        {node.keywords.length > 0 && (
                          <div style={{ fontSize: 10, color: '#7dd3fc' }}>
                            {node.keywords.slice(0, 6).join(' · ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* TAB 3: SMART LIBRARY MODE (GEMINI + GOOGLE DRIVE MATRIX) */}
            {activeTab === 'library' && (
              <>
                <div className="panel-section">
                  <div className="panel-label-row">
                    <span className="panel-heading">Google Drive Library Connection</span>
                    {googleUser && (
                      <span style={{ fontSize: 10.5, color: '#6ee7b7' }}>
                        {googleUser.email || googleUser.displayName || 'Connected'}
                      </span>
                    )}
                  </div>

                  {!hasDriveToken ? (
                    <button
                      type="button"
                      className="gsi-material-button"
                      onClick={onGoogleSignIn}
                      disabled={authBusy}
                    >
                      <div className="gsi-material-button-state" />
                      <div className="gsi-material-button-content-wrapper">
                        <div className="gsi-material-button-icon">
                          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                            <path fill="none" d="M0 0h48v48H0z" />
                          </svg>
                        </div>
                        <span className="gsi-material-button-contents">
                          {authBusy ? 'Connecting...' : 'Sign in with Google'}
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
                      <button
                        type="button"
                        className="os-btn os-icon-btn"
                        onClick={onScanDriveFiles}
                        disabled={driveBusy}
                      >
                        <RefreshCw size={12} /> Scan Drive
                      </button>
                      <button
                        type="button"
                        className="os-btn os-icon-btn"
                        onClick={onPullLibraryFromDrive}
                        disabled={driveBusy}
                      >
                        <CloudDownload size={12} /> Pull Matrix
                      </button>
                      <button
                        type="button"
                        className="os-btn os-icon-btn os-icon-btn--square"
                        onClick={onGoogleLogout}
                        title="Sign out"
                        aria-label="Sign out from Google"
                      >
                        <LogOut size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Step 1: Auto-Read Stored Text & Encode via Gemini */}
                <div className="panel-section">
                  <div className="panel-label-row">
                    <span className="panel-heading">Smart Library Ingestion</span>
                    <span className="font-mono" style={{ fontSize: 10, color: '#94a3b8' }}>
                      {storedTextCount} stored sources
                    </span>
                  </div>

                  <input
                    ref={textUploadRef}
                    type="file"
                    accept=".txt,.md,.csv,.json,text/plain"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) onUploadLibraryText(e.target.files[0]);
                      e.target.value = '';
                    }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <button
                      type="button"
                      className="os-btn os-icon-btn os-btn-active"
                      onClick={onAutoProcessStoredText}
                      disabled={driveBusy}
                    >
                      <Sparkles size={12} /> Process Stored Text
                    </button>
                    <button
                      type="button"
                      className="os-btn os-icon-btn"
                      onClick={() => textUploadRef.current?.click()}
                      disabled={driveBusy}
                    >
                      <FileText size={12} /> Read Text File
                    </button>
                  </div>

                  {hasDriveToken && driveFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 10.5, color: '#94a3b8' }}>
                        Google Drive Text & Document Sources:
                      </span>
                      {driveFiles.slice(0, 6).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className="os-btn os-icon-btn"
                          style={{ justifyContent: 'space-between', height: 26, fontSize: 11 }}
                          onClick={() => onProcessDriveFile(f)}
                          disabled={driveBusy}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name}
                          </span>
                          <span style={{ fontSize: 10, color: '#7dd3fc' }}>Encode</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {libraryMatrix && hasDriveToken && (
                    <button
                      type="button"
                      className="os-btn os-icon-btn os-icon-btn--primary"
                      onClick={onRequestSaveLibraryToDrive}
                      disabled={driveBusy}
                    >
                      <CloudUpload size={13} /> Save Event Matrix ({libraryMatrix.events.length}) to Drive
                    </button>
                  )}
                </div>

                {/* Step 2: Encoded Matrix Preview & Gemini Data Analysis */}
                {libraryMatrix && (
                  <div className="panel-section">
                    <div className="panel-label-row">
                      <span className="panel-heading">Event Matrix & Data Analysis</span>
                      <span className="font-mono" style={{ fontSize: 10.5, color: '#6ee7b7' }}>
                        {libraryMatrix.events.length} events
                      </span>
                    </div>

                    <div className="mesh-entry-card">
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>
                        {libraryMatrix.libraryTitle}
                      </div>
                      <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.45 }}>
                        {libraryMatrix.summary}
                      </div>
                      {libraryMatrix.themes.length > 0 && (
                        <div style={{ fontSize: 10, color: '#7dd3fc' }}>
                          {libraryMatrix.themes.join(' · ')}
                        </div>
                      )}
                    </div>

                    {/* Quantitative Category Distribution */}
                    {categoryStats.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {categoryStats.map((cat) => (
                          <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                              <span style={{ color: '#cbd5e1' }}>{cat.name}</span>
                              <span className="font-mono" style={{ color: '#7dd3fc' }}>
                                {cat.count}
                              </span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                              <div
                                style={{
                                  width: `${cat.pct}%`,
                                  height: '100%',
                                  borderRadius: 2,
                                  background: '#38bdf8',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Query Gemini over Pulled Drive Events */}
                    <form
                      className="os-cmd-form"
                      style={{ width: '100%', minWidth: 0 }}
                      onSubmit={(e) => {
                        e.preventDefault();
                        onAnalyzeLibrary(analysisQuestion);
                      }}
                    >
                      <BarChart3 size={12} color="#38bdf8" />
                      <input
                        type="text"
                        className="os-cmd-input"
                        value={analysisQuestion}
                        onChange={(e) => setAnalysisQuestion(e.target.value)}
                        placeholder="Ask Gemini to analyze Drive event matrix..."
                        aria-label="Library matrix analysis query"
                      />
                      <button type="submit" className="os-cmd-run" disabled={driveBusy}>
                        Analyze
                      </button>
                    </form>

                    {analysisResult && (
                      <div className="mesh-entry-card" style={{ borderColor: 'rgba(56,189,248,0.45)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: '#bae6fd' }}>
                          <Activity size={12} /> {analysisResult.headline}
                        </div>
                        <div style={{ fontSize: 11, color: '#e2e8f0', lineHeight: 1.45 }}>
                          {analysisResult.answer}
                        </div>
                        {analysisResult.keyFindings.map((f, idx) => (
                          <div key={idx} style={{ fontSize: 10.5, color: '#94a3b8' }}>
                            · {f}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Event Rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {libraryMatrix.events.slice(0, 14).map((ev) => (
                        <div key={ev.id} className="mesh-entry-card">
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#f1f5f9' }}>
                            {ev.title}
                          </div>
                          <div className="mesh-entry-meta">
                            <span>{ev.category}</span>
                            <span>·</span>
                            <span>{ev.timestampLabel}</span>
                            <span>·</span>
                            <span
                              style={{
                                color:
                                  ev.significance === 'critical'
                                    ? '#f87171'
                                    : ev.significance === 'high'
                                      ? '#fbbf24'
                                      : '#7dd3fc',
                              }}
                            >
                              {ev.significance}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 }}>
                            {ev.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      )}
    </>
  );
};
