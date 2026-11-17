import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Circle,
  Code2,
  Droplets,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Grid3x3,
  ImagePlus,
  Images,
  Layers,
  Maximize,
  Minimize,
  Music2,
  Palette,
  Pause,
  Play,
  Repeat,
  Shuffle,
  Sparkles,
  Square,
  Terminal,
  Upload,
  Video,
} from 'lucide-react';
import { AudioEqPanel } from './components/AudioEqPanel';
import { CodeForgePanel, ForgeConfigSnapshot } from './components/CodeForgePanel';
import { ConfirmDriveModal } from './components/ConfirmDriveModal';
import { HyperSymmetricSidePanel } from './components/HyperSymmetricSidePanel';
import { LiquidTouchMenu } from './components/LiquidTouchMenu';
import { MatrixPanel } from './components/MatrixPanel';
import { MediaDeckPanel } from './components/MediaDeckPanel';
import { OsWindow } from './components/OsWindow';
import { VideoStudioPanel } from './components/VideoStudioPanel';
import {
  EMERGENCE_MODES,
  generateProceduralSlide,
  getCuratedSlides,
  PHOTO_STYLES,
  ProceduralTheme,
  TRANSITION_MODES,
} from './data/imagePool';
import { loadPdfAsSlides } from './data/pdfLoader';
import { EQ_PRESETS, EqParams, EqPresetKey, SovereignAudioEngine } from './engine/AudioEngine';
import { CometicOverlayScene } from './engine/CometicOverlayScene';
import { TransitionMatrixEngine } from './engine/TransitionMatrixEngine';
import { VideoRecorderEngine } from './engine/VideoRecorderEngine';
import {
  findOrLoadLibraryMatrix,
  getAccessToken,
  googleSignIn,
  initAuth,
  LIBRARY_MATRIX_FILENAME,
  listDriveTextAndMatrixFiles,
  logoutGoogleDrive,
  readDriveFileContent,
  saveLibraryMatrixToDrive,
} from './services/googleDriveService';
import {
  analyzeLibraryMatrixWithGemini,
  clearMemoryMesh,
  fetchMemoryMesh,
  processLibraryTextWithGemini,
  transcribeToMemoryMesh,
} from './services/memoryMeshService';
import {
  AudioMetrics,
  DesignMatrixConfig,
  DigitalSunConfig,
  DriveFileMeta,
  DriveLibraryMatrix,
  EmergenceMode,
  ForgeParameters,
  FrameSample,
  FrameSequenceRecord,
  KernelLogEntry,
  LibraryAnalysisResult,
  LiquidTouchMenuState,
  MemoryMeshNode,
  MoodMode,
  OverlayConfig,
  PhotoStyleId,
  RecordedClip,
  SidePanelTab,
  SlideItem,
  StageVisualMode,
  ThermalTelemetry,
  ThoughtStep,
  TransitionSequenceMode,
  VideoAspectPreset,
  WindowId,
} from './types/matrix';

const formatTime = () => {
  const d = new Date();
  return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const MOODS: MoodMode[] = ['flow', 'solar', 'pastel', 'chaos', 'zen'];
const STAGE_MODES: StageVisualMode[] = ['slides', 'hybrid', 'fractal'];

export const App: React.FC = () => {
  const matrixCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const matrixEngineRef = useRef<TransitionMatrixEngine | null>(null);
  const overlaySceneRef = useRef<CometicOverlayScene | null>(null);
  const audioEngineRef = useRef<SovereignAudioEngine | null>(null);
  const recorderEngineRef = useRef<VideoRecorderEngine | null>(null);

  // Slideshow collection
  const [slides, setSlides] = useState<SlideItem[]>(() => getCuratedSlides());
  const slidesRef = useRef<SlideItem[]>(slides);
  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Playback & transition sequence state
  const [isPlaying, setIsPlaying] = useState(true);
  const [shuffleOrder, setShuffleOrder] = useState(false);
  const [activeMode, setActiveMode] = useState(10); // Start highlighting Natural Page Curl / Matrix
  const activeModeRef = useRef(activeMode);
  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  const [sequenceMode, setSequenceMode] = useState<TransitionSequenceMode>('cycle');
  const [overdriveActive, setOverdriveActive] = useState(false);
  const [beatSync, setBeatSync] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const [zenMode, setZenMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [pdfLoadingStatus, setPdfLoadingStatus] = useState<{
    file: string;
    page: number;
    total: number;
  } | null>(null);

  // Liquid Touch Menu & Visual Ripple feedback
  const [liquidMenu, setLiquidMenu] = useState<LiquidTouchMenuState>({
    open: false,
    x: 0,
    y: 0,
    targetType: 'slide',
    label: '',
  });
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const pointerTrackerRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    longPressTimer: number | null;
    longPressFired: boolean;
  } | null>(null);

  // Stage visual mode & Digital Sun Fractal Core
  const [stageMode, setStageMode] = useState<StageVisualMode>('slides');
  const [sunConfig, setSunConfig] = useState<DigitalSunConfig>({
    depth: 6.0,
    arms: 3.0,
    speed: 1.0,
    blend: 0.55,
  });

  // App-to-Video capture configuration & recorded clips
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [videoAspect, setVideoAspect] = useState<VideoAspectPreset>('fullscreen');
  const [videoFps, setVideoFps] = useState<30 | 60>(30);
  const [videoBitrate, setVideoBitrate] = useState(8);
  const [burnTitle, setBurnTitle] = useState(false);
  const [autoSlidesCount, setAutoSlidesCount] = useState(6);
  const [autoRenderRemaining, setAutoRenderRemaining] = useState(0);
  const autoRenderRef = useRef<{ active: boolean; remaining: number }>({ active: false, remaining: 0 });
  const [clips, setClips] = useState<RecordedClip[]>([]);
  const clipsRef = useRef<RecordedClip[]>(clips);
  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  // Optical, Style, Emergence & Touch choreography parameters
  const [params, setParams] = useState<ForgeParameters>({
    transitionDuration: 0.9,
    slideInterval: 6.0,
    lensStrength: 1.0,
    audioReactivity: 0.75,
    kenBurns: true,
    fitMode: 'cover',
    mood: 'flow',
    photoStyle: 'natural',
    emergenceMode: 'rest',
    tapPageFlip: true,
  });

  // Three.js overlay configuration
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>({
    motes: true,
    swarm: false,
    gelCore: false,
    horizonGrid: false,
    intensity: 0.85,
  });

  // Thermal Shunt & Self-Healing Telemetry
  const [telemetry, setTelemetry] = useState<ThermalTelemetry>({
    fps: 60,
    resScale: 1.0,
    tier: 'balanced',
    thermalState: 'STABLE',
    particleCount: 480,
    awarenessNodes: 24,
    entropy: 0.14,
  });
  const shuntPoolRef = useRef({
    frameTimes: new Float32Array(30).fill(16.6),
    frameIndex: 0,
    shuntCounter: 0,
    resScale: 1.0,
    thermalState: 'STABLE' as ThermalTelemetry['thermalState'],
    lastUiSync: 0,
  });

  // Audio state
  const [trackName, setTrackName] = useState('No Audio Loaded');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [isSynthMode, setIsSynthMode] = useState(false);
  const [eqParams, setEqParams] = useState<EqParams>({ drive: 15, low: 0, mid: 0, high: 0 });
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({
    bass: 0,
    mids: 0,
    treble: 0,
    beatDetected: false,
  });

  // Window manager & HUD state
  const [cmdRowOpen, setCmdRowOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 920 : true
  );
  const [openWindows, setOpenWindows] = useState<Record<WindowId, boolean>>({
    matrix: false,
    video: false,
    media: false,
    audio: false,
    forge: false,
  });
  const [windowZ, setWindowZ] = useState<Record<WindowId, number>>({
    matrix: 31,
    video: 32,
    media: 30,
    audio: 30,
    forge: 30,
  });
  const topZRef = useRef(33);

  // Hyper-Symmetric Fractal Glass Side Panel & Deeper Design Matrix
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [sideTab, setSideTab] = useState<SidePanelTab>('design');
  const [designConfig, setDesignConfig] = useState<DesignMatrixConfig>({
    symmetryOrder: 0,
    refraction: 0.25,
    fractalLattice: 0.14,
    foldCurlTension: 1.0,
    foldCornerBias: 0.0,
  });

  // Whole-Event Frame Sequence & Smart Memory Mesh JSON state
  const [liveProg, setLiveProg] = useState(0);
  const [liveFoldY, setLiveFoldY] = useState(0.65);
  const [liveFrames, setLiveFrames] = useState<FrameSample[]>([]);
  const [memorySequences, setMemorySequences] = useState<FrameSequenceRecord[]>([]);
  const [memoryNodes, setMemoryNodes] = useState<MemoryMeshNode[]>([]);
  const [memoryUpdatedAt, setMemoryUpdatedAt] = useState('');
  const [memoryQuery, setMemoryQuery] = useState('');
  const liveFpsRef = useRef(60);

  const seqCaptureRef = useRef<{
    active: boolean;
    startedAt: number;
    startSlideTitle: string;
    endSlideTitle: string;
    modeId: number;
    modeName: string;
    samples: FrameSample[];
    lastSampleAt: number;
    lastProg: number;
  } | null>(null);

  const dragFoldRef = useRef<{
    active: boolean;
    dir: 1 | -1;
    targetIdx: number;
    startX: number;
    lastX: number;
    lastTime: number;
    velocityX: number;
    lastFrac: number;
  } | null>(null);

  // Smart Library Mode (Google Drive + Gemini)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasDriveToken, setHasDriveToken] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileMeta[]>([]);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveMatrixFileId, setDriveMatrixFileId] = useState<string | null>(null);
  const [libraryMatrix, setLibraryMatrix] = useState<DriveLibraryMatrix | null>(null);
  const [analysisResult, setAnalysisResult] = useState<LibraryAnalysisResult | null>(null);
  const [confirmDriveModal, setConfirmDriveModal] = useState<{
    open: boolean;
    actionType: 'create' | 'update';
  }>({ open: false, actionType: 'create' });

  // Thought pipeline & telemetry log
  const [thought, setThought] = useState<ThoughtStep>({
    intent: 'Ready: Tap or drag stage corners to fold & flip pages',
    mapping: 'WebGL2 14-Mode Matrix + Memory Mesh JSON + Smart Library + Fractal HUD',
    actuation: 'Full-screen canvas armed for photos, PDFs, Drive analysis & video export',
    timestamp: formatTime(),
  });
  const [logs, setLogs] = useState<KernelLogEntry[]>([
    {
      id: 'init-1',
      time: formatTime(),
      tag: 'MATRIX',
      message: '14-node transition matrix, draggable page curl & Smart Memory Mesh active.',
      tone: 'accent',
    },
    {
      id: 'init-2',
      time: formatTime(),
      tag: 'TOUCH',
      message: 'Liquid Touch & Foldable Flip: drag horizontally to fold pages, or open Fractal HUD.',
      tone: 'info',
    },
  ]);
  const [cmdInput, setCmdInput] = useState('');

  const appendLog = useCallback(
    (tag: string, message: string, tone: KernelLogEntry['tone'] = 'info') => {
      setLogs((prev) => [
        { id: `${Date.now()}-${Math.random()}`, time: formatTime(), tag, message, tone },
        ...prev.slice(0, 39),
      ]);
    },
    []
  );

  const updateThought = useCallback((intent: string, mapping: string, actuation: string) => {
    setThought({ intent, mapping, actuation, timestamp: formatTime() });
  }, []);

  const emitRipple = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev.slice(-5), { id, x, y }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 680);
  }, []);

  const focusWindow = useCallback((id: WindowId) => {
    topZRef.current += 1;
    setWindowZ((prev) => ({ ...prev, [id]: topZRef.current }));
  }, []);

  const openWindow = useCallback(
    (id: WindowId) => {
      setOpenWindows((prev) => ({ ...prev, [id]: true }));
      focusWindow(id);
    },
    [focusWindow]
  );

  const toggleWindow = useCallback(
    (id: WindowId) => {
      setOpenWindows((prev) => {
        const nextOpen = !prev[id];
        if (nextOpen) focusWindow(id);
        return { ...prev, [id]: nextOpen };
      });
    },
    [focusWindow]
  );

  const pickTransitionMode = useCallback(
    (forcedMode?: number): number => {
      if (forcedMode !== undefined) {
        return Math.max(0, Math.min(TRANSITION_MODES.length - 1, forcedMode));
      }
      if (sequenceMode === 'locked') {
        return activeModeRef.current;
      }
      if (sequenceMode === 'random') {
        if (TRANSITION_MODES.length <= 1) return 0;
        let next = Math.floor(Math.random() * TRANSITION_MODES.length);
        if (next === activeModeRef.current) {
          next = (next + 1) % TRANSITION_MODES.length;
        }
        return next;
      }
      return (activeModeRef.current + 1) % TRANSITION_MODES.length;
    },
    [sequenceMode]
  );

  // Video recording stop & save
  const stopRecording = useCallback(async () => {
    const rec = recorderEngineRef.current;
    if (!rec || !rec.recording) return;

    autoRenderRef.current = { active: false, remaining: 0 };
    setAutoRenderRemaining(0);
    setIsRecording(false);

    const clip = await rec.stop();
    if (clip) {
      setClips((prev) => [clip, ...prev]);
      appendLog('VIDEO', `Saved ${clip.width}x${clip.height} clip (${clip.durationSec.toFixed(1)}s).`, 'info');
      updateThought(
        'Finalize App-to-Video render',
        `Muxed ${clip.width}x${clip.height} frames + audio`,
        `Clip "${clip.name}" ready in Video Studio`
      );
      openWindow('video');
    }
  }, [appendLog, openWindow, updateThought]);

  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const startLiveRecording = useCallback(
    (isAutoSequence = false, slideCount = 0) => {
      const rec = recorderEngineRef.current;
      if (!rec || rec.recording) return;

      const isEco = overlaySceneRef.current?.hardwareTier === 'eco';
      const audioStream = audioEngineRef.current?.getCaptureStream() || null;

      if (isAutoSequence && slideCount > 0) {
        autoRenderRef.current = { active: true, remaining: slideCount };
        setAutoRenderRemaining(slideCount);
        setIsPlaying(true);
      } else {
        autoRenderRef.current = { active: false, remaining: 0 };
        setAutoRenderRemaining(0);
      }

      const started = rec.start(
        {
          aspect: videoAspect,
          fps: videoFps,
          bitrateMbps: videoBitrate,
          burnTitle,
          getCurrentTitle: () => {
            const s = slidesRef.current[activeIndexRef.current];
            return s ? `${s.title} — ${TRANSITION_MODES[activeModeRef.current]?.shortName || ''}` : '';
          },
          audioStream,
          onTick: (sec) => setRecordingElapsed(sec),
        },
        isEco
      );

      if (started) {
        setRecordingElapsed(0);
        setIsRecording(true);
        appendLog(
          'REC',
          isAutoSequence
            ? `Auto-Rendering ${slideCount} slides to ${videoAspect} video (${videoFps} FPS)...`
            : `Recording live ${videoAspect} stage video (${videoFps} FPS)...`,
          'pink'
        );
        updateThought(
          isAutoSequence ? `Auto-render ${slideCount} slides to video` : 'Start Live App-to-Video Capture',
          `Compositing WebGL2 + Three.js + ${audioStream ? 'Audio' : 'Silent'} @ ${videoFps} FPS`,
          'Streaming HUD-free frames into MediaRecorder'
        );
      } else {
        autoRenderRef.current = { active: false, remaining: 0 };
        appendLog('REC', 'MediaRecorder is unavailable in this browser.', 'error');
      }
    },
    [appendLog, burnTitle, updateThought, videoAspect, videoBitrate, videoFps]
  );

  const finalizeFrameSequence = useCallback(
    async (completed: boolean, endSlideTitle?: string) => {
      const cap = seqCaptureRef.current;
      seqCaptureRef.current = null;
      if (!cap) return;

      const durationMs = Math.max(40, Math.round(performance.now() - cap.startedAt));
      const finalSamples = [...cap.samples];
      if (completed && (finalSamples.length === 0 || finalSamples[finalSamples.length - 1].prog < 0.99)) {
        finalSamples.push({
          idx: finalSamples.length,
          t: durationMs,
          prog: 1,
          foldAngle: 180,
          foldY: liveFoldY,
          fps: liveFpsRef.current,
          slideIndex: activeIndexRef.current,
          modeId: cap.modeId,
        });
      }

      // Downsample up to 24 evenly spaced frames for persistent JSON
      const stride = Math.max(1, Math.floor(finalSamples.length / 24));
      const keyFrames = finalSamples.filter((_, idx) => idx % stride === 0).slice(0, 24);

      const sequence: FrameSequenceRecord = {
        id: `seq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: `${cap.modeName}: ${cap.startSlideTitle} -> ${endSlideTitle || cap.endSlideTitle}`,
        createdAt: new Date().toISOString(),
        durationMs,
        frameCount: finalSamples.length,
        startSlide: cap.startSlideTitle,
        endSlide: endSlideTitle || cap.endSlideTitle,
        transitionMode: cap.modeName,
        keyFrames,
      };

      setLiveFrames(keyFrames);
      setMemorySequences((prev) => [sequence, ...prev].slice(0, 50));

      try {
        const res = await transcribeToMemoryMesh({
          sequence,
          node: {
            eventType: completed ? 'page_flip_sequence' : 'fold_springback_sequence',
            title: completed
              ? `${cap.modeName}: ${cap.startSlideTitle} -> ${sequence.endSlide}`
              : `Fold Springback: ${cap.startSlideTitle}`,
            transcript: `${sequence.frameCount} GPU frames captured over ${durationMs}ms using ${cap.modeName}.`,
            keywords: [cap.modeName, completed ? 'committed' : 'springback', params.photoStyle, params.emergenceMode],
            transitionMode: cap.modeName,
            photoStyle: params.photoStyle,
            emergenceMode: params.emergenceMode,
            frameCount: sequence.frameCount,
            frameSequenceId: sequence.id,
          },
        });
        setMemoryNodes(res.nodes);
        setMemoryUpdatedAt(new Date().toISOString());
      } catch {
        // Non-blocking background mesh write
      }
    },
    [liveFoldY, params.emergenceMode, params.photoStyle]
  );

  const transitionToIndex = useCallback(
    (
      targetIdx: number,
      forcedMode?: number,
      reason = 'Manual advance',
      flipDirection: 1 | -1 = 1
    ) => {
      const list = slidesRef.current;
      if (!list.length) return;
      const prevSlide = list[activeIndexRef.current];
      const safeIdx = ((targetIdx % list.length) + list.length) % list.length;
      const nextSlide = list[safeIdx];
      const nextMode = pickTransitionMode(forcedMode);
      const modeInfo = TRANSITION_MODES[nextMode];

      setActiveIndex(safeIdx);
      setActiveMode(nextMode);
      setSlideProgress(0);

      seqCaptureRef.current = {
        active: true,
        startedAt: performance.now(),
        startSlideTitle: prevSlide?.title || 'Start',
        endSlideTitle: nextSlide.title,
        modeId: nextMode,
        modeName: modeInfo.shortName,
        samples: [],
        lastSampleAt: 0,
        lastProg: -1,
      };

      updateThought(
        reason,
        `FX ${modeInfo.code} (${modeInfo.shortName}) -> "${nextSlide.title}"`,
        `GPU blend ${params.transitionDuration.toFixed(2)}s [${nextSlide.source.toUpperCase()}]`
      );
      appendLog('FX ' + modeInfo.code, `${modeInfo.shortName} -> ${nextSlide.title}`, 'accent');

      overlaySceneRef.current?.triggerTransitionPulse();
      void matrixEngineRef.current
        ?.transitionTo(nextSlide.url, nextMode, params.transitionDuration, flipDirection)
        .then(() => {
          if (seqCaptureRef.current?.active) {
            void finalizeFrameSequence(true, nextSlide.title);
          }
        });

      const preloadUrls = [
        list[(safeIdx + 1) % list.length]?.url,
        list[(safeIdx + 2) % list.length]?.url,
        list[((safeIdx - 1) + list.length) % list.length]?.url,
      ].filter(Boolean);
      void matrixEngineRef.current?.preload(preloadUrls);

      if (autoRenderRef.current.active) {
        autoRenderRef.current.remaining -= 1;
        setAutoRenderRemaining(Math.max(0, autoRenderRef.current.remaining));
        if (autoRenderRef.current.remaining <= 0) {
          autoRenderRef.current.active = false;
          window.setTimeout(() => {
            void stopRecordingRef.current();
          }, Math.round(params.transitionDuration * 1000) + 700);
        }
      }
    },
    [appendLog, finalizeFrameSequence, params.transitionDuration, pickTransitionMode, updateThought]
  );

  const stepSlide = useCallback(
    (
      dir: 1 | -1,
      forcedMode?: number,
      reason = dir > 0 ? 'Next slide' : 'Previous slide',
      flipDirection?: 1 | -1
    ) => {
      const list = slidesRef.current;
      if (list.length <= 1) return;
      let targetIdx = activeIndexRef.current + dir;
      if (shuffleOrder) {
        let rand = Math.floor(Math.random() * list.length);
        if (rand === activeIndexRef.current) rand = (rand + 1) % list.length;
        targetIdx = rand;
      }
      transitionToIndex(targetIdx, forcedMode, reason, flipDirection ?? dir);
    },
    [shuffleOrder, transitionToIndex]
  );

  const jumpRandomSlide = useCallback(
    (forcedMode?: number) => {
      const list = slidesRef.current;
      if (list.length <= 1) return;
      let rand = Math.floor(Math.random() * list.length);
      if (rand === activeIndexRef.current) rand = (rand + 1) % list.length;
      transitionToIndex(rand, forcedMode ?? Math.floor(Math.random() * TRANSITION_MODES.length), 'Random jump', 1);
    },
    [transitionToIndex]
  );

  const stepSlideRef = useRef(stepSlide);
  useEffect(() => {
    stepSlideRef.current = stepSlide;
  }, [stepSlide]);

  // Thermal-Throttling Shunt
  const handleFrameDelta = useCallback(
    (deltaMs: number) => {
      const pool = shuntPoolRef.current;
      pool.frameTimes[pool.frameIndex] = deltaMs;
      pool.frameIndex = (pool.frameIndex + 1) % pool.frameTimes.length;

      let avg = 0;
      for (let i = 0; i < pool.frameTimes.length; i++) avg += pool.frameTimes[i];
      avg /= pool.frameTimes.length;

      const fps = Math.max(1, Math.min(144, Math.round(1000 / Math.max(avg, 1))));
      liveFpsRef.current = fps;

      if (avg > 21.0) {
        pool.shuntCounter += 1;
        if (pool.shuntCounter > 25) {
          if (pool.resScale > 0.55) {
            pool.resScale = Math.max(0.55, Number((pool.resScale - 0.1).toFixed(2)));
            matrixEngineRef.current?.setResolutionScale(pool.resScale);
          }
          overlaySceneRef.current?.shedLod();
          pool.thermalState = 'THROTTLED';
          pool.shuntCounter = 0;
          appendLog('SHUNT', `Thermal shunt engaged -> res ${pool.resScale.toFixed(2)}x`, 'warm');
        }
      } else if (avg < 15.0 && pool.thermalState === 'THROTTLED') {
        pool.shuntCounter += 1;
        if (pool.shuntCounter > 90) {
          pool.resScale = Math.min(1.0, Number((pool.resScale + 0.1).toFixed(2)));
          matrixEngineRef.current?.setResolutionScale(pool.resScale);
          if (pool.resScale >= 0.99) {
            pool.resScale = 1.0;
            pool.thermalState = 'STABLE';
          }
          pool.shuntCounter = 0;
        }
      }

      const now = performance.now();
      if (now - pool.lastUiSync > 350) {
        pool.lastUiSync = now;
        const stats = overlaySceneRef.current?.getStats();
        setTelemetry({
          fps,
          resScale: pool.resScale,
          tier: stats?.tier || 'balanced',
          thermalState: pool.thermalState,
          particleCount: stats?.particleCount || 480,
          awarenessNodes: stats?.awarenessNodes || 24,
          entropy: stats?.entropy || 0.12,
        });
      }
    },
    [appendLog]
  );

  const handleForceHeal = useCallback(() => {
    shuntPoolRef.current.resScale = 1.0;
    shuntPoolRef.current.thermalState = 'STABLE';
    shuntPoolRef.current.shuntCounter = 0;
    matrixEngineRef.current?.setResolutionScale(1.0);
    const restoredCount = overlaySceneRef.current?.forceHeal() || 480;
    appendLog('HEAL', `Force Heal executed: 1.00x scale, ${restoredCount} motes restored.`, 'info');
    updateThought('Force Heal protocol', 'Reset resolution scale + particle LOD budget', 'Core operating at 100%');
  }, [appendLog, updateThought]);

  // Mount WebGL2 TransitionMatrixEngine, Three.js CometicOverlayScene, SovereignAudioEngine, and VideoRecorderEngine
  useEffect(() => {
    const matrixCanvas = matrixCanvasRef.current;
    const overlayEl = overlayContainerRef.current;
    if (!matrixCanvas || !overlayEl) return;

    const matrixEngine = new TransitionMatrixEngine(
      matrixCanvas,
      (lost) => {
        setContextLost(lost);
        appendLog('GPU', lost ? 'WebGL2 context lost — auto-recovery active.' : 'WebGL2 context restored.', lost ? 'error' : 'info');
      },
      handleFrameDelta
    );
    const overlayScene = new CometicOverlayScene(overlayEl);
    const audioEngine = new SovereignAudioEngine(() => {
      appendLog('AUDIO', 'Resilient Web Audio context auto-resumed.', 'info');
    });
    const recorderEngine = new VideoRecorderEngine(matrixCanvas, overlayScene.getCanvas());

    matrixEngineRef.current = matrixEngine;
    overlaySceneRef.current = overlayScene;
    audioEngineRef.current = audioEngine;
    recorderEngineRef.current = recorderEngine;

    const initial = slidesRef.current;
    if (initial.length > 0) {
      void matrixEngine.setImmediate(initial[0].url);
      void matrixEngine.preload(initial.slice(1, 4).map((s) => s.url));
    }

    let spectrumRaf = 0;
    let lastMetricUiUpdate = 0;
    const updateAudioLoop = (now: number) => {
      spectrumRaf = requestAnimationFrame(updateAudioLoop);
      const { metrics, bins } = audioEngine.sampleMetrics();

      matrixEngine.setAudioMetrics(metrics);
      overlayScene.setAudioMetrics(metrics);

      // Capture whole-event frame sequence telemetry during transitions & interactive folds
      const tel = matrixEngine.getLiveTelemetry();
      const cap = seqCaptureRef.current;
      if (cap && cap.active && (tel.isTransitioning || dragFoldRef.current?.active)) {
        if (now - cap.lastSampleAt >= 32 || Math.abs(tel.prog - cap.lastProg) >= 0.035) {
          cap.lastSampleAt = now;
          cap.lastProg = tel.prog;
          if (cap.samples.length < 64) {
            cap.samples.push({
              idx: cap.samples.length,
              t: Math.round(now - cap.startedAt),
              prog: tel.prog,
              foldAngle: Math.round(tel.prog * 180),
              foldY: tel.foldAnchorY,
              fps: liveFpsRef.current,
              slideIndex: activeIndexRef.current,
              modeId: tel.mode,
            });
          }
        }
      }

      if (metrics.beatDetected && beatSyncRef.current) {
        stepSlideRef.current(1, undefined, 'Beat-sync transient');
      }

      if (now - lastMetricUiUpdate > 65) {
        lastMetricUiUpdate = now;
        setAudioMetrics({ ...metrics });
        setLiveProg(tel.prog);
        setLiveFoldY(tel.foldAnchorY);
        if (cap?.active && cap.samples.length > 0) {
          setLiveFrames([...cap.samples]);
        }

        const specCanvas = spectrumCanvasRef.current;
        if (specCanvas) {
          const ctx = specCanvas.getContext('2d');
          if (ctx) {
            const w = specCanvas.width;
            const h = specCanvas.height;
            ctx.fillStyle = 'rgba(3, 6, 12, 0.85)';
            ctx.fillRect(0, 0, w, h);
            if (bins && audioEngine.isPlaying) {
              const barCount = 44;
              const barW = w / barCount;
              for (let i = 0; i < barCount; i++) {
                const v = bins[i] / 255;
                const bh = Math.max(2, v * (h - 8));
                const grad = ctx.createLinearGradient(0, h, 0, h - bh);
                grad.addColorStop(0, '#38bdf8');
                grad.addColorStop(0.6, '#818cf8');
                grad.addColorStop(1, '#f472b6');
                ctx.fillStyle = grad;
                ctx.fillRect(i * barW + 1, h - bh, Math.max(1, barW - 2), bh);
              }
            } else {
              ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
              ctx.beginPath();
              ctx.moveTo(0, h / 2);
              ctx.lineTo(w, h / 2);
              ctx.stroke();
            }
          }
        }
      }
    };
    spectrumRaf = requestAnimationFrame(updateAudioLoop);

    return () => {
      cancelAnimationFrame(spectrumRaf);
      recorderEngine.destroy();
      matrixEngine.destroy();
      overlayScene.destroy();
      audioEngine.destroy();
      slidesRef.current.forEach((s) => {
        if (s.url.startsWith('blob:')) URL.revokeObjectURL(s.url);
      });
      clipsRef.current.forEach((c) => {
        if (c.url.startsWith('blob:')) URL.revokeObjectURL(c.url);
      });
    };
  }, [appendLog, handleFrameDelta]);

  const beatSyncRef = useRef(beatSync);
  useEffect(() => {
    beatSyncRef.current = beatSync;
  }, [beatSync]);

  // Sync live engine parameters (including Photo Style & Emergence indices)
  useEffect(() => {
    const styleIdx = PHOTO_STYLES.find((s) => s.id === params.photoStyle)?.index ?? 0;
    const emergeIdx = EMERGENCE_MODES.find((e) => e.id === params.emergenceMode)?.index ?? 0;
    matrixEngineRef.current?.setParameters({
      fitMode: params.fitMode,
      kenBurns: params.kenBurns,
      lensStrength: params.lensStrength,
      audioReactivity: params.audioReactivity,
      photoStyleIndex: styleIdx,
      emergenceModeIndex: emergeIdx,
    });
  }, [params]);

  useEffect(() => {
    matrixEngineRef.current?.setStageMode(stageMode);
  }, [stageMode]);

  useEffect(() => {
    matrixEngineRef.current?.setSunConfig(sunConfig);
  }, [sunConfig]);

  useEffect(() => {
    matrixEngineRef.current?.setDesignConfig(designConfig);
  }, [designConfig]);

  useEffect(() => {
    overlaySceneRef.current?.setConfig(overlayConfig);
  }, [overlayConfig]);

  // Load persisted Memory Mesh JSON + subscribe to Firebase Google Auth state
  useEffect(() => {
    void fetchMemoryMesh()
      .then((res) => {
        setMemoryNodes(res.nodes || []);
        setMemorySequences(res.sequences || []);
        setMemoryUpdatedAt(res.updatedAt || '');
      })
      .catch(() => {
        // Server mesh initializes cleanly on first write
      });

    const unsub = initAuth(
      (user) => {
        setGoogleUser(user);
        setHasDriveToken(Boolean(getAccessToken()));
      },
      () => {
        setGoogleUser(null);
        setHasDriveToken(Boolean(getAccessToken()));
      }
    );
    return () => unsub();
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setZenMode((v) => !v);
    }
  }, []);

  // Auto-advance slideshow timer
  useEffect(() => {
    if (!isPlaying || overdriveActive || slides.length <= 1) {
      return;
    }
    const start = performance.now();
    const intervalMs = Math.max(1500, params.slideInterval * 1000);

    const timer = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const pct = Math.min(100, (elapsed / intervalMs) * 100);
      setSlideProgress(pct);
      if (elapsed >= intervalMs) {
        window.clearInterval(timer);
        stepSlideRef.current(1, undefined, 'Auto-slideshow timer');
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [isPlaying, overdriveActive, activeIndex, params.slideInterval, slides.length]);

  // Matrix Overdrive mode (cycles rapidly through transitions 1..14)
  useEffect(() => {
    if (!overdriveActive) return;
    let step = 0;
    const triggerStep = () => {
      const mode = step % TRANSITION_MODES.length;
      stepSlideRef.current(1, mode, `Overdrive sequence (${step + 1}/${TRANSITION_MODES.length})`);
      step += 1;
      if (step >= TRANSITION_MODES.length) {
        setOverdriveActive(false);
        appendLog('OVERDRIVE', `Completed full ${TRANSITION_MODES.length}-node Matrix Overdrive sweep.`, 'warm');
      }
    };
    triggerStep();
    const id = window.setInterval(triggerStep, 1950);
    return () => window.clearInterval(id);
  }, [overdriveActive, appendLog]);

  // File loading handlers (Images + PDFs + Audio)
  const handleImageFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (!imageFiles.length) return;

      const added: SlideItem[] = imageFiles.map((file, idx) => ({
        id: `loaded_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        subtitle: `${Math.round(file.size / 1024)} KB Local Image`,
        url: URL.createObjectURL(file),
        source: 'loaded',
        createdAt: Date.now() + idx,
      }));

      await matrixEngineRef.current?.preload(added.map((s) => s.url));
      setSlides((prev) => {
        const next = [...prev, ...added];
        slidesRef.current = next;
        const firstNewIndex = prev.length;
        window.setTimeout(() => {
          transitionToIndex(firstNewIndex, undefined, `Loaded ${added.length} local image(s)`);
        }, 20);
        return next;
      });
      appendLog('UPLOAD', `Added ${added.length} local image(s) to live deck.`, 'info');
    },
    [appendLog, transitionToIndex]
  );

  const handlePdfFiles = useCallback(
    async (files: FileList | File[]) => {
      const pdfFiles = Array.from(files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (!pdfFiles.length) return;

      for (const file of pdfFiles) {
        try {
          setPdfLoadingStatus({ file: file.name, page: 1, total: 1 });
          appendLog('PDF', `Decoding pages from "${file.name}"...`, 'accent');
          const pdfSlides = await loadPdfAsSlides(file, (page, total) => {
            setPdfLoadingStatus({ file: file.name, page, total });
          });

          if (!pdfSlides.length) continue;

          // Switch to contain framing + natural page curl for crisp uncropped reading
          setParams((p) => ({ ...p, fitMode: 'contain', tapPageFlip: true }));
          setIsPlaying(false); // Pause auto-advance so reader can tap-flip through PDF pages comfortably

          await matrixEngineRef.current?.preload(pdfSlides.slice(0, 3).map((s) => s.url));
          setSlides((prev) => {
            const next = [...prev, ...pdfSlides];
            slidesRef.current = next;
            const firstNewIdx = prev.length;
            window.setTimeout(() => {
              transitionToIndex(firstNewIdx, 10, `Opened PDF "${file.name}"`, 1);
            }, 30);
            return next;
          });

          // Automatically transcribe PDF extracted page text into data/memory-mesh.json
          const meshPayload = pdfSlides.map((ps) => ({
            eventType: 'pdf_page_encoded',
            title: ps.title,
            transcript: ps.extractedText || `${ps.title} — ${ps.subtitle}`,
            keywords: [file.name.replace(/\.pdf$/i, ''), `page-${ps.pageNumber || 1}`, 'pdf'],
            slideId: ps.id,
            pageNumber: ps.pageNumber,
          }));
          void transcribeToMemoryMesh({ nodes: meshPayload })
            .then((res) => {
              setMemoryNodes(res.nodes);
              setMemoryUpdatedAt(new Date().toISOString());
              appendLog('MESH', `Transcribed ${pdfSlides.length} PDF page(s) to data/memory-mesh.json.`, 'info');
            })
            .catch(() => {});

          appendLog('PDF', `Loaded ${pdfSlides.length} flipbook pages from "${file.name}".`, 'info');
        } catch (err) {
          appendLog(
            'PDF',
            err instanceof Error ? `PDF decode failed: ${err.message}` : 'Failed decoding PDF file.',
            'error'
          );
        } finally {
          setPdfLoadingStatus(null);
        }
      }
    },
    [appendLog, transitionToIndex]
  );

  const handleAudioFile = useCallback(
    async (file: File) => {
      const engine = audioEngineRef.current;
      if (!engine) return;
      try {
        const name = await engine.loadAudioFile(file);
        setTrackName(name);
        setAudioPlaying(true);
        setIsSynthMode(false);
        updateThought('Load audio track', 'Web Audio EQ + MediaStream', `Streaming "${name}"`);
        appendLog('AUDIO', `Playing audio file: ${name}`, 'warm');
      } catch (err) {
        appendLog('AUDIO', err instanceof Error ? err.message : 'Failed decoding audio file.', 'error');
      }
    },
    [appendLog, updateThought]
  );

  const handleGenerateSlide = useCallback(
    (theme?: ProceduralTheme) => {
      const slide = generateProceduralSlide(theme);
      setSlides((prev) => {
        const next = [...prev, slide];
        slidesRef.current = next;
        const idx = next.length - 1;
        window.setTimeout(() => {
          transitionToIndex(idx, undefined, 'Procedural Art Synthesis');
        }, 20);
        return next;
      });
      appendLog('SYNTH-ART', `Generated "${slide.title}"`, 'pink');
    },
    [appendLog, transitionToIndex]
  );

  const handleGenerateBatch = useCallback(
    (count: number) => {
      const batch: SlideItem[] = Array.from({ length: count }, () => generateProceduralSlide());
      setSlides((prev) => {
        const next = [...prev, ...batch];
        slidesRef.current = next;
        const idx = prev.length;
        window.setTimeout(() => {
          transitionToIndex(idx, undefined, `Batch synthesized ${count} random artworks`);
        }, 20);
        return next;
      });
      appendLog('SYNTH-ART', `Added ${count} procedural random artworks to deck.`, 'pink');
    },
    [appendLog, transitionToIndex]
  );

  const handleRemoveSlide = useCallback((slideId: string) => {
    setSlides((prev) => {
      if (prev.length <= 1) return prev;
      const target = prev.find((s) => s.id === slideId);
      if (target?.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      const next = prev.filter((s) => s.id !== slideId);
      slidesRef.current = next;
      const nextIdx = Math.min(activeIndexRef.current, next.length - 1);
      setActiveIndex(nextIdx);
      void matrixEngineRef.current?.setImmediate(next[nextIdx].url);
      return next;
    });
  }, []);

  const handleShuffleDeck = useCallback(() => {
    setSlides((prev) => {
      if (prev.length <= 1) return prev;
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      slidesRef.current = copy;
      window.setTimeout(() => {
        transitionToIndex(0, undefined, 'Shuffled slideshow deck');
      }, 20);
      return copy;
    });
    appendLog('DECK', 'Shuffled slideshow sequence order.', 'info');
  }, [appendLog, transitionToIndex]);

  const handleToggleSynth = useCallback(async () => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    const active = await engine.toggleSynth();
    setAudioPlaying(active);
    setIsSynthMode(active);
    setTrackName(engine.trackName);
    appendLog('SYNTH', active ? 'Harmonic ambient synthesizer engaged.' : 'Synthesizer stopped.', 'warm');
  }, [appendLog]);

  const triggerEnergyPulse = useCallback(() => {
    overlaySceneRef.current?.triggerEnergyPulse();
    matrixEngineRef.current?.triggerShockwave(0.5, 0.5);
    appendLog('MATRIX', 'Energy pulse rippled across awareness nodes.', 'pink');
    updateThought('Energy pulse vector', 'Ripple amplitude + corona ring', '3D nodes & GPU shockwave actuated');
  }, [appendLog, updateThought]);

  const triggerGravityShift = useCallback(() => {
    overlaySceneRef.current?.triggerGravityShift();
    appendLog('MATRIX', 'Gravity vector inverted across spatial field.', 'warm');
    updateThought('Invert spatial gravity', 'Particle & node velocity field', 'Applied +5.2Z vertical thrust');
  }, [appendLog, updateThought]);

  const spawnMoreNodes = useCallback(() => {
    const total = overlaySceneRef.current?.spawnAwarenessNodes(6) || 30;
    setTelemetry((prev) => ({ ...prev, awarenessNodes: total }));
    appendLog('MATRIX', `Spawned 6 awareness nodes (total: ${total}).`, 'accent');
    updateThought('Spawn awareness nodes', 'InstancedMesh capacity allocation', `Active matrix nodes: ${total}`);
  }, [appendLog, updateThought]);

  const cyclePhotoStyle = useCallback(() => {
    setParams((prev) => {
      const cur = PHOTO_STYLES.find((s) => s.id === prev.photoStyle)?.index ?? 0;
      const next = PHOTO_STYLES[(cur + 1) % PHOTO_STYLES.length];
      appendLog('STYLE', `Photo Style -> ${next.name}`, 'accent');
      return { ...prev, photoStyle: next.id };
    });
  }, [appendLog]);

  const cycleEmergenceMode = useCallback(() => {
    setParams((prev) => {
      const cur = EMERGENCE_MODES.find((e) => e.id === prev.emergenceMode)?.index ?? 0;
      const next = EMERGENCE_MODES[(cur + 1) % EMERGENCE_MODES.length];
      appendLog('EMERGE', `Emergence Mode -> ${next.name}`, 'info');
      return { ...prev, emergenceMode: next.id };
    });
  }, [appendLog]);

  // Memory Mesh & Frame Sequence handlers
  const handleSearchMemory = useCallback(async (q: string) => {
    setMemoryQuery(q);
    try {
      const res = await fetchMemoryMesh(q);
      setMemoryNodes(res.nodes || []);
      setMemorySequences(res.sequences || []);
      setMemoryUpdatedAt(res.updatedAt || '');
    } catch {
      // ignore transient error
    }
  }, []);

  const handleTranscribeCurrent = useCallback(
    async (enrichWithGemini: boolean) => {
      const s = slidesRef.current[activeIndexRef.current];
      if (!s) return;
      const modeName = TRANSITION_MODES[activeModeRef.current]?.shortName || 'Page Curl';
      try {
        const res = await transcribeToMemoryMesh({
          enrichWithGemini,
          node: {
            eventType: s.source === 'pdf' ? 'pdf_slide_transcript' : 'slide_snapshot',
            title: s.title,
            transcript:
              s.extractedText ||
              `${s.title} (${s.subtitle}) rendered via ${modeName}, ${params.photoStyle} film look, ${params.emergenceMode} emergence.`,
            keywords: [s.source, modeName, params.photoStyle, params.emergenceMode],
            slideId: s.id,
            pageNumber: s.pageNumber,
            transitionMode: modeName,
            photoStyle: params.photoStyle,
            emergenceMode: params.emergenceMode,
          },
        });
        setMemoryNodes(res.nodes);
        setMemoryUpdatedAt(new Date().toISOString());
        appendLog('MESH', `Encoded "${s.title}" into data/memory-mesh.json.`, 'info');
      } catch (err) {
        appendLog('MESH', err instanceof Error ? err.message : 'Failed to transcribe slide.', 'error');
      }
    },
    [appendLog, params.emergenceMode, params.photoStyle]
  );

  const handleClearMemory = useCallback(async () => {
    try {
      await clearMemoryMesh();
      setMemoryNodes([]);
      setMemorySequences([]);
      setLiveFrames([]);
      setMemoryUpdatedAt(new Date().toISOString());
      appendLog('MESH', 'Cleared Smart Memory Mesh JSON store.', 'warm');
    } catch (err) {
      appendLog('MESH', err instanceof Error ? err.message : 'Failed clearing mesh.', 'error');
    }
  }, [appendLog]);

  const handleScrubFrame = useCallback(
    (prog: number) => {
      const list = slidesRef.current;
      const nextSlide = list[(activeIndexRef.current + 1) % list.length] || list[activeIndexRef.current];
      if (!nextSlide) return;
      setIsPlaying(false);
      setLiveProg(prog);
      matrixEngineRef.current?.setScrubProgress(nextSlide.url, activeModeRef.current, prog, 1);
    },
    []
  );

  const handleReplaySequence = useCallback(
    (seq: FrameSequenceRecord) => {
      const list = slidesRef.current;
      const target = list.find((s) => s.title === seq.endSlide) || list[(activeIndexRef.current + 1) % list.length];
      if (!target) return;
      setIsPlaying(false);
      const modeIdx = seq.keyFrames[0]?.modeId ?? 10;
      const totalDuration = Math.max(450, Math.min(2400, seq.durationMs));
      const frames = seq.keyFrames.length ? seq.keyFrames : [{ idx: 0, t: 0, prog: 0.5, foldAngle: 90, foldY: 0.6, fps: 60, slideIndex: activeIndexRef.current, modeId: modeIdx }];
      let step = 0;
      const tickMs = Math.max(24, Math.round(totalDuration / Math.max(1, frames.length)));
      appendLog('SEQUENCE', `Replaying ${seq.frameCount}-frame sequence (${seq.transitionMode})...`, 'accent');
      const timer = window.setInterval(() => {
        const kf = frames[step];
        if (!kf) {
          window.clearInterval(timer);
          void matrixEngineRef.current?.setScrubProgress(target.url, modeIdx, 0, 1);
          setLiveProg(0);
          return;
        }
        setLiveProg(kf.prog);
        matrixEngineRef.current?.setScrubProgress(target.url, kf.modeId, kf.prog, 1);
        step += 1;
      }, tickMs);
    },
    [appendLog]
  );

  // Smart Library Mode + Google Drive + Gemini Handlers
  const handlePullLibraryFromDrive = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      appendLog('DRIVE', 'Sign in with Google first to pull Library Matrix.', 'warm');
      return;
    }
    setDriveBusy(true);
    try {
      const { fileId, matrix } = await findOrLoadLibraryMatrix(token);
      setDriveMatrixFileId(fileId);
      if (matrix) {
        setLibraryMatrix(matrix);
        appendLog('DRIVE', `Pulled ${matrix.events.length} events from ${LIBRARY_MATRIX_FILENAME}.`, 'info');
        void transcribeToMemoryMesh({
          node: {
            eventType: 'drive_library_pull',
            title: `Pulled ${LIBRARY_MATRIX_FILENAME}`,
            transcript: `${matrix.libraryTitle}: ${matrix.summary} (${matrix.events.length} events).`,
            keywords: ['google-drive', 'smart-library', ...matrix.themes.slice(0, 4)],
            driveFileId: fileId || undefined,
          },
        })
          .then((res) => setMemoryNodes(res.nodes))
          .catch(() => {});
      } else {
        appendLog('DRIVE', `No "${LIBRARY_MATRIX_FILENAME}" found yet in Drive. Process text & save to create it.`, 'warm');
      }
    } catch (err) {
      appendLog('DRIVE', err instanceof Error ? err.message : 'Drive pull failed.', 'error');
    } finally {
      setDriveBusy(false);
    }
  }, [appendLog]);

  const handleScanDriveFiles = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setDriveBusy(true);
    try {
      const files = await listDriveTextAndMatrixFiles(token);
      setDriveFiles(files);
      appendLog('DRIVE', `Scanned Google Drive: found ${files.length} text/document source(s).`, 'accent');
    } catch (err) {
      appendLog('DRIVE', err instanceof Error ? err.message : 'Drive scan failed.', 'error');
    } finally {
      setDriveBusy(false);
    }
  }, [appendLog]);

  const handleGoogleSignIn = useCallback(async () => {
    setAuthBusy(true);
    try {
      const { user } = await googleSignIn();
      setGoogleUser(user);
      setHasDriveToken(true);
      appendLog('AUTH', `Connected Google Drive as ${user.email || user.displayName || 'User'}.`, 'info');
      await handleScanDriveFiles();
      await handlePullLibraryFromDrive();
    } catch (err) {
      appendLog('AUTH', err instanceof Error ? err.message : 'Google Sign-In failed.', 'error');
    } finally {
      setAuthBusy(false);
    }
  }, [appendLog, handlePullLibraryFromDrive, handleScanDriveFiles]);

  const handleGoogleLogout = useCallback(async () => {
    await logoutGoogleDrive();
    setGoogleUser(null);
    setHasDriveToken(false);
    setDriveFiles([]);
    setDriveMatrixFileId(null);
    appendLog('AUTH', 'Disconnected Google Drive session.', 'warm');
  }, [appendLog]);

  const handleProcessTextPayload = useCallback(
    async (sourceTitle: string, sourceKind: string, rawText: string) => {
      if (!rawText.trim()) {
        appendLog('LIBRARY', 'No readable text content found to process.', 'warm');
        return;
      }
      setDriveBusy(true);
      updateThought(
        `Process "${sourceTitle}" with Gemini`,
        'Smart Library NLP Extraction -> Event Library Matrix',
        'Structuring entities, themes, and telemetry events'
      );
      try {
        const processed = await processLibraryTextWithGemini({ sourceTitle, sourceKind, rawText });
        setLibraryMatrix((prev) => {
          const existingEvents = prev?.events || [];
          const mergedEvents = [...processed.events, ...existingEvents].slice(0, 120);
          const mergedThemes = Array.from(new Set([...(processed.themes || []), ...(prev?.themes || [])])).slice(0, 10);
          return {
            version: '1.0',
            updatedAt: new Date().toISOString(),
            libraryTitle: prev?.libraryTitle || processed.libraryTitle,
            summary: processed.summary,
            themes: mergedThemes,
            insights: [...(processed.insights || []), ...(prev?.insights || [])].slice(0, 8),
            events: mergedEvents,
          };
        });

        await transcribeToMemoryMesh({
          node: {
            eventType: 'gemini_library_encode',
            title: `Encoded Library: ${processed.libraryTitle}`,
            transcript: `${processed.summary} Extracted ${processed.events.length} structured event(s) from ${sourceTitle}.`,
            keywords: ['gemini', 'smart-library', ...(processed.themes || []).slice(0, 4)],
          },
        }).then((res) => setMemoryNodes(res.nodes));

        appendLog('GEMINI', `Encoded ${processed.events.length} structured library event(s) from "${sourceTitle}".`, 'pink');
      } catch (err) {
        appendLog('GEMINI', err instanceof Error ? err.message : 'Library encoding failed.', 'error');
      } finally {
        setDriveBusy(false);
      }
    },
    [appendLog, updateThought]
  );

  const handleAutoProcessStoredText = useCallback(async () => {
    const pdfTexts = slidesRef.current
      .filter((s) => Boolean(s.extractedText))
      .map((s) => `[Slide ${s.title}]\n${s.extractedText}`);
    const meshTexts = memoryNodes
      .slice(0, 30)
      .map((n) => `[${n.timestamp} | ${n.eventType} | ${n.title}]\n${n.transcript}`);
    const combined = [...pdfTexts, ...meshTexts].join('\n\n');
    await handleProcessTextPayload('Stored Mesh & PDF Corpus', 'stored-memory-mesh', combined);
  }, [handleProcessTextPayload, memoryNodes]);

  const handleUploadLibraryText = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        await handleProcessTextPayload(file.name, 'local-text-file', text);
      } catch (err) {
        appendLog('LIBRARY', err instanceof Error ? err.message : 'Failed reading text file.', 'error');
      }
    },
    [appendLog, handleProcessTextPayload]
  );

  const handleProcessDriveFile = useCallback(
    async (file: DriveFileMeta) => {
      const token = getAccessToken();
      if (!token) return;
      setDriveBusy(true);
      try {
        const text = await readDriveFileContent(token, file);
        await handleProcessTextPayload(file.name, 'google-drive-doc', text);
      } catch (err) {
        appendLog('DRIVE', err instanceof Error ? err.message : 'Failed reading Drive file.', 'error');
        setDriveBusy(false);
      }
    },
    [appendLog, handleProcessTextPayload]
  );

  const handleConfirmSaveToDrive = useCallback(async () => {
    setConfirmDriveModal((m) => ({ ...m, open: false }));
    const token = getAccessToken();
    if (!token || !libraryMatrix) return;
    setDriveBusy(true);
    try {
      const saved = await saveLibraryMatrixToDrive(token, libraryMatrix, driveMatrixFileId);
      setDriveMatrixFileId(saved.id);
      appendLog('DRIVE', `Saved ${libraryMatrix.events.length} events to "${saved.name}" in Google Drive.`, 'info');
      await handleScanDriveFiles();
    } catch (err) {
      appendLog('DRIVE', err instanceof Error ? err.message : 'Drive save failed.', 'error');
    } finally {
      setDriveBusy(false);
    }
  }, [appendLog, driveMatrixFileId, handleScanDriveFiles, libraryMatrix]);

  const handleAnalyzeLibrary = useCallback(
    async (question: string) => {
      if (!libraryMatrix) return;
      setDriveBusy(true);
      try {
        const res = await analyzeLibraryMatrixWithGemini({
          question,
          events: libraryMatrix.events,
          memoryNodes,
        });
        setAnalysisResult(res);
        appendLog('GEMINI', `Analysis complete: ${res.headline}`, 'accent');
      } catch (err) {
        appendLog('GEMINI', err instanceof Error ? err.message : 'Analysis failed.', 'error');
      } finally {
        setDriveBusy(false);
      }
    },
    [appendLog, libraryMatrix, memoryNodes]
  );

  // Prompt Matrix Command Parser
  const handleCommand = useCallback(
    (raw: string) => {
      const cmd = raw.trim().toLowerCase();
      if (!cmd) return;

      if (cmd === 'record' || cmd === 'rec' || cmd === 'start record') {
        startLiveRecording(false);
      } else if (cmd === 'stop record' || cmd === 'stop rec' || cmd === 'save video') {
        void stopRecording();
      } else if (cmd === 'render' || cmd === 'render video' || cmd === 'auto render') {
        startLiveRecording(true, autoSlidesCount);
      } else if (cmd === 'flip back' || cmd === 'turn back' || cmd === 'curl back') {
        stepSlide(-1, 10, 'Command: Reverse Page Curl', -1);
      } else if (cmd === 'flip' || cmd === 'turn' || cmd === 'curl' || cmd === 'page curl') {
        stepSlide(1, 10, 'Command: Natural Page Curl', 1);
      } else if (cmd.includes('ink')) {
        stepSlide(1, 11, 'Command: Ink Bloom Emergence', 1);
      } else if (cmd.includes('prism')) {
        stepSlide(1, 12, 'Command: Prism Shatter Emergence', 1);
      } else if (cmd.includes('mitosis') || cmd.includes('bio')) {
        stepSlide(1, 13, 'Command: Bio-Vacuole Emergence', 1);
      } else if (cmd.startsWith('style ')) {
        const q = cmd.replace('style ', '').trim();
        const found = PHOTO_STYLES.find(
          (s) => s.id.includes(q) || s.name.toLowerCase().includes(q)
        );
        if (found) {
          setParams((p) => ({ ...p, photoStyle: found.id }));
          appendLog('STYLE', `Switched Photo Style to ${found.name}.`, 'accent');
        } else {
          appendLog('STYLE', 'Styles: natural, mono, kodachrome, cyanotype, velvia, infrared, sepia, chrome, solar.', 'warm');
        }
      } else if (cmd.startsWith('emerge ')) {
        const q = cmd.replace('emerge ', '').trim();
        const found = EMERGENCE_MODES.find(
          (e) => e.id.includes(q) || e.name.toLowerCase().includes(q)
        );
        if (found) {
          setParams((p) => ({ ...p, emergenceMode: found.id }));
          appendLog('EMERGE', `Switched Emergence Mode to ${found.name}.`, 'info');
        }
      } else if (cmd.includes('sun')) {
        setStageMode(cmd.includes('hybrid') ? 'hybrid' : 'fractal');
        appendLog('SUN', `Stage mode -> ${cmd.includes('hybrid') ? 'HYBRID SUN' : 'DIGITAL SUN'}`, 'warm');
      } else if (cmd.includes('hybrid')) {
        setStageMode('hybrid');
        appendLog('SUN', 'Stage mode -> HYBRID SUN + SLIDES', 'warm');
      } else if (cmd.includes('slides')) {
        setStageMode('slides');
        appendLog('MATRIX', 'Stage mode -> SLIDE MATRIX', 'accent');
      } else if (cmd.includes('shockwave')) {
        matrixEngineRef.current?.triggerShockwave(0.5, 0.5);
        appendLog('SUN', 'Supernova shockwave emitted from stage center.', 'accent');
      } else if (cmd.includes('pulse') || cmd.includes('energy')) {
        triggerEnergyPulse();
      } else if (cmd.includes('gravity') || cmd.includes('pull')) {
        triggerGravityShift();
      } else if (cmd.includes('spawn')) {
        spawnMoreNodes();
      } else if (cmd.includes('heal')) {
        handleForceHeal();
      } else if (cmd === 'fullscreen' || cmd === 'fs') {
        void toggleFullscreen();
      } else if (cmd === 'next' || cmd === 'n') {
        stepSlide(1, undefined, 'Command: next');
      } else if (cmd === 'prev' || cmd === 'previous' || cmd === 'p') {
        stepSlide(-1, undefined, 'Command: prev');
      } else if (cmd === 'play' || cmd === 'start') {
        setIsPlaying(true);
        appendLog('CMD', 'Slideshow playback resumed.', 'info');
      } else if (cmd === 'pause' || cmd === 'stop') {
        setIsPlaying(false);
        setOverdriveActive(false);
        appendLog('CMD', 'Slideshow paused.', 'info');
      } else if (cmd === 'random' || cmd === 'rand') {
        jumpRandomSlide();
      } else if (cmd === 'shuffle') {
        handleShuffleDeck();
      } else if (cmd === 'overdrive') {
        setOverdriveActive((v) => !v);
      } else if (cmd === 'synth' || cmd === 'music') {
        void handleToggleSynth();
      } else if (cmd === 'zen' || cmd === 'cinema') {
        setZenMode((v) => !v);
      } else if (cmd.includes('gen') || cmd.includes('art')) {
        handleGenerateSlide();
      } else if (cmd.startsWith('matrix ') || cmd.startsWith('fx ')) {
        const n = parseInt(cmd.replace(/\D/g, ''), 10);
        if (n >= 1 && n <= TRANSITION_MODES.length) {
          stepSlide(1, n - 1, `Command: Matrix FX ${n}`);
        } else {
          appendLog('CMD', `Specify transition 1 through ${TRANSITION_MODES.length} (e.g., "fx 11").`, 'error');
        }
      } else if (cmd.startsWith('mood ')) {
        const target = cmd.replace('mood ', '').trim() as MoodMode;
        if (MOODS.includes(target)) {
          setParams((p) => ({ ...p, mood: target }));
          appendLog('MOOD', `Color grade switched to ${target.toUpperCase()}.`, 'pink');
        }
      } else if (cmd.includes('swarm')) {
        const enable = !cmd.includes('off');
        setOverlayConfig((c) => ({ ...c, swarm: enable }));
        appendLog('3D', `Orbital swarm ${enable ? 'enabled' : 'disabled'}.`, 'info');
      } else if (cmd.includes('core')) {
        const enable = !cmd.includes('off');
        setOverlayConfig((c) => ({ ...c, gelCore: enable }));
        appendLog('3D', `Gel wireframe core ${enable ? 'enabled' : 'disabled'}.`, 'pink');
      } else if (cmd.includes('grid')) {
        const enable = !cmd.includes('off');
        setOverlayConfig((c) => ({ ...c, horizonGrid: enable }));
        appendLog('3D', `Horizon grid ${enable ? 'enabled' : 'disabled'}.`, 'pink');
      } else if (cmd.includes('motes')) {
        const enable = !cmd.includes('off');
        setOverlayConfig((c) => ({ ...c, motes: enable }));
        appendLog('3D', `Spark motes ${enable ? 'enabled' : 'disabled'}.`, 'accent');
      } else if (cmd.includes('contain')) {
        setParams((p) => ({ ...p, fitMode: 'contain' }));
      } else if (cmd.includes('cover')) {
        setParams((p) => ({ ...p, fitMode: 'cover' }));
      } else if (cmd === 'memory' || cmd === 'mesh') {
        setSideTab('memory');
        setSidePanelOpen(true);
      } else if (cmd === 'transcribe') {
        void handleTranscribeCurrent(true);
      } else if (cmd === 'library' || cmd === 'drive') {
        setSideTab('library');
        setSidePanelOpen(true);
      } else if (cmd === 'design' || cmd === 'fractal hud') {
        setSideTab('design');
        setSidePanelOpen(true);
      } else if (cmd.startsWith('symmetry ')) {
        const n = parseInt(cmd.replace('symmetry ', '').trim(), 10);
        if (n === 0 || n === 2 || n === 4 || n === 6 || n === 8) {
          setDesignConfig((d) => ({ ...d, symmetryOrder: n }));
          appendLog('DESIGN', `Hyper-symmetry fold set to ${n === 0 ? 'Planar' : `${n}x`}.`, 'accent');
        }
      } else {
        appendLog(
          'CMD',
          `Unknown "${raw}". Try: flip, memory, transcribe, library, symmetry 4, ink, prism, record.`,
          'warm'
        );
      }
    },
    [
      appendLog,
      autoSlidesCount,
      handleForceHeal,
      handleGenerateSlide,
      handleShuffleDeck,
      handleToggleSynth,
      handleTranscribeCurrent,
      jumpRandomSlide,
      spawnMoreNodes,
      startLiveRecording,
      stepSlide,
      stopRecording,
      toggleFullscreen,
      triggerEnergyPulse,
      triggerGravityShift,
    ]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepSlideRef.current(1, params.tapPageFlip ? 10 : undefined, 'Key Right -> Flip Forward', 1);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepSlideRef.current(-1, params.tapPageFlip ? 10 : undefined, 'Key Left -> Flip Back', -1);
      } else if (e.key === 'r' || e.key === 'R') {
        jumpRandomSlide();
      } else if (e.key === 'h' || e.key === 'H') {
        setZenMode((v) => !v);
      } else if (e.key === 'f' || e.key === 'F') {
        void toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleWindow('matrix');
      } else if (e.key === 'v' || e.key === 'V') {
        toggleWindow('video');
      } else if (e.key >= '1' && e.key <= '9') {
        stepSlideRef.current(1, Number(e.key) - 1, `Hotkey FX ${e.key}`);
      } else if (e.key === '0') {
        stepSlideRef.current(1, 9, 'Hotkey FX 10');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [jumpRandomSlide, params.tapPageFlip, toggleFullscreen, toggleWindow]);

  // Global Drag-and-Drop listeners (Images + PDFs + Audio)
  useEffect(() => {
    let dragCounter = 0;
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter += 1;
      setIsDraggingFiles(true);
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter -= 1;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDraggingFiles(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDraggingFiles(false);
      const files = e.dataTransfer?.files;
      if (!files || !files.length) return;

      const imgs: File[] = [];
      const pdfs: File[] = [];
      const audios: File[] = [];
      const texts: File[] = [];
      Array.from(files).forEach((f) => {
        const lower = f.name.toLowerCase();
        if (f.type === 'application/pdf' || lower.endsWith('.pdf')) pdfs.push(f);
        else if (f.type.startsWith('image/')) imgs.push(f);
        else if (f.type.startsWith('audio/')) audios.push(f);
        else if (
          f.type.startsWith('text/') ||
          lower.endsWith('.txt') ||
          lower.endsWith('.md') ||
          lower.endsWith('.json') ||
          lower.endsWith('.csv')
        ) {
          texts.push(f);
        }
      });
      if (pdfs.length) void handlePdfFiles(pdfs);
      if (imgs.length) void handleImageFiles(imgs);
      if (audios.length) void handleAudioFile(audios[0]);
      if (texts.length) {
        setSideTab('library');
        setSidePanelOpen(true);
        void handleUploadLibraryText(texts[0]);
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleAudioFile, handleImageFiles, handlePdfFiles, handleUploadLibraryText]);

  const currentSlide = slides[activeIndex] || slides[0];
  const activeModeInfo = TRANSITION_MODES[activeMode] || TRANSITION_MODES[0];
  const currentStyleInfo = PHOTO_STYLES.find((s) => s.id === params.photoStyle) || PHOTO_STYLES[0];
  const currentEmergeInfo = EMERGENCE_MODES.find((e) => e.id === params.emergenceMode) || EMERGENCE_MODES[0];

  const forgeSnapshot = useMemo<ForgeConfigSnapshot>(
    () => ({ params, sequenceMode, overlay: overlayConfig }),
    [overlayConfig, params, sequenceMode]
  );

  // Stage pointer interactions: Liquid Touch + Draggable & Foldable Page Flip + Whole-Event Frame Capture
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 2) return;
    const nx = e.clientX / Math.max(1, window.innerWidth);
    const ny = e.clientY / Math.max(1, window.innerHeight);

    emitRipple(e.clientX, e.clientY);
    matrixEngineRef.current?.triggerShockwave(nx, ny);
    overlaySceneRef.current?.triggerTransitionPulse();

    if (pointerTrackerRef.current?.longPressTimer) {
      window.clearTimeout(pointerTrackerRef.current.longPressTimer);
    }

    const x = e.clientX;
    const y = e.clientY;
    const label =
      currentSlide?.source === 'pdf' && currentSlide.pageNumber
        ? `PDF Page ${currentSlide.pageNumber}/${currentSlide.totalPages}`
        : currentSlide?.title || 'Active Stage Frame';

    const longPressTimer = window.setTimeout(() => {
      if (!pointerTrackerRef.current || dragFoldRef.current?.active) return;
      pointerTrackerRef.current.longPressFired = true;
      const hit = overlaySceneRef.current?.hitTest(x, y);
      setLiquidMenu({
        open: true,
        x,
        y,
        targetType: hit?.type || 'slide',
        label: hit?.label || label,
      });
    }, 390);

    pointerTrackerRef.current = {
      startX: x,
      startY: y,
      startTime: performance.now(),
      longPressTimer,
      longPressFired: false,
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const tracker = pointerTrackerRef.current;
    if (!tracker || tracker.longPressFired) return;

    const dx = e.clientX - tracker.startX;
    const dy = e.clientY - tracker.startY;
    if (Math.hypot(dx, dy) > 10 && tracker.longPressTimer) {
      window.clearTimeout(tracker.longPressTimer);
      tracker.longPressTimer = null;
    }

    // Begin live draggable/foldable corner page curl when dragging horizontally > 14px
    if (!dragFoldRef.current && Math.abs(dx) >= 14 && Math.abs(dx) > Math.abs(dy) * 0.85) {
      const list = slidesRef.current;
      if (list.length > 1) {
        const dir: 1 | -1 = dx < 0 ? 1 : -1;
        const targetIdx = ((activeIndexRef.current + dir) % list.length + list.length) % list.length;
        const targetSlide = list[targetIdx];
        dragFoldRef.current = {
          active: true,
          dir,
          targetIdx,
          startX: e.clientX,
          lastX: e.clientX,
          lastTime: performance.now(),
          velocityX: 0,
          lastFrac: 0.02,
        };
        seqCaptureRef.current = {
          active: true,
          startedAt: performance.now(),
          startSlideTitle: currentSlide?.title || 'Slide',
          endSlideTitle: targetSlide.title,
          modeId: 10,
          modeName: 'Interactive Page Fold',
          samples: [],
          lastSampleAt: 0,
          lastProg: -1,
        };
        setIsPlaying(false);
        void matrixEngineRef.current?.beginInteractiveFold(
          targetSlide.url,
          dir,
          e.clientY / Math.max(1, window.innerHeight)
        );
      }
    }

    const fold = dragFoldRef.current;
    if (fold && fold.active) {
      const now = performance.now();
      const dt = Math.max(1, now - fold.lastTime);
      fold.velocityX = Math.abs(e.clientX - fold.lastX) / dt;
      fold.lastX = e.clientX;
      fold.lastTime = now;

      const span = Math.max(160, window.innerWidth * 0.55);
      const directedDx = fold.dir === 1 ? fold.startX - e.clientX : e.clientX - fold.startX;
      const frac = Math.max(0.015, Math.min(0.985, directedDx / span));
      fold.lastFrac = frac;
      matrixEngineRef.current?.updateInteractiveFold(
        frac,
        e.clientY / Math.max(1, window.innerHeight)
      );
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const tracker = pointerTrackerRef.current;
    if (tracker?.longPressTimer) {
      window.clearTimeout(tracker.longPressTimer);
      tracker.longPressTimer = null;
    }
    pointerTrackerRef.current = null;

    // 1. Settle Draggable & Foldable Interactive Curl
    const fold = dragFoldRef.current;
    if (fold && fold.active) {
      dragFoldRef.current = null;
      const shouldCommit = fold.lastFrac >= 0.26 || fold.velocityX > 0.45;
      const targetSlide = slidesRef.current[fold.targetIdx];

      void matrixEngineRef.current?.releaseInteractiveFold(shouldCommit).then((committed) => {
        if (committed && targetSlide) {
          setActiveIndex(fold.targetIdx);
          setActiveMode(10);
          setSlideProgress(0);
          appendLog('FOLD', `Interactive page fold committed -> ${targetSlide.title}`, 'accent');
          updateThought(
            'Interactive Page Fold committed',
            `Fold corner released at ${Math.round(fold.lastFrac * 100)}%`,
            `Transitioned to "${targetSlide.title}"`
          );
          void finalizeFrameSequence(true, targetSlide.title);
        } else {
          appendLog('FOLD', 'Interactive fold released early — sprung back.', 'info');
          void finalizeFrameSequence(false, currentSlide?.title);
        }
      });
      return;
    }

    if (!tracker || tracker.longPressFired) return;

    const dx = e.clientX - tracker.startX;
    const dy = e.clientY - tracker.startY;
    const dist = Math.hypot(dx, dy);

    // 2. Fast Swipe fallback
    if (Math.abs(dx) >= 52 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      const dir: 1 | -1 = dx < 0 ? 1 : -1;
      stepSlide(
        dir,
        10,
        dir > 0 ? 'Swipe left -> Page flip forward' : 'Swipe right -> Page flip back',
        dir
      );
      return;
    }

    // 3. Clean Tap -> Check 3D Liquid Touch object hit first, otherwise Natural Page Flip
    if (dist < 14) {
      const hit = overlaySceneRef.current?.hitTest(e.clientX, e.clientY);
      if (hit) {
        overlaySceneRef.current?.triggerEnergyPulse();
        setLiquidMenu({
          open: true,
          x: e.clientX,
          y: e.clientY,
          targetType: hit.type,
          label: hit.label,
        });
        return;
      }

      if (params.tapPageFlip) {
        const dir: 1 | -1 = e.clientX < window.innerWidth * 0.24 ? -1 : 1;
        stepSlide(
          dir,
          10,
          dir > 0 ? 'Tap -> Natural Page Flip forward' : 'Tap left edge -> Page Flip back',
          dir
        );
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(12);
          } catch {
            // ignore unsupported haptic
          }
        }
      }
    }
  };

  return (
    <div
      className="os-shell"
      onPointerMove={(e) => {
        const nx = e.clientX / Math.max(1, window.innerWidth);
        const ny = e.clientY / Math.max(1, window.innerHeight);
        matrixEngineRef.current?.setPointerNormalized(nx, ny);
        overlaySceneRef.current?.setPointerNormalized(nx, ny);
      }}
    >
      {/* Hidden File Pickers */}
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) void handleImageFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) void handlePdfFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) void handleAudioFile(e.target.files[0]);
          e.target.value = '';
        }}
      />

      {/* Fullscreen WebGL2 Transition Matrix + Digital Sun Stage + Three.js 3D Overlay */}
      <div
        className={`stage-layer stage-mood-${params.mood}`}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
        onContextMenu={(e) => {
          e.preventDefault();
          const hit = overlaySceneRef.current?.hitTest(e.clientX, e.clientY);
          const label =
            currentSlide?.source === 'pdf' && currentSlide.pageNumber
              ? `PDF Page ${currentSlide.pageNumber}/${currentSlide.totalPages}`
              : currentSlide?.title || 'Stage Canvas';
          setLiquidMenu({
            open: true,
            x: e.clientX,
            y: e.clientY,
            targetType: hit?.type || 'slide',
            label: hit?.label || label,
          });
        }}
      >
        <canvas ref={matrixCanvasRef} className="stage-canvas" aria-label="Live slideshow & PDF flipbook stage" />
        <div ref={overlayContainerRef} className="overlay-canvas" aria-hidden="true" />
      </div>

      {/* Liquid Touch Ripples */}
      {ripples.map((r) => (
        <span key={r.id} className="liquid-ripple" style={{ left: r.x, top: r.y }} aria-hidden="true" />
      ))}

      {/* Contextual Liquid Touch Interaction Menu */}
      <LiquidTouchMenu
        menu={liquidMenu}
        photoStyleName={currentStyleInfo.name}
        emergenceName={currentEmergeInfo.name}
        fitMode={params.fitMode}
        stageMode={stageMode}
        isPdf={currentSlide?.source === 'pdf'}
        onClose={() => setLiquidMenu((m) => ({ ...m, open: false }))}
        onFlipForward={() => stepSlide(1, 10, 'Liquid Menu -> Flip Forward', 1)}
        onFlipBackward={() => stepSlide(-1, 10, 'Liquid Menu -> Flip Back', -1)}
        onCyclePhotoStyle={cyclePhotoStyle}
        onCycleEmergence={cycleEmergenceMode}
        onToggleFitMode={() =>
          setParams((p) => ({ ...p, fitMode: p.fitMode === 'cover' ? 'contain' : 'cover' }))
        }
        onPulseEnergy={triggerEnergyPulse}
        onGravityShift={triggerGravityShift}
        onSpawnNodes={spawnMoreNodes}
        onToggleGelCore={() => setOverlayConfig((c) => ({ ...c, gelCore: !c.gelCore }))}
        onToggleSwarm={() => setOverlayConfig((c) => ({ ...c, swarm: !c.swarm }))}
        onCycleStageMode={() => {
          setStageMode((m) => STAGE_MODES[(STAGE_MODES.indexOf(m) + 1) % STAGE_MODES.length]);
        }}
        onShockwaveAtPoint={() => {
          matrixEngineRef.current?.triggerShockwave(
            liquidMenu.x / Math.max(1, window.innerWidth),
            liquidMenu.y / Math.max(1, window.innerHeight)
          );
          emitRipple(liquidMenu.x, liquidMenu.y);
        }}
      />

      {!zenMode && (
        <>
          <div className="stage-scrim-top" />
          <div className="stage-scrim-bottom" />
        </>
      )}

      {/* Clean 3-Zone Top OS Bar */}
      {!zenMode && (
        <header className="os-topbar">
          <div className="os-brand">
            <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true">
              <path
                d="M16 3C16.8 10.6 21.4 15.2 29 16C21.4 16.8 16.8 21.4 16 29C15.2 21.4 10.6 16.8 3 16C10.6 15.2 15.2 10.6 16 3Z"
                fill="#38BDF8"
              />
            </svg>
            <span className="os-brand-title">Matrix Slide OS</span>
            {currentSlide && (
              <div className="os-slide-meta">
                <span
                  className={`os-meta-kind ${
                    currentSlide.source === 'pdf'
                      ? 'os-meta-kind--pdf'
                      : currentSlide.source === 'loaded'
                        ? 'os-meta-kind--loaded'
                        : currentSlide.source === 'generated'
                          ? 'os-meta-kind--generated'
                          : ''
                  }`}
                >
                  {stageMode === 'fractal' ? 'Sun Core' : currentSlide.source}
                </span>
                <span className="os-meta-sep" aria-hidden="true">·</span>
                <span className="os-slide-name" title={currentSlide.title}>
                  {stageMode === 'fractal'
                    ? 'Digital Sun Fractal Core'
                    : currentSlide.source === 'pdf' && currentSlide.pageNumber
                      ? `Page ${currentSlide.pageNumber} / ${currentSlide.totalPages}`
                      : currentSlide.title}
                </span>
              </div>
            )}
          </div>

          <nav className="os-window-tabs" aria-label="Workspace windows">
            <button
              type="button"
              className={`os-btn os-tab-btn ${openWindows.matrix ? 'os-btn-active' : ''}`}
              onClick={() => toggleWindow('matrix')}
            >
              <Grid3x3 size={13} /> Matrix
            </button>
            <button
              type="button"
              className={`os-btn os-tab-btn ${openWindows.video ? 'os-btn-active' : ''}`}
              onClick={() => toggleWindow('video')}
            >
              <Video size={13} /> Video ({clips.length})
            </button>
            <button
              type="button"
              className={`os-btn os-tab-btn ${openWindows.media ? 'os-btn-active' : ''}`}
              onClick={() => toggleWindow('media')}
            >
              <Images size={13} /> Media & PDF
            </button>
            <button
              type="button"
              className={`os-btn os-tab-btn ${openWindows.audio ? 'os-btn-active' : ''}`}
              onClick={() => toggleWindow('audio')}
            >
              <Music2 size={13} /> Audio
            </button>
            <button
              type="button"
              className={`os-btn os-tab-btn ${openWindows.forge ? 'os-btn-active' : ''}`}
              onClick={() => toggleWindow('forge')}
            >
              <Code2 size={13} /> Forge
            </button>
            <button
              type="button"
              className={`os-btn os-tab-btn ${sidePanelOpen ? 'os-btn-active' : ''}`}
              onClick={() => setSidePanelOpen((v) => !v)}
              title="Open Hyper-Symmetric Fractal Glass HUD (Design Matrix, Memory Mesh JSON, Smart Library)"
            >
              <Layers size={13} /> Fractal HUD
            </button>
          </nav>

          <div className="os-topbar-actions">
            <button
              type="button"
              className={`os-btn os-icon-btn ${isRecording ? 'os-btn-record-active' : ''}`}
              onClick={() => (isRecording ? void stopRecording() : startLiveRecording(false))}
              title="Record HUD-free fullscreen App-to-Video stream"
            >
              {isRecording ? (
                <>
                  <Square size={11} /> {recordingElapsed.toFixed(1)}s
                </>
              ) : (
                <>
                  <Circle size={10} fill="#ef4444" color="#ef4444" /> REC
                </>
              )}
            </button>

            <button
              type="button"
              className="os-btn os-icon-btn"
              onClick={() => pdfInputRef.current?.click()}
              title="Load PDF document as interactive flipbook"
            >
              <FileText size={13} /> PDF
            </button>
            <button
              type="button"
              className="os-btn os-icon-btn"
              onClick={() => imageInputRef.current?.click()}
              title="Load local images"
            >
              <ImagePlus size={13} /> Images
            </button>
            <button
              type="button"
              className="os-btn os-icon-btn os-icon-btn--square os-hide-mobile"
              onClick={() => void toggleFullscreen()}
              title="Toggle fullscreen (F)"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
            </button>
            <span className="os-counter-text">
              {String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
          </div>
        </header>
      )}

      {/* Draggable Floating OS Windows */}
      {!zenMode && openWindows.matrix && (
        <OsWindow
          id="matrix"
          title="14-Node Transition Matrix"
          initialX={typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 398) : 640}
          initialY={64}
          width={382}
          zIndex={windowZ.matrix}
          onFocus={() => focusWindow('matrix')}
          onClose={() => toggleWindow('matrix')}
        >
          <MatrixPanel
            modes={TRANSITION_MODES}
            activeMode={activeMode}
            sequenceMode={sequenceMode}
            overdriveActive={overdriveActive}
            tapPageFlip={params.tapPageFlip}
            photoStyle={params.photoStyle}
            emergenceMode={params.emergenceMode}
            overlayConfig={overlayConfig}
            telemetry={telemetry}
            thought={thought}
            logs={logs}
            onTriggerMode={(modeId) => stepSlide(1, modeId, `Matrix click FX ${modeId + 1}`)}
            onChangeSequenceMode={(seq) => {
              setSequenceMode(seq);
              appendLog('MATRIX', `Transition sequence mode set to ${seq.toUpperCase()}.`, 'accent');
            }}
            onToggleOverdrive={() => setOverdriveActive((v) => !v)}
            onToggleTapPageFlip={() => setParams((p) => ({ ...p, tapPageFlip: !p.tapPageFlip }))}
            onChangePhotoStyle={(style: PhotoStyleId) => setParams((p) => ({ ...p, photoStyle: style }))}
            onChangeEmergenceMode={(em: EmergenceMode) => setParams((p) => ({ ...p, emergenceMode: em }))}
            onChangeOverlay={(next) => setOverlayConfig((prev) => ({ ...prev, ...next }))}
            onForceHeal={handleForceHeal}
            onEnergyPulse={triggerEnergyPulse}
            onGravityShift={triggerGravityShift}
            onSpawnNodes={spawnMoreNodes}
          />
        </OsWindow>
      )}

      {!zenMode && openWindows.video && (
        <OsWindow
          id="video"
          title="App-to-Video Studio & Digital Sun"
          initialX={typeof window !== 'undefined' ? Math.max(20, Math.round(window.innerWidth * 0.25)) : 280}
          initialY={64}
          width={376}
          zIndex={windowZ.video}
          onFocus={() => focusWindow('video')}
          onClose={() => toggleWindow('video')}
        >
          <VideoStudioPanel
            isRecording={isRecording}
            recordingElapsed={recordingElapsed}
            autoRenderActive={autoRenderRef.current.active}
            autoRenderRemaining={autoRenderRemaining}
            aspect={videoAspect}
            fps={videoFps}
            bitrateMbps={videoBitrate}
            burnTitle={burnTitle}
            autoSlidesCount={autoSlidesCount}
            stageMode={stageMode}
            sunConfig={sunConfig}
            clips={clips}
            onChangeAspect={setVideoAspect}
            onChangeFps={setVideoFps}
            onChangeBitrate={setVideoBitrate}
            onToggleBurnTitle={() => setBurnTitle((v) => !v)}
            onChangeAutoSlidesCount={setAutoSlidesCount}
            onToggleLiveRecording={() =>
              isRecording ? void stopRecording() : startLiveRecording(false)
            }
            onStartAutoRender={() => startLiveRecording(true, autoSlidesCount)}
            onChangeStageMode={(m) => {
              setStageMode(m);
              appendLog('STAGE', `Render stage mode set to ${m.toUpperCase()}.`, 'warm');
            }}
            onUpdateSunConfig={(next) => setSunConfig((prev) => ({ ...prev, ...next }))}
            onFireShockwave={() => matrixEngineRef.current?.triggerShockwave(0.5, 0.5)}
            onDeleteClip={(id) => {
              setClips((prev) => {
                const target = prev.find((c) => c.id === id);
                if (target?.url.startsWith('blob:')) URL.revokeObjectURL(target.url);
                return prev.filter((c) => c.id !== id);
              });
            }}
          />
        </OsWindow>
      )}

      {!zenMode && openWindows.media && (
        <OsWindow
          id="media"
          title="Media, PDF Folio & Film Styles"
          initialX={18}
          initialY={64}
          width={376}
          zIndex={windowZ.media}
          onFocus={() => focusWindow('media')}
          onClose={() => toggleWindow('media')}
        >
          <MediaDeckPanel
            slides={slides}
            activeSlideId={currentSlide?.id || ''}
            params={params}
            beatSync={beatSync}
            pdfLoadingStatus={pdfLoadingStatus}
            onSelectSlide={(id) => {
              const idx = slides.findIndex((s) => s.id === id);
              if (idx >= 0) {
                transitionToIndex(
                  idx,
                  slides[idx]?.source === 'pdf' ? 10 : undefined,
                  'Media deck selection',
                  idx < activeIndexRef.current ? -1 : 1
                );
              }
            }}
            onRemoveSlide={handleRemoveSlide}
            onUploadClick={() => imageInputRef.current?.click()}
            onUploadPdfClick={() => pdfInputRef.current?.click()}
            onGenerateSlide={handleGenerateSlide}
            onGenerateBatch={handleGenerateBatch}
            onShuffleSlides={handleShuffleDeck}
            onUpdateParams={(next) => setParams((prev) => ({ ...prev, ...next }))}
            onToggleBeatSync={() => {
              setBeatSync((v) => {
                const next = !v;
                appendLog('AUDIO', `Beat-sync slide advance ${next ? 'enabled' : 'disabled'}.`, 'warm');
                return next;
              });
            }}
          />
        </OsWindow>
      )}

      {!zenMode && openWindows.audio && (
        <OsWindow
          id="audio"
          title="Audio Reactive EQ & Synth"
          initialX={typeof window !== 'undefined' ? Math.max(24, Math.round(window.innerWidth * 0.34)) : 300}
          initialY={74}
          width={360}
          zIndex={windowZ.audio}
          onFocus={() => focusWindow('audio')}
          onClose={() => toggleWindow('audio')}
        >
          <AudioEqPanel
            trackName={trackName}
            isPlaying={audioPlaying}
            isSynthMode={isSynthMode}
            eqParams={eqParams}
            audioReactivity={params.audioReactivity}
            metrics={audioMetrics}
            spectrumCanvasRef={spectrumCanvasRef}
            onUploadAudio={() => audioInputRef.current?.click()}
            onToggleSynth={() => void handleToggleSynth()}
            onStopAudio={() => {
              audioEngineRef.current?.stop();
              setAudioPlaying(false);
              setIsSynthMode(false);
              setTrackName('No Audio Loaded');
            }}
            onApplyPreset={(key: EqPresetKey) => {
              const p = EQ_PRESETS[key];
              const next = { drive: p.drive, low: p.low, mid: p.mid, high: p.high };
              setEqParams(next);
              audioEngineRef.current?.setParams(next);
              appendLog('EQ', `Applied audio preset: ${p.label}`, 'warm');
            }}
            onChangeEq={(next) => {
              setEqParams((prev) => {
                const updated = { ...prev, ...next };
                audioEngineRef.current?.setParams(updated);
                return updated;
              });
            }}
            onChangeReactivity={(val) => setParams((p) => ({ ...p, audioReactivity: val }))}
            onExportWav={() => {
              appendLog('EXPORT', 'Rendering offline WAV-HD processed audio...', 'warm');
              void audioEngineRef.current?.exportWavHD();
            }}
          />
        </OsWindow>
      )}

      {!zenMode && openWindows.forge && (
        <OsWindow
          id="forge"
          title="Code Forge Choreography IDE"
          initialX={48}
          initialY={84}
          width={380}
          zIndex={windowZ.forge}
          onFocus={() => focusWindow('forge')}
          onClose={() => toggleWindow('forge')}
        >
          <CodeForgePanel
            currentSnapshot={forgeSnapshot}
            onApplySnapshot={(snap, label) => {
              setParams(snap.params);
              setSequenceMode(snap.sequenceMode);
              setOverlayConfig(snap.overlay);
              updateThought(
                'Code Forge execution',
                label || 'Custom JSON parameters',
                `Transition ${snap.params.transitionDuration}s / Style ${snap.params.photoStyle}`
              );
              appendLog('FORGE', `Compiled live config: ${label || 'Custom'}`, 'pink');
            }}
          />
        </OsWindow>
      )}

      {/* Sleek Bottom Micro-HUD */}
      {!zenMode ? (
        <footer className="os-microhud">
          <div className="os-progress-track">
            <div className="os-progress-fill" style={{ width: `${slideProgress}%` }} />
          </div>

          <div className="os-microhud-body">
            <div className="os-microhud-row">
              <div className="os-controls-group">
                <button
                  type="button"
                  className="os-btn os-icon-btn os-icon-btn--square"
                  aria-label="Flip page back"
                  onClick={() => stepSlide(-1, params.tapPageFlip ? 10 : undefined, 'HUD Flip Back', -1)}
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  className="os-btn os-icon-btn os-icon-btn--primary"
                  aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
                  onClick={() => setIsPlaying((p) => !p)}
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  className="os-btn os-icon-btn os-icon-btn--square"
                  aria-label="Flip page forward"
                  onClick={() => stepSlide(1, params.tapPageFlip ? 10 : undefined, 'HUD Flip Forward', 1)}
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  className={`os-btn os-icon-btn ${params.tapPageFlip ? 'os-btn-active' : ''}`}
                  onClick={() => setParams((p) => ({ ...p, tapPageFlip: !p.tapPageFlip }))}
                  title="Toggle natural page flip on screen tap"
                >
                  <BookOpen size={13} />
                  <span className="os-hide-mobile">Tap Flip</span>
                </button>
                <button
                  type="button"
                  className="os-btn os-icon-btn os-hide-mobile"
                  onClick={() => jumpRandomSlide()}
                  title="Jump to random image + random transition (R)"
                >
                  <Sparkles size={13} /> Random
                </button>
                <button
                  type="button"
                  className={`os-btn os-icon-btn os-icon-btn--square os-hide-mobile ${shuffleOrder ? 'os-btn-active' : ''}`}
                  onClick={() => setShuffleOrder((v) => !v)}
                  title="Toggle shuffle order"
                  aria-label="Toggle shuffle order"
                >
                  <Shuffle size={13} />
                </button>
                <button
                  type="button"
                  className="os-btn os-icon-btn os-hide-mobile"
                  onClick={() =>
                    setSequenceMode((m) =>
                      m === 'cycle' ? 'random' : m === 'random' ? 'locked' : 'cycle'
                    )
                  }
                  title="Cycle transition sequence mode"
                >
                  <Repeat size={12} />
                  {sequenceMode === 'cycle'
                    ? `Cycle 1-${TRANSITION_MODES.length}`
                    : sequenceMode === 'random'
                      ? 'Rand FX'
                      : 'Locked'}
                </button>
              </div>

              <div className="os-controls-group">
                <button
                  type="button"
                  className="os-active-fx-readout"
                  onClick={() =>
                    stepSlide(1, (activeMode + 1) % TRANSITION_MODES.length, 'HUD FX cycle')
                  }
                  title="Click to fire next transition shader"
                >
                  <span className="os-active-fx-code" style={{ color: activeModeInfo.accent }}>
                    FX {activeModeInfo.code}
                  </span>
                  <span style={{ color: '#e2e8f0' }}>{activeModeInfo.shortName}</span>
                </button>

                <button
                  type="button"
                  className="os-btn os-icon-btn"
                  onClick={cyclePhotoStyle}
                  title={`Photo Style: ${currentStyleInfo.note} (click to cycle)`}
                >
                  <Palette size={12} color={currentStyleInfo.swatch} />
                  <span className="os-hide-mobile">{currentStyleInfo.name}</span>
                </button>

                <button
                  type="button"
                  className="os-btn os-icon-btn os-hide-mobile"
                  onClick={cycleEmergenceMode}
                  title={`Emergence Mode: ${currentEmergeInfo.description} (click to cycle)`}
                >
                  <Droplets size={12} color="#5eead4" />
                  <span>{currentEmergeInfo.name}</span>
                </button>

                <button
                  type="button"
                  className={`os-btn os-icon-btn os-icon-btn--square ${cmdRowOpen ? 'os-btn-active' : ''}`}
                  aria-label="Toggle command input"
                  title="Toggle prompt command input"
                  onClick={() => setCmdRowOpen((v) => !v)}
                >
                  <Terminal size={13} />
                </button>

                <button
                  type="button"
                  className="os-btn os-icon-btn os-icon-btn--square"
                  aria-label="Hide HUD (Zen mode)"
                  title="Cinema / Zen mode (H)"
                  onClick={() => setZenMode(true)}
                >
                  <EyeOff size={14} />
                </button>
              </div>
            </div>

            {cmdRowOpen && (
              <div className="os-microhud-row" style={{ gap: 10 }}>
                <form
                  className="os-cmd-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCommand(cmdInput);
                    setCmdInput('');
                  }}
                >
                  <Terminal size={12} color="#38bdf8" />
                  <input
                    type="text"
                    className="os-cmd-input"
                    value={cmdInput}
                    onChange={(e) => setCmdInput(e.target.value)}
                    placeholder='Cmd: "flip", "style kodachrome", "emerge liquid", "ink", "prism", "fx 11", "record"...'
                    aria-label="Matrix OS command input"
                  />
                  <button type="submit" className="os-cmd-run">
                    Run
                  </button>
                </form>

                <div className="os-microhud-telemetry" aria-label="System telemetry">
                  <span>{telemetry.fps} FPS</span>
                  <span aria-hidden="true">·</span>
                  <span>{telemetry.resScale.toFixed(2)}x</span>
                  <span aria-hidden="true">·</span>
                  <span>{telemetry.awarenessNodes} nodes</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    className="os-btn os-icon-btn"
                    style={{ height: 22, padding: '0 7px', fontSize: 10 }}
                    onClick={() => setOverdriveActive((v) => !v)}
                  >
                    <Flame size={11} /> {overdriveActive ? 'Stop Sweep' : 'Sweep All'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </footer>
      ) : (
        <button
          type="button"
          className="os-zen-restore"
          onClick={() => setZenMode(false)}
          aria-label="Restore Matrix Slide OS controls"
        >
          <Eye size={14} /> Show Controls (H)
        </button>
      )}

      {/* Full-viewport Drag & Drop File Overlay */}
      {isDraggingFiles && (
        <div className="dropzone-overlay">
          <Upload size={36} color="#38bdf8" />
          <div className="dropzone-title">Drop Images, PDFs, Text Docs or Audio into Matrix</div>
          <div className="dropzone-sub">
            Supports PDF flipbooks, TXT/MD/JSON library texts, JPG/PNG/WebP images & MP3/WAV/OGG audio
          </div>
        </div>
      )}

      {!zenMode && (
        <HyperSymmetricSidePanel
          open={sidePanelOpen}
          activeTab={sideTab}
          onToggleOpen={() => setSidePanelOpen((v) => !v)}
          onChangeTab={setSideTab}
          designConfig={designConfig}
          onChangeDesign={(next) => setDesignConfig((prev) => ({ ...prev, ...next }))}
          activeMode={activeMode}
          photoStyle={params.photoStyle}
          emergenceMode={params.emergenceMode}
          onTriggerMode={(modeId) => stepSlide(1, modeId, `Design Matrix FX ${modeId + 1}`)}
          onChangePhotoStyle={(style) => setParams((p) => ({ ...p, photoStyle: style }))}
          onChangeEmergence={(em) => setParams((p) => ({ ...p, emergenceMode: em }))}
          liveProg={liveProg}
          liveFoldY={liveFoldY}
          liveFrames={liveFrames}
          sequences={memorySequences}
          onScrubFrame={handleScrubFrame}
          onReplaySequence={handleReplaySequence}
          memoryNodes={memoryNodes}
          memoryUpdatedAt={memoryUpdatedAt}
          memoryQuery={memoryQuery}
          onSearchMemory={(q) => void handleSearchMemory(q)}
          onTranscribeCurrent={(enrich) => void handleTranscribeCurrent(enrich)}
          onClearMemory={() => void handleClearMemory()}
          slides={slides}
          googleUser={googleUser}
          hasDriveToken={hasDriveToken}
          authBusy={authBusy}
          onGoogleSignIn={() => void handleGoogleSignIn()}
          onGoogleLogout={() => void handleGoogleLogout()}
          driveFiles={driveFiles}
          driveBusy={driveBusy}
          libraryMatrix={libraryMatrix}
          analysisResult={analysisResult}
          onScanDriveFiles={() => void handleScanDriveFiles()}
          onProcessDriveFile={(f) => void handleProcessDriveFile(f)}
          onAutoProcessStoredText={() => void handleAutoProcessStoredText()}
          onUploadLibraryText={(file) => void handleUploadLibraryText(file)}
          onRequestSaveLibraryToDrive={() =>
            setConfirmDriveModal({ open: true, actionType: driveMatrixFileId ? 'update' : 'create' })
          }
          onPullLibraryFromDrive={() => void handlePullLibraryFromDrive()}
          onAnalyzeLibrary={(q) => void handleAnalyzeLibrary(q)}
        />
      )}

      <ConfirmDriveModal
        open={confirmDriveModal.open}
        fileName={LIBRARY_MATRIX_FILENAME}
        actionType={confirmDriveModal.actionType}
        eventCount={libraryMatrix?.events.length || 0}
        summary={libraryMatrix?.summary || ''}
        onConfirm={() => void handleConfirmSaveToDrive()}
        onCancel={() => setConfirmDriveModal((m) => ({ ...m, open: false }))}
      />

      {contextLost && (
        <div
          style={{
            position: 'fixed',
            top: 64,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            padding: '8px 14px',
            borderRadius: 8,
            background: 'rgba(127, 29, 29, 0.92)',
            border: '1px solid #f87171',
            fontSize: 12,
          }}
        >
          WebGL2 context interrupted — restoring shader pipeline...
        </div>
      )}
    </div>
  );
};

export default App;
