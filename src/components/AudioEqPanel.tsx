import React from 'react';
import { Download, Music, Radio, Square } from 'lucide-react';
import { EQ_PRESETS, EqParams, EqPresetKey } from '../engine/AudioEngine';
import { AudioMetrics } from '../types/matrix';

interface AudioEqPanelProps {
  trackName: string;
  isPlaying: boolean;
  isSynthMode: boolean;
  eqParams: EqParams;
  audioReactivity: number;
  metrics: AudioMetrics;
  spectrumCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onUploadAudio: () => void;
  onToggleSynth: () => void;
  onStopAudio: () => void;
  onApplyPreset: (key: EqPresetKey) => void;
  onChangeEq: (next: Partial<EqParams>) => void;
  onChangeReactivity: (val: number) => void;
  onExportWav: () => void;
}

export const AudioEqPanel: React.FC<AudioEqPanelProps> = ({
  trackName,
  isPlaying,
  isSynthMode,
  eqParams,
  audioReactivity,
  metrics,
  spectrumCanvasRef,
  onUploadAudio,
  onToggleSynth,
  onStopAudio,
  onApplyPreset,
  onChangeEq,
  onChangeReactivity,
  onExportWav,
}) => {
  return (
    <>
      <div className="panel-section">
        <div className="panel-label-row">
          <span className="panel-heading">Audio Source</span>
          <span
            className="font-mono"
            style={{
              fontSize: 10.5,
              color: isPlaying ? '#34d399' : '#64748b',
              maxWidth: 190,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {trackName}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="os-btn os-icon-btn" style={{ flex: 1 }} onClick={onUploadAudio}>
            <Music size={13} /> Load Audio
          </button>
          <button
            type="button"
            className={`os-btn os-icon-btn ${isSynthMode && isPlaying ? 'os-btn-active' : ''}`}
            style={{ flex: 1 }}
            onClick={onToggleSynth}
          >
            <Radio size={13} /> {isSynthMode && isPlaying ? 'Synth Active' : 'Ambient Synth'}
          </button>
          {isPlaying && (
            <button
              type="button"
              className="os-btn os-icon-btn os-icon-btn--square"
              aria-label="Stop audio"
              onClick={onStopAudio}
            >
              <Square size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-label-row">
          <span className="panel-heading">Live FFT Spectrum</span>
          <span className="font-mono" style={{ fontSize: 10, color: '#94a3b8' }}>
            B:{Math.round(metrics.bass * 100)} M:{Math.round(metrics.mids * 100)} T:{Math.round(metrics.treble * 100)}
          </span>
        </div>
        <canvas ref={spectrumCanvasRef} width={340} height={82} className="spectrum-canvas" />
      </div>

      <div className="panel-section">
        <span className="panel-heading">EQ Presets</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {(Object.keys(EQ_PRESETS) as EqPresetKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className="os-btn os-icon-btn"
              onClick={() => onApplyPreset(key)}
            >
              {EQ_PRESETS[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <span className="panel-heading">WaveShaper & 3-Band EQ</span>

        <div className="slider-row">
          <span style={{ color: '#fbbf24' }}>Tube Drive</span>
          <input
            type="range"
            className="os-slider"
            min={0}
            max={100}
            step={1}
            value={eqParams.drive}
            onChange={(e) => onChangeEq({ drive: parseFloat(e.target.value) })}
            aria-label="Tube Drive"
          />
          <span className="slider-val">{eqParams.drive}%</span>
        </div>

        <div className="slider-row">
          <span style={{ color: '#94a3b8' }}>Low 100Hz</span>
          <input
            type="range"
            className="os-slider"
            min={-15}
            max={15}
            step={0.5}
            value={eqParams.low}
            onChange={(e) => onChangeEq({ low: parseFloat(e.target.value) })}
            aria-label="Low band EQ"
          />
          <span className="slider-val">{eqParams.low > 0 ? `+${eqParams.low}` : eqParams.low}dB</span>
        </div>

        <div className="slider-row">
          <span style={{ color: '#94a3b8' }}>Mid 1kHz</span>
          <input
            type="range"
            className="os-slider"
            min={-15}
            max={15}
            step={0.5}
            value={eqParams.mid}
            onChange={(e) => onChangeEq({ mid: parseFloat(e.target.value) })}
            aria-label="Mid band EQ"
          />
          <span className="slider-val">{eqParams.mid > 0 ? `+${eqParams.mid}` : eqParams.mid}dB</span>
        </div>

        <div className="slider-row">
          <span style={{ color: '#94a3b8' }}>High 8kHz</span>
          <input
            type="range"
            className="os-slider"
            min={-15}
            max={15}
            step={0.5}
            value={eqParams.high}
            onChange={(e) => onChangeEq({ high: parseFloat(e.target.value) })}
            aria-label="High band EQ"
          />
          <span className="slider-val">{eqParams.high > 0 ? `+${eqParams.high}` : eqParams.high}dB</span>
        </div>

        <div className="slider-row">
          <span style={{ color: '#38bdf8' }}>Visual Pulse</span>
          <input
            type="range"
            className="os-slider"
            min={0}
            max={1.5}
            step={0.05}
            value={audioReactivity}
            onChange={(e) => onChangeReactivity(parseFloat(e.target.value))}
            aria-label="Audio reactivity strength"
          />
          <span className="slider-val">{Math.round(audioReactivity * 100)}%</span>
        </div>
      </div>

      <button type="button" className="os-btn os-icon-btn os-btn-active" onClick={onExportWav}>
        <Download size={13} /> Export Processed WAV-HD
      </button>
    </>
  );
};
