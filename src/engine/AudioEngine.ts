import { AudioMetrics } from '../types/matrix';

export type EqPresetKey = 'warm' | 'space' | 'solar' | 'cyber';

export interface EqParams {
  drive: number; // 0..100
  low: number; // -15..15
  mid: number; // -15..15
  high: number; // -15..15
}

export const EQ_PRESETS: Record<EqPresetKey, EqParams & { label: string }> = {
  warm: { drive: 22, low: 4.5, mid: 1.0, high: -1.5, label: 'Warm Velvet' },
  space: { drive: 8, low: -1.0, mid: -2.5, high: 6.0, label: 'Deep Space' },
  solar: { drive: 68, low: 5.5, mid: 3.5, high: 3.0, label: 'Solar Flare' },
  cyber: { drive: 42, low: 2.5, mid: 5.0, high: 4.0, label: 'Cyber Drive' },
};

export class SovereignAudioEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private audioBuffer: AudioBuffer | null = null;

  private synthOscs: OscillatorNode[] = [];
  private synthGain: GainNode | null = null;
  private synthFilter: BiquadFilterNode | null = null;
  private lfoOsc: OscillatorNode | null = null;

  private driveNode: WaveShaperNode | null = null;
  private lowShelf: BiquadFilterNode | null = null;
  private midPeak: BiquadFilterNode | null = null;
  private highShelf: BiquadFilterNode | null = null;

  private params: EqParams = { drive: 15, low: 0, mid: 0, high: 0 };
  private volume = 0.85;
  private metrics: AudioMetrics = { bass: 0, mids: 0, treble: 0, beatDetected: false };
  private freqBuffer: Uint8Array | null = null;
  private prevBass = 0;
  private lastBeatTime = 0;
  private healIntervalId = 0;

  public isPlaying = false;
  public isSynthMode = false;
  public trackName = 'No Audio Loaded';
  public onAutoHealed?: () => void;

  constructor(onAutoHealed?: () => void) {
    this.onAutoHealed = onAutoHealed;
    // Resilient Audio State Observer (Cometic 2.0 protocol)
    this.healIntervalId = window.setInterval(() => {
      if (this.ctx && this.ctx.state === 'suspended' && this.isPlaying) {
        void this.ctx.resume().then(() => {
          this.onAutoHealed?.();
        });
      }
    }, 2000);
  }

  private async ensureContext() {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ sampleRate: 44100 });
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  private stopActiveSources() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch {
        // ignore already stopped
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.synthOscs.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // ignore
      }
      osc.disconnect();
    });
    this.synthOscs = [];
    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
      } catch {
        // ignore
      }
      this.lfoOsc.disconnect();
      this.lfoOsc = null;
    }
    if (this.synthGain) {
      this.synthGain.disconnect();
      this.synthGain = null;
    }
    if (this.synthFilter) {
      this.synthFilter.disconnect();
      this.synthFilter = null;
    }
  }

  private async setupGraph() {
    await this.ensureContext();
    this.stopActiveSources();
    if (!this.ctx) return;

    this.driveNode = this.ctx.createWaveShaper();
    this.driveNode.curve = this.buildDriveCurve(this.params.drive);

    this.lowShelf = this.ctx.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 100;
    this.lowShelf.gain.value = this.params.low;

    this.midPeak = this.ctx.createBiquadFilter();
    this.midPeak.type = 'peaking';
    this.midPeak.frequency.value = 1000;
    this.midPeak.Q.value = 1.5;
    this.midPeak.gain.value = this.params.mid;

    this.highShelf = this.ctx.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 8000;
    this.highShelf.gain.value = this.params.high;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.freqBuffer = new Uint8Array(this.analyser.frequencyBinCount);

    if (!this.streamDest) {
      this.streamDest = this.ctx.createMediaStreamDestination();
    }

    this.driveNode.connect(this.lowShelf);
    this.lowShelf.connect(this.midPeak);
    this.midPeak.connect(this.highShelf);
    this.highShelf.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.analyser.connect(this.streamDest);
  }

  public getCaptureStream(): MediaStream | null {
    return this.isPlaying && this.streamDest ? this.streamDest.stream : null;
  }

  public setMasterVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  private buildDriveCurve(amount: number): Float32Array {
    const k = amount;
    const n = 44100;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  public setParams(next: Partial<EqParams>) {
    this.params = { ...this.params, ...next };
    if (next.drive !== undefined && this.driveNode) {
      this.driveNode.curve = this.buildDriveCurve(next.drive);
    }
    if (next.low !== undefined && this.lowShelf) {
      this.lowShelf.gain.value = next.low;
    }
    if (next.mid !== undefined && this.midPeak) {
      this.midPeak.gain.value = next.mid;
    }
    if (next.high !== undefined && this.highShelf) {
      this.highShelf.gain.value = next.high;
    }
  }

  public getParams(): EqParams {
    return { ...this.params };
  }

  public async loadAudioFile(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    await this.setupGraph();
    if (!this.ctx || !this.driveNode) throw new Error('Audio context unavailable');

    this.audioBuffer = await this.ctx.decodeAudioData(buffer);
    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.loop = true;
    this.sourceNode.connect(this.driveNode);
    this.sourceNode.start(0);

    this.isPlaying = true;
    this.isSynthMode = false;
    this.trackName = file.name;
    return file.name;
  }

  public async toggleSynth(): Promise<boolean> {
    if (this.isPlaying && this.isSynthMode) {
      this.stopActiveSources();
      this.isPlaying = false;
      this.isSynthMode = false;
      this.trackName = 'No Audio Loaded';
      return false;
    }

    await this.setupGraph();
    if (!this.ctx || !this.driveNode) return false;

    this.synthFilter = this.ctx.createBiquadFilter();
    this.synthFilter.type = 'lowpass';
    this.synthFilter.frequency.value = 620;
    this.synthFilter.Q.value = 2.4;

    this.synthGain = this.ctx.createGain();
    this.synthGain.gain.value = 0.22;

    const freqs = [110, 164.81, 220, 277.18];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.synthFilter) return;
      const osc = this.ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.value = f;
      osc.detune.value = (idx - 1.5) * 6;
      osc.connect(this.synthFilter);
      osc.start();
      this.synthOscs.push(osc);
    });

    this.lfoOsc = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    this.lfoOsc.frequency.value = 0.25;
    lfoGain.gain.value = 340;
    this.lfoOsc.connect(lfoGain);
    lfoGain.connect(this.synthFilter.frequency);
    this.lfoOsc.start();

    this.synthFilter.connect(this.synthGain);
    this.synthGain.connect(this.driveNode);

    this.isPlaying = true;
    this.isSynthMode = true;
    this.trackName = 'Harmonic Ambient Synth';
    return true;
  }

  public stop() {
    this.stopActiveSources();
    this.isPlaying = false;
    this.isSynthMode = false;
    this.trackName = 'No Audio Loaded';
  }

  public sampleMetrics(): { metrics: AudioMetrics; bins: Uint8Array | null } {
    if (!this.analyser || !this.isPlaying || !this.freqBuffer) {
      this.metrics.bass *= 0.88;
      this.metrics.mids *= 0.88;
      this.metrics.treble *= 0.88;
      this.metrics.beatDetected = false;
      return { metrics: this.metrics, bins: null };
    }

    this.analyser.getByteFrequencyData(this.freqBuffer);
    const data = this.freqBuffer;

    let bassSum = 0;
    for (let i = 0; i < 4; i++) bassSum += data[i];
    const bass = bassSum / (4 * 255);

    let midSum = 0;
    for (let i = 4; i < 20; i++) midSum += data[i];
    const mids = midSum / (16 * 255);

    let trebSum = 0;
    for (let i = 20; i < 45; i++) trebSum += data[i];
    const treble = trebSum / (25 * 255);

    const now = performance.now();
    const beatDetected = bass - this.prevBass > 0.14 && bass > 0.42 && now - this.lastBeatTime > 900;
    if (beatDetected) {
      this.lastBeatTime = now;
    }
    this.prevBass = bass;

    this.metrics = { bass, mids, treble, beatDetected };
    return { metrics: this.metrics, bins: data };
  }

  public async exportWavHD(): Promise<void> {
    let bufferToRender = this.audioBuffer;
    if (!bufferToRender) {
      const tempCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      bufferToRender = tempCtx.createBuffer(2, tempCtx.sampleRate * 5, tempCtx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = bufferToRender.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.sin((i * 2 * Math.PI * 220) / tempCtx.sampleRate) * 0.25;
        }
      }
      await tempCtx.close();
    }

    const sampleRate = 44100;
    const duration = Math.min(bufferToRender.duration, 10);
    const offlineCtx = new OfflineAudioContext(2, Math.floor(sampleRate * duration), sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = bufferToRender;
    source.loop = true;

    const drive = offlineCtx.createWaveShaper();
    drive.curve = this.buildDriveCurve(this.params.drive);

    const low = offlineCtx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 100;
    low.gain.value = this.params.low;

    const mid = offlineCtx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.gain.value = this.params.mid;

    const high = offlineCtx.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 8000;
    high.gain.value = this.params.high;

    source.connect(drive);
    drive.connect(low);
    low.connect(mid);
    mid.connect(high);
    high.connect(offlineCtx.destination);
    source.start(0);

    const rendered = await offlineCtx.startRendering();
    const wavBlob = this.bufferToWave(rendered, rendered.length);
    const url = URL.createObjectURL(wavBlob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `Matrix_Slide_Audio_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 800);
  }

  private bufferToWave(abuffer: AudioBuffer, len: number): Blob {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    let pos = 0;

    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(pos++, str.charCodeAt(i));
    };

    writeString('RIFF');
    view.setUint32(pos, length - 8, true);
    pos += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(pos, 16, true);
    pos += 4;
    view.setUint16(pos, 1, true);
    pos += 2;
    view.setUint16(pos, numOfChan, true);
    pos += 2;
    view.setUint32(pos, abuffer.sampleRate, true);
    pos += 4;
    view.setUint32(pos, abuffer.sampleRate * 2 * numOfChan, true);
    pos += 4;
    view.setUint16(pos, numOfChan * 2, true);
    pos += 2;
    view.setUint16(pos, 16, true);
    pos += 2;
    writeString('data');
    view.setUint32(pos, length - pos - 4, true);
    pos += 4;

    const channels: Float32Array[] = [];
    for (let i = 0; i < numOfChan; i++) channels.push(abuffer.getChannelData(i));

    let offset = 0;
    while (offset < len) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 32768 : sample * 32767;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  public destroy() {
    clearInterval(this.healIntervalId);
    this.stopActiveSources();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
