import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';

interface OsWindowProps {
  id: string;
  title: string;
  accentColor?: string;
  initialX: number;
  initialY: number;
  width: number;
  zIndex: number;
  onFocus: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export const OsWindow: React.FC<OsWindowProps> = ({
  title,
  initialX,
  initialY,
  width,
  zIndex,
  onFocus,
  onClose,
  children,
}) => {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    const clampPos = () => {
      setPos((prev) => ({
        x: Math.max(8, Math.min(window.innerWidth - Math.min(width, window.innerWidth - 16) - 8, prev.x)),
        y: Math.max(60, Math.min(window.innerHeight - 130, prev.y)),
      }));
    };
    clampPos();
    window.addEventListener('resize', clampPos);
    return () => window.removeEventListener('resize', clampPos);
  }, [width]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onFocus();
    if (maximized) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const maxW = Math.min(width, window.innerWidth - 16);
    const nx = Math.max(8, Math.min(window.innerWidth - maxW - 8, dragRef.current.origX + dx));
    const ny = Math.max(58, Math.min(window.innerHeight - 120, dragRef.current.origY + dy));
    setPos({ x: nx, y: ny });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if already released
      }
      dragRef.current = null;
    }
  };

  return (
    <section
      aria-label={`${title} window`}
      onPointerDown={onFocus}
      className={`os-window os-panel ${maximized ? 'os-window--maximized' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: maximized ? undefined : width,
        zIndex,
      }}
    >
      <div
        className="os-window-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="os-window-title-wrap">
          <span className="os-window-title">{title}</span>
        </div>

        <div className="os-window-controls">
          <button
            type="button"
            className="os-win-ctrl-btn"
            aria-label={minimized ? `Expand ${title}` : `Collapse ${title}`}
            onClick={() => setMinimized((v) => !v)}
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            className="os-win-ctrl-btn"
            aria-label={maximized ? `Restore ${title}` : `Maximize ${title}`}
            onClick={() => {
              setMinimized(false);
              setMaximized((v) => !v);
            }}
          >
            {maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button
            type="button"
            className="os-win-ctrl-btn"
            aria-label={`Close ${title}`}
            onClick={onClose}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {!minimized && <div className="os-window-body os-scroll">{children}</div>}
    </section>
  );
};
