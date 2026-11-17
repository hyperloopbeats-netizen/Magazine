import React, { useEffect, useRef } from 'react';
import {
  Activity,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Maximize2,
  Palette,
  Plus,
  Sparkles,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import { LiquidObjectType, LiquidTouchMenuState } from '../types/matrix';

export interface LiquidTouchAction {
  id: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface LiquidTouchMenuProps {
  menu: LiquidTouchMenuState;
  photoStyleName: string;
  emergenceName: string;
  fitMode: string;
  stageMode: string;
  isPdf: boolean;
  onClose: () => void;
  onFlipForward: () => void;
  onFlipBackward: () => void;
  onCyclePhotoStyle: () => void;
  onCycleEmergence: () => void;
  onToggleFitMode: () => void;
  onPulseEnergy: () => void;
  onGravityShift: () => void;
  onSpawnNodes: () => void;
  onToggleGelCore: () => void;
  onToggleSwarm: () => void;
  onCycleStageMode: () => void;
  onShockwaveAtPoint: () => void;
}

const OBJECT_TYPE_TITLE: Record<LiquidObjectType, string> = {
  core: '3D Gel Sphere',
  node: 'Spatial Node',
  swarm: 'Orbital Swarm',
  slide: 'Stage Canvas',
};

export const LiquidTouchMenu: React.FC<LiquidTouchMenuProps> = ({
  menu,
  photoStyleName,
  emergenceName,
  fitMode,
  stageMode,
  isPdf,
  onClose,
  onFlipForward,
  onFlipBackward,
  onCyclePhotoStyle,
  onCycleEmergence,
  onToggleFitMode,
  onPulseEnergy,
  onGravityShift,
  onSpawnNodes,
  onToggleGelCore,
  onToggleSwarm,
  onCycleStageMode,
  onShockwaveAtPoint,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu.open, onClose]);

  if (!menu.open) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const menuW = 248;
  const menuH = 260;
  const clampedX = Math.max(12, Math.min(vw - menuW - 12, menu.x - menuW * 0.5));
  const clampedY = Math.max(66, Math.min(vh - menuH - 76, menu.y - 24));

  const actions: LiquidTouchAction[] = [];

  if (menu.targetType === 'core') {
    actions.push(
      {
        id: 'pulse',
        label: 'Pulse Energy Wave',
        sub: 'Excite core aura',
        icon: <Zap size={13} color="#c084fc" />,
        onSelect: () => {
          onPulseEnergy();
          onClose();
        },
      },
      {
        id: 'sun-stage',
        label: `Stage: ${stageMode.toUpperCase()}`,
        sub: 'Cycle Slides / Hybrid / Sun',
        icon: <Sun size={13} color="#fbbf24" />,
        onSelect: () => {
          onCycleStageMode();
          onClose();
        },
      },
      {
        id: 'emerge',
        label: `Emerge: ${emergenceName}`,
        sub: 'Cycle ambient surface',
        icon: <Droplets size={13} color="#38bdf8" />,
        onSelect: () => {
          onCycleEmergence();
        },
      },
      {
        id: 'hide-core',
        label: 'Dismiss Gel Core',
        sub: 'Toggle 3D sphere off',
        icon: <Flame size={13} color="#f472b6" />,
        onSelect: () => {
          onToggleGelCore();
          onClose();
        },
      }
    );
  } else if (menu.targetType === 'node') {
    actions.push(
      {
        id: 'shockwave',
        label: 'Emit Liquid Ripple',
        sub: 'Shockwave at point',
        icon: <Droplets size={13} color="#38bdf8" />,
        onSelect: () => {
          onShockwaveAtPoint();
          onPulseEnergy();
          onClose();
        },
      },
      {
        id: 'gravity',
        label: 'Invert Gravity Wave',
        sub: 'Fling spatial nodes',
        icon: <Activity size={13} color="#fbbf24" />,
        onSelect: () => {
          onGravityShift();
          onClose();
        },
      },
      {
        id: 'spawn',
        label: 'Spawn +6 Nodes',
        sub: 'Multiply spatial matrix',
        icon: <Plus size={13} color="#34d399" />,
        onSelect: () => {
          onSpawnNodes();
          onClose();
        },
      },
      {
        id: 'flip',
        label: 'Turn Page Forward',
        sub: 'Natural page curl',
        icon: <BookOpen size={13} color="#fef08a" />,
        onSelect: () => {
          onFlipForward();
          onClose();
        },
      }
    );
  } else if (menu.targetType === 'swarm') {
    actions.push(
      {
        id: 'swarm-gravity',
        label: 'Scatter Orbit',
        sub: 'Impulse orbital boids',
        icon: <Activity size={13} color="#34d399" />,
        onSelect: () => {
          onGravityShift();
          onPulseEnergy();
          onClose();
        },
      },
      {
        id: 'swarm-style',
        label: `Style: ${photoStyleName}`,
        sub: 'Cycle color science',
        icon: <Palette size={13} color="#f472b6" />,
        onSelect: () => {
          onCyclePhotoStyle();
        },
      },
      {
        id: 'swarm-hide',
        label: 'Pause Orbital Swarm',
        sub: 'Hide 3D boid ring',
        icon: <Sparkles size={13} color="#94a3b8" />,
        onSelect: () => {
          onToggleSwarm();
          onClose();
        },
      }
    );
  } else {
    actions.push(
      {
        id: 'flip-next',
        label: isPdf ? 'Flip Next PDF Page' : 'Turn Page Forward',
        sub: 'Organic page curl ->',
        icon: <ChevronRight size={13} color="#fef08a" />,
        onSelect: () => {
          onFlipForward();
          onClose();
        },
      },
      {
        id: 'flip-prev',
        label: isPdf ? 'Flip Previous PDF Page' : 'Turn Page Back',
        sub: '<- Reverse page curl',
        icon: <ChevronLeft size={13} color="#38bdf8" />,
        onSelect: () => {
          onFlipBackward();
          onClose();
        },
      },
      {
        id: 'photo-style',
        label: `Style: ${photoStyleName}`,
        sub: 'Cycle 9 photo styles',
        icon: <Palette size={13} color="#f472b6" />,
        onSelect: () => {
          onCyclePhotoStyle();
        },
      },
      {
        id: 'emerge-mode',
        label: `Emerge: ${emergenceName}`,
        sub: 'Cycle fluid emergence',
        icon: <Droplets size={13} color="#5eead4" />,
        onSelect: () => {
          onCycleEmergence();
        },
      },
      {
        id: 'fit-mode',
        label: `Framing: ${fitMode.toUpperCase()}`,
        sub: 'Toggle Cover / Contain',
        icon: <Maximize2 size={13} color="#cbd5e1" />,
        onSelect: () => {
          onToggleFitMode();
        },
      }
    );
  }

  return (
    <>
      <div
        className="liquid-backdrop"
        onPointerDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="menu"
        aria-label={`Liquid touch actions for ${menu.label}`}
        className="liquid-menu os-panel"
        style={{ left: clampedX, top: clampedY, width: menuW }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="liquid-menu-header">
          <div style={{ minWidth: 0 }}>
            <div className="liquid-menu-kicker">{OBJECT_TYPE_TITLE[menu.targetType]}</div>
            <div className="liquid-menu-title" title={menu.label}>
              {menu.label}
            </div>
          </div>
          <button
            type="button"
            className="os-win-ctrl-btn"
            onClick={onClose}
            aria-label="Close touch menu"
          >
            <X size={13} />
          </button>
        </div>

        <div className="liquid-menu-actions">
          {actions.map((act) => (
            <button
              key={act.id}
              type="button"
              role="menuitem"
              className="liquid-menu-btn"
              onClick={act.onSelect}
            >
              <span className="liquid-menu-icon">{act.icon}</span>
              <span className="liquid-menu-text">
                <span className="liquid-menu-label">{act.label}</span>
                {act.sub && <span className="liquid-menu-sub">{act.sub}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
