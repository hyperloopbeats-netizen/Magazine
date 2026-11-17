import React, { useEffect, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { ForgeParameters, OverlayConfig, TransitionSequenceMode } from '../types/matrix';

export interface ForgeConfigSnapshot {
  params: ForgeParameters;
  sequenceMode: TransitionSequenceMode;
  overlay: OverlayConfig;
}

const FORGE_PRESETS: Record<string, { label: string; config: ForgeConfigSnapshot }> = {
  optical: {
    label: 'Optical Editorial',
    config: {
      params: {
        transitionDuration: 0.9,
        slideInterval: 6.0,
        lensStrength: 1.0,
        audioReactivity: 0.7,
        kenBurns: true,
        fitMode: 'cover',
        mood: 'flow',
        photoStyle: 'natural',
        emergenceMode: 'rest',
        tapPageFlip: true,
      },
      sequenceMode: 'cycle',
      overlay: { motes: true, swarm: false, gelCore: false, horizonGrid: false, intensity: 0.85 },
    },
  },
  cometic: {
    label: 'Cometic Overdrive',
    config: {
      params: {
        transitionDuration: 1.15,
        slideInterval: 4.5,
        lensStrength: 1.55,
        audioReactivity: 1.2,
        kenBurns: true,
        fitMode: 'cover',
        mood: 'pastel',
        photoStyle: 'velvia',
        emergenceMode: 'liquid-ripple',
        tapPageFlip: true,
      },
      sequenceMode: 'random',
      overlay: { motes: true, swarm: true, gelCore: true, horizonGrid: true, intensity: 1.15 },
    },
  },
  solar: {
    label: 'Solar Flare',
    config: {
      params: {
        transitionDuration: 1.25,
        slideInterval: 5.5,
        lensStrength: 1.35,
        audioReactivity: 1.1,
        kenBurns: true,
        fitMode: 'cover',
        mood: 'solar',
        photoStyle: 'kodachrome',
        emergenceMode: 'breathing-halo',
        tapPageFlip: true,
      },
      sequenceMode: 'cycle',
      overlay: { motes: true, swarm: false, gelCore: true, horizonGrid: false, intensity: 1.0 },
    },
  },
  minimal: {
    label: 'Folio Reader',
    config: {
      params: {
        transitionDuration: 0.78,
        slideInterval: 9.0,
        lensStrength: 0.35,
        audioReactivity: 0.4,
        kenBurns: false,
        fitMode: 'contain',
        mood: 'flow',
        photoStyle: 'natural',
        emergenceMode: 'rest',
        tapPageFlip: true,
      },
      sequenceMode: 'locked',
      overlay: { motes: false, swarm: false, gelCore: false, horizonGrid: false, intensity: 0.55 },
    },
  },
};

interface CodeForgePanelProps {
  currentSnapshot: ForgeConfigSnapshot;
  onApplySnapshot: (snapshot: ForgeConfigSnapshot, presetName?: string) => void;
}

export const CodeForgePanel: React.FC<CodeForgePanelProps> = ({
  currentSnapshot,
  onApplySnapshot,
}) => {
  const [codeText, setCodeText] = useState(() => JSON.stringify(currentSnapshot, null, 2));
  const [statusMsg, setStatusMsg] = useState('Ready — edit JSON choreography or pick a preset.');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setCodeText(JSON.stringify(currentSnapshot, null, 2));
  }, [currentSnapshot]);

  const handleCompile = () => {
    try {
      const parsed = JSON.parse(codeText) as Partial<ForgeConfigSnapshot>;
      const merged: ForgeConfigSnapshot = {
        params: {
          ...currentSnapshot.params,
          ...(parsed.params || {}),
        },
        sequenceMode: parsed.sequenceMode || currentSnapshot.sequenceMode,
        overlay: {
          ...currentSnapshot.overlay,
          ...(parsed.overlay || {}),
        },
      };
      onApplySnapshot(merged, 'Custom Forge Config');
      setIsError(false);
      setStatusMsg('Applied live choreography to WebGL2 & Three.js engines.');
    } catch (err) {
      setIsError(true);
      setStatusMsg(err instanceof Error ? err.message : 'Invalid JSON syntax.');
    }
  };

  return (
    <>
      <div className="panel-section">
        <span className="panel-heading">Choreography Presets</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {Object.entries(FORGE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              className="os-btn os-icon-btn"
              onClick={() => {
                setCodeText(JSON.stringify(preset.config, null, 2));
                onApplySnapshot(preset.config, preset.label);
                setIsError(false);
                setStatusMsg(`Loaded preset: ${preset.label}`);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-label-row">
          <span className="panel-heading">Live Parameter Blueprint</span>
          <button
            type="button"
            className="os-btn os-icon-btn"
            style={{ height: 22, padding: '0 8px', fontSize: 10.5 }}
            onClick={() => {
              setCodeText(JSON.stringify(currentSnapshot, null, 2));
              setIsError(false);
              setStatusMsg('Synced editor with live engine parameters.');
            }}
          >
            <RotateCcw size={11} /> Sync Live
          </button>
        </div>

        <textarea
          className="forge-textarea os-scroll"
          value={codeText}
          onChange={(e) => setCodeText(e.target.value)}
          spellCheck={false}
          aria-label="Live parameter blueprint JSON editor"
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              color: isError ? '#f87171' : '#34d399',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {statusMsg}
          </span>
          <button
            type="button"
            className="os-btn os-icon-btn os-btn-active"
            onClick={handleCompile}
          >
            <Play size={12} /> Apply Live
          </button>
        </div>
      </div>
    </>
  );
};
