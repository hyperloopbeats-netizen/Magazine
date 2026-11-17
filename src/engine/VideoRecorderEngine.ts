import { RecordedClip, VideoAspectPreset } from '../types/matrix';

export interface StartRecordingOptions {
  aspect: VideoAspectPreset;
  fps: 30 | 60;
  bitrateMbps: number;
  burnTitle: boolean;
  getCurrentTitle?: () => string;
  audioStream: MediaStream | null;
  onTick?: (elapsedSec: number) => void;
}

function getDimensionsForPreset(preset: VideoAspectPreset, isEco: boolean): { width: number; height: number } {
  if (preset === '16:9') {
    return isEco ? { width: 1280, height: 720 } : { width: 1920, height: 1080 };
  }
  if (preset === '9:16') {
    return isEco ? { width: 720, height: 1280 } : { width: 1080, height: 1920 };
  }
  if (preset === '1:1') {
    return isEco ? { width: 720, height: 720 } : { width: 1080, height: 1080 };
  }
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
  const maxDim = isEco ? 1280 : 1920;
  const scale = Math.min(1, maxDim / Math.max(vw, vh));
  const even = (n: number) => Math.max(2, Math.floor((n * scale) / 2) * 2);
  return { width: even(vw), height: even(vh) };
}

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'video/webm';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

export class VideoRecorderEngine {
  private matrixCanvas: HTMLCanvasElement;
  private overlayCanvas: HTMLCanvasElement | null;
  private compCanvas: HTMLCanvasElement;
  private compCtx: CanvasRenderingContext2D | null;

  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private rafId = 0;
  private startTime = 0;
  private activeStream: MediaStream | null = null;
  private isRecording = false;
  private currentOptions: StartRecordingOptions | null = null;
  private targetDims = { width: 1280, height: 720 };
  private stopResolver: ((clip: RecordedClip | null) => void) | null = null;

  constructor(matrixCanvas: HTMLCanvasElement, overlayCanvas: HTMLCanvasElement | null) {
    this.matrixCanvas = matrixCanvas;
    this.overlayCanvas = overlayCanvas;
    this.compCanvas = document.createElement('canvas');
    this.compCtx = this.compCanvas.getContext('2d', { alpha: false });
  }

  public get recording(): boolean {
    return this.isRecording;
  }

  public start(options: StartRecordingOptions, isEco = false): boolean {
    if (this.isRecording || typeof MediaRecorder === 'undefined' || !this.compCtx) {
      return false;
    }

    this.currentOptions = options;
    this.targetDims = getDimensionsForPreset(options.aspect, isEco);
    this.compCanvas.width = this.targetDims.width;
    this.compCanvas.height = this.targetDims.height;
    this.chunks = [];

    // Paint initial frame synchronously before captureStream begins
    this.compositeFrame();

    const canvasStream = this.compCanvas.captureStream(options.fps);
    const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
    if (options.audioStream) {
      options.audioStream.getAudioTracks().forEach((t) => tracks.push(t));
    }

    this.activeStream = new MediaStream(tracks);
    const mimeType = pickSupportedMimeType();

    try {
      this.recorder = new MediaRecorder(this.activeStream, {
        mimeType,
        videoBitsPerSecond: Math.max(1_500_000, options.bitrateMbps * 1_000_000),
      });
    } catch {
      this.recorder = new MediaRecorder(this.activeStream);
    }

    this.recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.recorder.onstop = () => {
      const durationSec = Math.max(0.2, (performance.now() - this.startTime) / 1000);
      const finalMime = this.recorder?.mimeType || mimeType || 'video/webm';
      const blob = new Blob(this.chunks, { type: finalMime });
      const url = URL.createObjectURL(blob);
      const clip: RecordedClip = {
        id: `clip_${Date.now()}`,
        name: `Matrix_Video_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}`,
        url,
        blob,
        durationSec,
        width: this.targetDims.width,
        height: this.targetDims.height,
        mimeType: finalMime,
        aspect: options.aspect,
        createdAt: Date.now(),
      };
      this.cleanupStream();
      const resolve = this.stopResolver;
      this.stopResolver = null;
      resolve?.(clip);
    };

    this.startTime = performance.now();
    this.isRecording = true;
    this.recorder.start(250);
    this.loop();
    return true;
  }

  public stop(): Promise<RecordedClip | null> {
    if (!this.isRecording || !this.recorder) {
      return Promise.resolve(null);
    }
    this.isRecording = false;
    cancelAnimationFrame(this.rafId);

    return new Promise<RecordedClip | null>((resolve) => {
      this.stopResolver = resolve;
      try {
        if (this.recorder && this.recorder.state !== 'inactive') {
          this.recorder.stop();
        } else {
          this.cleanupStream();
          resolve(null);
        }
      } catch {
        this.cleanupStream();
        resolve(null);
      }
    });
  }

  private drawCoverLayer(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, dw: number, dh: number) {
    const sw = src.width;
    const sh = src.height;
    if (sw <= 0 || sh <= 0) return;

    const srcAspect = sw / sh;
    const dstAspect = dw / dh;
    let cropW = sw;
    let cropH = sh;
    let sx = 0;
    let sy = 0;

    if (srcAspect > dstAspect) {
      cropW = sh * dstAspect;
      sx = (sw - cropW) * 0.5;
    } else {
      cropH = sw / dstAspect;
      sy = (sh - cropH) * 0.5;
    }

    ctx.drawImage(src, sx, sy, cropW, cropH, 0, 0, dw, dh);
  }

  private compositeFrame() {
    const ctx = this.compCtx;
    if (!ctx) return;
    const { width: dw, height: dh } = this.targetDims;

    ctx.fillStyle = '#07090f';
    ctx.fillRect(0, 0, dw, dh);

    try {
      this.drawCoverLayer(ctx, this.matrixCanvas, dw, dh);
      if (this.overlayCanvas) {
        this.drawCoverLayer(ctx, this.overlayCanvas, dw, dh);
      }
    } catch {
      // Ignore transient resize frame
    }

    if (this.currentOptions?.burnTitle && this.currentOptions.getCurrentTitle) {
      const title = this.currentOptions.getCurrentTitle();
      if (title) {
        ctx.save();
        ctx.font = `600 ${Math.round(dh * 0.022)}px "Outfit", sans-serif`;
        const padX = 18;
        const padY = 12;
        const textW = ctx.measureText(title).width;
        const boxX = 28;
        const boxH = Math.round(dh * 0.045);
        const boxY = dh - boxH - 28;

        ctx.fillStyle = 'rgba(7, 9, 15, 0.72)';
        ctx.fillRect(boxX, boxY, textW + padX * 2, boxH);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(boxX, boxY, textW + padX * 2, boxH);

        ctx.fillStyle = '#f1f5f9';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, boxX + padX, boxY + boxH * 0.5 + 1);
        ctx.restore();
      }
    }
  }

  private loop = () => {
    if (!this.isRecording) return;
    this.rafId = requestAnimationFrame(this.loop);
    this.compositeFrame();
    const elapsed = (performance.now() - this.startTime) / 1000;
    this.currentOptions?.onTick?.(elapsed);
  };

  private cleanupStream() {
    if (this.activeStream) {
      this.activeStream.getVideoTracks().forEach((t) => t.stop());
      this.activeStream = null;
    }
    this.recorder = null;
  }

  public static downloadClip(clip: RecordedClip) {
    const ext = clip.mimeType.includes('mp4') ? 'mp4' : 'webm';
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = clip.url;
    a.download = `${clip.name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 600);
  }

  public destroy() {
    if (this.isRecording) {
      void this.stop();
    }
    cancelAnimationFrame(this.rafId);
    this.cleanupStream();
  }
}
