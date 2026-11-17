import React from 'react';
import {
  Circle,
  Download,
  Film,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Video,
  Zap,
} from 'lucide-react';
import { VideoRecorderEngine } from '../engine/VideoRecorderEngine';
import {
  DigitalSunConfig,
  RecordedClip,
  StageVisualMode,
  VideoAspectPreset,
} from '../types/matrix';

interface VideoStudioPanelProps {
  isRecording: boolean;
  recordingElapsed: number;
  autoRenderActive: boolean;
  autoRenderRemaining: number;
  aspect: VideoAspectPreset;
  fps: 30 | 60;
  bitrateMbps: number;
  burnTitle: boolean;
  autoSlidesCount: number;
  stageMode: StageVisualMode;
  sunConfig: DigitalSunConfig;
  clips: RecordedClip[];
  onChangeAspect: (preset: VideoAspectPreset) => void;
  onChangeFps: (fps: 30 | 60) => void;
  onChangeBitrate: (mbps: number) => void;
  onToggleBurnTitle: () => void;
  onChangeAutoSlidesCount: (n: number) => void;
  onToggleLiveRecording: () => void;
  onStartAutoRender: () => void;
  onChangeStageMode: (mode: StageVisualMode) => void;
  onUpdateSunConfig: (next: Partial<DigitalSunConfig>) => void;
  onFireShockwave: () => void;
  onDeleteClip: (id: string) => void;
}

const ASPECT_OPTIONS: Array<{ id: VideoAspectPreset; label: string }> = [
  { id: 'fullscreen', label: 'Native Full' },
  { id: '16:9', label: '16:9 HD' },
  { id: '9:16', label: '9:16 Reels' },
  { id: '1:1', label: '1:1 Square' },
];

export const VideoStudioPanel: React.FC<VideoStudioPanelProps> = ({
  isRecording,
  recordingElapsed,
  autoRenderActive,
  autoRenderRemaining,
  aspect,
  fps,
  bitrateMbps,
  burnTitle,
  autoSlidesCount,
  stageMode,
  sunConfig,
  clips,
  onChangeAspect,
  onChangeFps,
  onChangeBitrate,
  onToggleBurnTitle,
  onChangeAutoSlidesCount,
  onToggleLiveRecording,
  onStartAutoRender,
  onChangeStageMode,
  onUpdateSunConfig,
  onFireShockwave,
  onDeleteClip,
}) => {
  return (
    <>
      {/* Stage Visual Mode & Digital Sun Core */}
      <div className="panel-section">
        <div className="panel-label-row">
          <span className="panel-heading">Stage Render Pipeline</span>
          <button
            type="button"
            className="os-btn os-icon-btn"
            style={{ height: 22, padding: '0 8px', fontSize: 10.5 }}
            onClick={onFireShockwave}
          >
            <Zap size={11} color="#38bdf8" /> Shockwave
          </button>
        </div>

        <div className="seg-group" role="group" aria-label="Stage Visual Mode">
          {(
            [
              { id: 'slides', label: 'Slide Matrix' },
              { id: 'hybrid', label: 'Hybrid Sun' },
              { id: 'fractal', label: 'Digital Sun' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              className={`seg-btn ${stageMode === m.id ? 'seg-btn--active' : ''}`}
              onClick={() => onChangeStageMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {stageMode !== 'slides' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: 8,
              borderRadius: 8,
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#fcd34d', fontWeight: 600 }}>
              <Sun size={12} /> Digital Sun Fractal Core
            </div>

            {stageMode === 'hybrid' && (
              <div className="slider-row">
                <span style={{ color: '#cbd5e1' }}>Sun Blend</span>
                <input
                  type="range"
                  className="os-slider"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={sunConfig.blend}
                  onChange={(e) => onUpdateSunConfig({ blend: parseFloat(e.target.value) })}
                  aria-label="Digital Sun blend strength"
                />
                <span className="slider-val">{Math.round(sunConfig.blend * 100)}%</span>
              </div>
            )}

            <div className="slider-row">
              <span style={{ color: '#cbd5e1' }}>Fractal Depth</span>
              <input
                type="range"
                className="os-slider"
                min={2}
                max={10}
                step={0.5}
                value={sunConfig.depth}
                onChange={(e) => onUpdateSunConfig({ depth: parseFloat(e.target.value) })}
                aria-label="Fractal depth iterations"
              />
              <span className="slider-val">{sunConfig.depth.toFixed(1)}</span>
            </div>

            <div className="slider-row">
              <span style={{ color: '#cbd5e1' }}>Spiral Arms</span>
              <input
                type="range"
                className="os-slider"
                min={1}
                max={8}
                step={0.5}
                value={sunConfig.arms}
                onChange={(e) => onUpdateSunConfig({ arms: parseFloat(e.target.value) })}
                aria-label="Spiral arm frequency"
              />
              <span className="slider-val">{sunConfig.arms.toFixed(1)}</span>
            </div>

            <div className="slider-row">
              <span style={{ color: '#cbd5e1' }}>Orbital Speed</span>
              <input
                type="range"
                className="os-slider"
                min={0.1}
                max={2.5}
                step={0.1}
                value={sunConfig.speed}
                onChange={(e) => onUpdateSunConfig({ speed: parseFloat(e.target.value) })}
                aria-label="Orbital velocity"
              />
              <span className="slider-val">{sunConfig.speed.toFixed(1)}x</span>
            </div>
          </div>
        )}
      </div>

      {/* App-to-Video Capture Configuration */}
      <div className="panel-section">
        <div className="panel-label-row">
          <span className="panel-heading">App-to-Video Capture</span>
          <span
            className="font-mono"
            style={{ fontSize: 11, color: isRecording ? '#f87171' : '#94a3b8' }}
          >
            {isRecording
              ? autoRenderActive
                ? `AUTO ${autoRenderRemaining} LEFT · ${recordingElapsed.toFixed(1)}s`
                : `REC · ${recordingElapsed.toFixed(1)}s`
              : 'Clean HUD-Free Stream'}
          </span>
        </div>

        <div className="seg-group" role="group" aria-label="Video Aspect Format">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={isRecording}
              className={`seg-btn ${aspect === opt.id ? 'seg-btn--active' : ''}`}
              onClick={() => onChangeAspect(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div className="seg-group" role="group" aria-label="Capture Frame Rate">
            {([30, 60] as const).map((f) => (
              <button
                key={f}
                type="button"
                disabled={isRecording}
                className={`seg-btn ${fps === f ? 'seg-btn--active' : ''}`}
                onClick={() => onChangeFps(f)}
              >
                {f} FPS
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={isRecording}
            className={`os-btn os-icon-btn ${burnTitle ? 'os-btn-active' : ''}`}
            onClick={onToggleBurnTitle}
          >
            Title Slate: {burnTitle ? 'On' : 'Off'}
          </button>
        </div>

        <div className="slider-row">
          <span style={{ color: '#94a3b8' }}>Bitrate</span>
          <input
            type="range"
            className="os-slider"
            disabled={isRecording}
            min={2}
            max={16}
            step={1}
            value={bitrateMbps}
            onChange={(e) => onChangeBitrate(parseInt(e.target.value, 10))}
            aria-label="Video capture bitrate Mbps"
          />
          <span className="slider-val">{bitrateMbps} Mbps</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button
            type="button"
            className={`os-btn os-icon-btn ${isRecording ? 'os-btn-record-active' : 'os-btn-active'}`}
            onClick={onToggleLiveRecording}
          >
            {isRecording ? <Square size={12} /> : <Circle size={12} fill="#ef4444" color="#ef4444" />}
            {isRecording ? 'Stop & Save' : 'Record Live'}
          </button>

          <button
            type="button"
            disabled={isRecording}
            className="os-btn os-icon-btn"
            onClick={onStartAutoRender}
            title="Automatically advance and record N slides to video"
          >
            <Film size={13} /> Auto-Render ({autoSlidesCount})
          </button>
        </div>

        <div className="slider-row">
          <span style={{ color: '#94a3b8' }}>Auto Slides</span>
          <input
            type="range"
            className="os-slider"
            disabled={isRecording}
            min={3}
            max={20}
            step={1}
            value={autoSlidesCount}
            onChange={(e) => onChangeAutoSlidesCount(parseInt(e.target.value, 10))}
            aria-label="Number of slides for auto video render"
          />
          <span className="slider-val">{autoSlidesCount} slides</span>
        </div>
      </div>

      {/* Recorded Video Library */}
      <div className="panel-section">
        <div className="panel-label-row">
          <span className="panel-heading">Rendered Videos ({clips.length})</span>
          <span className="font-mono" style={{ fontSize: 10, color: '#64748b' }}>
            WebGL2 + 3D + Audio
          </span>
        </div>

        {clips.length === 0 ? (
          <div
            style={{
              padding: '14px 10px',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 11.5,
              color: '#94a3b8',
              textAlign: 'center',
            }}
          >
            <Video size={16} style={{ margin: '0 auto 6px', display: 'block', color: '#38bdf8' }} />
            Record live interaction or Auto-Render slides above to preview & download HD video.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clips.map((clip) => (
              <div
                key={clip.id}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.45)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {clip.name}
                    </div>
                    <div className="font-mono" style={{ fontSize: 10, color: '#94a3b8' }}>
                      {clip.width}×{clip.height} · {clip.durationSec.toFixed(1)}s · {(clip.blob.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="os-btn os-icon-btn os-btn-active"
                      style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                      onClick={() => VideoRecorderEngine.downloadClip(clip)}
                    >
                      <Download size={12} /> Save
                    </button>
                    <button
                      type="button"
                      className="os-btn os-icon-btn os-icon-btn--square"
                      style={{ height: 26, width: 26, color: '#f87171' }}
                      aria-label={`Delete ${clip.name}`}
                      onClick={() => onDeleteClip(clip.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <video
                  src={clip.url}
                  controls
                  playsInline
                  style={{
                    width: '100%',
                    maxHeight: 165,
                    borderRadius: 6,
                    background: '#000',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
