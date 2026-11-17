import React from 'react';
import {
  Activity,
  BookOpen,
  Droplets,
  Flame,
  Grid,
  Layers,
  Palette,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { EMERGENCE_MODES, PHOTO_STYLES } from '../data/imagePool';
import {
  EmergenceMode,
  KernelLogEntry,
  OverlayConfig,
  PhotoStyleId,
  ThermalTelemetry,
  ThoughtStep,
  TransitionModeInfo,
  TransitionSequenceMode,
} from '../types/matrix';

interface MatrixPanelProps {
  modes: TransitionModeInfo[];
  activeMode: number;
  sequenceMode: TransitionSequenceMode;
  overdriveActive: boolean;
  tapPageFlip: boolean;
  photoStyle: PhotoStyleId;
  emergenceMode: EmergenceMode;
  overlayConfig: OverlayConfig;
  telemetry: ThermalTelemetry;
  thought: ThoughtStep;
  logs: KernelLogEntry[];
  onTriggerMode: (modeId: number) => void;
  onChangeSequenceMode: (mode: TransitionSequenceMode) => void;
  onToggleOverdrive: () => void;
  onToggleTapPageFlip: () => void;
  onChangePhotoStyle: (style: PhotoStyleId) => void;
  onChangeEmergenceMode: (mode: EmergenceMode) => void;
  onChangeOverlay: (next: Partial<OverlayConfig>) => void;
  onForceHeal: () => void;
  onEnergyPulse: () => void;
  onGravityShift: () => void;
  onSpawnNodes: () => void;
}

export const MatrixPanel: React.FC<MatrixPanelProps> = ({
  modes,
  activeMode,
  sequenceMode,
  overdriveActive,
  tapPageFlip,
  photoStyle,
  emergenceMode,
  overlayConfig,
  telemetry,
  thought,
  logs,
  onTriggerMode,
  onChangeSequenceMode,
  onToggleOverdrive,
  onToggleTapPageFlip,
  onChangePhotoStyle,
  onChangeEmergenceMode,
  onChangeOverlay,
  onForceHeal,
  onEnergyPulse,
  onGravityShift,
  onSpawnNodes,
}) => {
  const currentInfo = modes[activeMode] || modes[0];
  const currentStyle = PHOTO_STYLES.find((s) => s.id === photoStyle) || PHOTO_STYLES[0];
  const currentEmerge = EMERGENCE_MODES.find((e) => e.id === emergenceMode) || EMERGENCE_MODES[0];

  return (
    <>
      <div className="panel-section">
        <div className="panel-label-row">
          <span className="panel-heading">14-Node Transition & Emergence Matrix</span>
          <button
            type="button"
            className={`os-btn os-icon-btn ${overdriveActive ? 'os-icon-btn--overdrive' : ''}`}
            style={{ height: 24, padding: '0 8px', fontSize: 11 }}
            onClick={onToggleOverdrive}
          >
            <Flame size={12} />
            {overdriveActive ? 'Stop Sweep' : `Overdrive 1-${modes.length}`}
          </button>
        </div>

        <div className="seg-group" role="group" aria-label="Transition Sequence Mode">
          {(['cycle', 'random', 'locked'] as TransitionSequenceMode[]).map((seq) => (
            <button
              key={seq}
              type="button"
              className={`seg-btn ${sequenceMode === seq ? 'seg-btn--active' : ''}`}
              onClick={() => onChangeSequenceMode(seq)}
            >
              {seq === 'cycle' ? `Cycle 1-${modes.length}` : seq === 'random' ? 'Random FX' : 'Lock Active'}
            </button>
          ))}
        </div>

        <div className="matrix-grid">
          {modes.map((m) => {
            const isActive = m.id === activeMode;
            return (
              <button
                key={m.id}
                type="button"
                className={`matrix-node ${isActive ? 'matrix-node--active' : ''}`}
                onClick={() => onTriggerMode(m.id)}
                title={m.description}
              >
                <div className="matrix-node-top">
                  <span className="matrix-node-code" style={{ color: m.accent }}>
                    FX {m.code}
                  </span>
                  <span className="matrix-node-origin">{m.origin}</span>
                </div>
                <span className="matrix-node-name">{m.shortName}</span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 11,
            color: '#94a3b8',
            padding: '6px 8px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <strong style={{ color: currentInfo.accent }}>{currentInfo.name}:</strong>{' '}
          {currentInfo.description}
        </div>
      </div>

      {/* Organic Tap-to-Flip, Photo Style & Surface Emergence */}
      <div className="panel-section">
        <span className="panel-heading">Touch Gesture, Style & Emergence</span>

        <button
          type="button"
          className={`os-btn os-icon-btn ${tapPageFlip ? 'os-btn-active' : ''}`}
          onClick={onToggleTapPageFlip}
          title="Tap stage right/center to flip forward, left edge to flip backward with organic curl"
        >
          <BookOpen size={12} />
          Tap Screen -&gt; Natural Page Flip: {tapPageFlip ? 'Active' : 'Shockwave Only'}
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button
            type="button"
            className="os-btn os-icon-btn"
            onClick={() => {
              const nextIdx = (currentStyle.index + 1) % PHOTO_STYLES.length;
              onChangePhotoStyle(PHOTO_STYLES[nextIdx].id);
            }}
            title={currentStyle.note}
          >
            <Palette size={12} color={currentStyle.swatch} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentStyle.name}
            </span>
          </button>

          <button
            type="button"
            className="os-btn os-icon-btn"
            onClick={() => {
              const nextIdx = (currentEmerge.index + 1) % EMERGENCE_MODES.length;
              onChangeEmergenceMode(EMERGENCE_MODES[nextIdx].id);
            }}
            title={currentEmerge.description}
          >
            <Droplets size={12} color="#5eead4" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentEmerge.name}
            </span>
          </button>
        </div>
      </div>

      {/* 3D Spatial Overlay & Micro-HUD Node Actuation */}
      <div className="panel-section">
        <div className="panel-label-row">
          <span className="panel-heading">3D Liquid Touch Objects</span>
          <span className="font-mono" style={{ fontSize: 10.5, color: '#94a3b8' }}>
            {telemetry.awarenessNodes} nodes · {telemetry.particleCount} motes
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button
            type="button"
            className={`os-btn os-icon-btn ${overlayConfig.motes ? 'os-btn-active' : ''}`}
            onClick={() => onChangeOverlay({ motes: !overlayConfig.motes })}
          >
            <Sparkles size={12} /> Spark Motes
          </button>
          <button
            type="button"
            className={`os-btn os-icon-btn ${overlayConfig.swarm ? 'os-btn-active' : ''}`}
            onClick={() => onChangeOverlay({ swarm: !overlayConfig.swarm })}
          >
            <Layers size={12} /> Orbital Swarm
          </button>
          <button
            type="button"
            className={`os-btn os-icon-btn ${overlayConfig.gelCore ? 'os-btn-active' : ''}`}
            onClick={() => onChangeOverlay({ gelCore: !overlayConfig.gelCore })}
          >
            <Flame size={12} /> Gel Core
          </button>
          <button
            type="button"
            className={`os-btn os-icon-btn ${overlayConfig.horizonGrid ? 'os-btn-active' : ''}`}
            onClick={() => onChangeOverlay({ horizonGrid: !overlayConfig.horizonGrid })}
          >
            <Grid size={12} /> Horizon Grid
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <button type="button" className="os-btn os-icon-btn" onClick={onEnergyPulse}>
            <Zap size={11} color="#c084fc" /> Pulse
          </button>
          <button type="button" className="os-btn os-icon-btn" onClick={onGravityShift}>
            <Activity size={11} color="#fbbf24" /> Gravity
          </button>
          <button type="button" className="os-btn os-icon-btn" onClick={onSpawnNodes}>
            <Plus size={11} color="#34d399" /> Spawn
          </button>
        </div>

        <div className="slider-row">
          <span style={{ color: '#94a3b8' }}>Overlay Glow</span>
          <input
            type="range"
            className="os-slider"
            min={0.1}
            max={1.5}
            step={0.05}
            value={overlayConfig.intensity}
            onChange={(e) => onChangeOverlay({ intensity: parseFloat(e.target.value) })}
            aria-label="3D overlay intensity"
          />
          <span className="slider-val">{overlayConfig.intensity.toFixed(2)}</span>
        </div>
      </div>

      {/* Thermal-Throttling Shunt & Self-Healing Diagnostics */}
      <div className="panel-section">
        <div className="panel-label-row">
          <span className="panel-heading">Thermal Shunt & Self-Healing</span>
          <button
            type="button"
            className="os-btn os-icon-btn"
            style={{ height: 22, padding: '0 8px', fontSize: 10.5 }}
            onClick={onForceHeal}
          >
            <RefreshCw size={11} color="#34d399" /> Force Heal
          </button>
        </div>

        <div className="telemetry-grid">
          <div className="telemetry-cell">
            <span className="telemetry-k">FPS</span>
            <span className="telemetry-v">{telemetry.fps}</span>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-k">RES SCALE</span>
            <span className="telemetry-v">{telemetry.resScale.toFixed(2)}x</span>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-k">TIER</span>
            <span className="telemetry-v">{telemetry.tier.toUpperCase()}</span>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-k">CORE</span>
            <span
              className="telemetry-v"
              style={{
                color:
                  telemetry.thermalState === 'STABLE'
                    ? '#34d399'
                    : telemetry.thermalState === 'THROTTLED'
                      ? '#fbbf24'
                      : '#38bdf8',
              }}
            >
              {telemetry.thermalState}
            </span>
          </div>
        </div>
      </div>

      {/* Hyper-Layered Thought Pipeline */}
      <div className="panel-section">
        <div className="panel-label-row">
          <span className="panel-heading">Thought Matrix Pipeline</span>
          <span className="font-mono" style={{ fontSize: 10, color: '#64748b' }}>
            {thought.timestamp}
          </span>
        </div>
        <div className="thought-pipeline">
          <div className="thought-stage">
            <span className="thought-key">INTENT</span>
            <span className="thought-val">{thought.intent}</span>
          </div>
          <div className="thought-stage">
            <span className="thought-key">SYNTAX</span>
            <span className="thought-val">{thought.mapping}</span>
          </div>
          <div className="thought-stage">
            <span className="thought-key">ACTUATE</span>
            <span className="thought-val">{thought.actuation}</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <span className="panel-heading">Kernel Telemetry</span>
        <div className="kernel-log os-scroll">
          {logs.map((entry) => (
            <div key={entry.id} className="kernel-entry">
              <span className="kernel-time">{entry.time}</span>
              <span className={`kernel-tag kernel-tag--${entry.tone}`}>[{entry.tag}]</span>
              <span style={{ color: '#cbd5e1' }}>{entry.message}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
