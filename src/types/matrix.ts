export type SlideSource = 'curated' | 'loaded' | 'generated' | 'pdf';

export interface SlideItem {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  source: SlideSource;
  aspectHint?: number;
  createdAt: number;
  pdfName?: string;
  pageNumber?: number;
  totalPages?: number;
  extractedText?: string;
}

export interface TransitionModeInfo {
  id: number;
  key: string;
  code: string;
  name: string;
  shortName: string;
  origin: string;
  description: string;
  accent: string;
}

export type TransitionSequenceMode = 'cycle' | 'random' | 'locked';

export type StageVisualMode = 'slides' | 'hybrid' | 'fractal';

export type MoodMode = 'flow' | 'solar' | 'pastel' | 'chaos' | 'zen';

export type PhotoStyleId =
  | 'natural'
  | 'leica-mono'
  | 'kodachrome'
  | 'cyanotype'
  | 'velvia'
  | 'infrared'
  | 'halide-sepia'
  | 'cyber-chrome'
  | 'solar-wash';

export interface PhotoStyleInfo {
  id: PhotoStyleId;
  index: number;
  name: string;
  note: string;
  swatch: string;
}

export type EmergenceMode =
  | 'rest'
  | 'breathing-halo'
  | 'liquid-ripple'
  | 'prism-edge'
  | 'bioluminescent';

export interface EmergenceModeInfo {
  id: EmergenceMode;
  index: number;
  name: string;
  description: string;
}

export type FitMode = 'cover' | 'contain';

export type WindowId = 'matrix' | 'video' | 'media' | 'audio' | 'forge';

export type SidePanelTab = 'design' | 'memory' | 'library';

export type VideoAspectPreset = 'fullscreen' | '16:9' | '9:16' | '1:1';

export type HardwareTier = 'eco' | 'balanced' | 'high';

export type ThermalState = 'STABLE' | 'THROTTLED' | 'HEALING';

export type LiquidObjectType = 'slide' | 'core' | 'node' | 'swarm';

export interface LiquidTouchMenuState {
  open: boolean;
  x: number;
  y: number;
  targetType: LiquidObjectType;
  label: string;
}

export interface OverlayConfig {
  motes: boolean;
  swarm: boolean;
  gelCore: boolean;
  horizonGrid: boolean;
  intensity: number; // 0..1.5
}

export interface DigitalSunConfig {
  depth: number; // 2..10
  arms: number; // 1..8
  speed: number; // 0.1..2.5
  blend: number; // 0..1 (in hybrid mode)
}

export interface DesignMatrixConfig {
  symmetryOrder: 0 | 2 | 4 | 6 | 8; // 0 = clean, 2/4/6/8 = hyper-symmetric fractal lattice
  refraction: number; // 0..1.5 optical glass edge dispersion & prism bevel
  fractalLattice: number; // 0..1 micro fractal geometric glass facet overlay
  foldCurlTension: number; // 0.5..1.8 page fold stiffness / crease curve
  foldCornerBias: number; // -1..1 diagonal fold corner tilt
}

export interface AudioMetrics {
  bass: number;
  mids: number;
  treble: number;
  beatDetected: boolean;
}

export interface ThermalTelemetry {
  fps: number;
  resScale: number;
  tier: HardwareTier;
  thermalState: ThermalState;
  particleCount: number;
  awarenessNodes: number;
  entropy: number;
}

export interface ThoughtStep {
  intent: string;
  mapping: string;
  actuation: string;
  timestamp: string;
}

export interface KernelLogEntry {
  id: string;
  time: string;
  tag: string;
  message: string;
  tone: 'info' | 'accent' | 'warm' | 'pink' | 'error';
}

export interface ForgeParameters {
  transitionDuration: number; // seconds
  slideInterval: number; // seconds
  lensStrength: number; // 0..2
  audioReactivity: number; // 0..1.5
  kenBurns: boolean;
  fitMode: FitMode;
  mood: MoodMode;
  photoStyle: PhotoStyleId;
  emergenceMode: EmergenceMode;
  tapPageFlip: boolean;
}

export interface RecordedClip {
  id: string;
  name: string;
  url: string;
  blob: Blob;
  durationSec: number;
  width: number;
  height: number;
  mimeType: string;
  aspect: VideoAspectPreset;
  createdAt: number;
}

/* Whole-Event Frame Sequence Types */
export interface FrameSample {
  idx: number;
  t: number; // ms since sequence start
  prog: number; // 0..1 shader progress
  foldAngle: number;
  foldY: number;
  fps: number;
  slideIndex: number;
  modeId: number;
  thumbnailUrl?: string;
}

export interface FrameSequenceRecord {
  id: string;
  name: string;
  createdAt: string;
  durationMs: number;
  frameCount: number;
  startSlide: string;
  endSlide: string;
  transitionMode: string;
  keyFrames: FrameSample[];
}

/* Smart Memory Mesh JSON Types */
export interface MemoryMeshNode {
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

export interface MemoryMeshResponse {
  filePath: string;
  version: string;
  updatedAt: string;
  totalNodes: number;
  totalSequences: number;
  nodes: MemoryMeshNode[];
  sequences: FrameSequenceRecord[];
}

/* Smart Library & Google Drive Matrix Types */
export interface LibraryEventItem {
  id: string;
  sourceTitle: string;
  timestampLabel: string;
  category: string;
  title: string;
  description: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  entities: string[];
  metrics: string[];
  encodedAt: string;
}

export interface DriveLibraryMatrix {
  version: string;
  updatedAt: string;
  libraryTitle: string;
  summary: string;
  themes: string[];
  insights: string[];
  events: LibraryEventItem[];
}

export interface DriveFileMeta {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
}

export interface LibraryAnalysisResult {
  analyzedAt: string;
  headline: string;
  answer: string;
  keyFindings: string[];
  recommendedActions: string[];
}
