import React, { useState } from 'react';
import { FileText, Shuffle, Sparkles, Trash2, Upload, Wand2 } from 'lucide-react';
import { EMERGENCE_MODES, PHOTO_STYLES, ProceduralTheme } from '../data/imagePool';
import { FitMode, ForgeParameters, SlideItem, SlideSource } from '../types/matrix';

interface MediaDeckPanelProps {
  slides: SlideItem[];
  activeSlideId: string;
  params: ForgeParameters;
  beatSync: boolean;
  pdfLoadingStatus: { file: string; page: number; total: number } | null;
  onSelectSlide: (slideId: string) => void;
  onRemoveSlide: (slideId: string) => void;
  onUploadClick: () => void;
  onUploadPdfClick: () => void;
  onGenerateSlide: (theme?: ProceduralTheme) => void;
  onGenerateBatch: (count: number) => void;
  onShuffleSlides: () => void;
  onUpdateParams: (next: Partial<ForgeParameters>) => void;
  onToggleBeatSync: () => void;
}

export const MediaDeckPanel: React.FC<MediaDeckPanelProps> = ({
  slides,
  activeSlideId,
  params,
  beatSync,
  pdfLoadingStatus,
  onSelectSlide,
  onRemoveSlide,
  onUploadClick,
  onUploadPdfClick,
  onGenerateSlide,
  onGenerateBatch,
  onShuffleSlides,
  onUpdateParams,
  onToggleBeatSync,
}) => {
  const [filter, setFilter] = useState<'all' | SlideSource>('all');
  const [artTheme, setArtTheme] = useState<'random' | ProceduralTheme>('random');

  const filtered = filter === 'all' ? slides : slides.filter((s) => s.source === filter);
  const loadedCount = slides.filter((s) => s.source === 'loaded').length;
  const pdfCount = slides.filter((s) => s.source === 'pdf').length;
  const genCount = slides.filter((s) => s.source === 'generated').length;

  return (
    <>
      <div className="panel-section">
        <div className="panel-label-row">
          <span className="panel-heading">Load Images, PDF & Synth</span>
          <span className="font-mono" style={{ fontSize: 10.5, color: '#94a3b8' }}>
            {slides.length} total · {pdfCount} pdf · {loadedCount} local · {genCount} art
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button type="button" className="os-btn os-icon-btn os-btn-active" onClick={onUploadClick}>
            <Upload size={13} /> Upload Images
          </button>
          <button
            type="button"
            className="os-btn os-icon-btn os-btn-active"
            onClick={onUploadPdfClick}
            title="Decode PDF pages into flipbook slides"
          >
            <FileText size={13} /> Upload PDF
          </button>
          <button
            type="button"
            className="os-btn os-icon-btn"
            onClick={() => onGenerateSlide(artTheme === 'random' ? undefined : artTheme)}
          >
            <Wand2 size={13} /> Gen Random Art
          </button>
          <button type="button" className="os-btn os-icon-btn" onClick={() => onGenerateBatch(5)}>
            <Sparkles size={13} /> +5 Random Art
          </button>
        </div>

        {pdfLoadingStatus && (
          <div
            className="font-mono"
            style={{
              fontSize: 11,
              color: '#bae6fd',
              padding: '6px 8px',
              borderRadius: 6,
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
            }}
          >
            Decoding {pdfLoadingStatus.file}: Page {pdfLoadingStatus.page} / {pdfLoadingStatus.total}...
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            value={artTheme}
            onChange={(e) => setArtTheme(e.target.value as 'random' | ProceduralTheme)}
            style={{
              flex: 1,
              height: 30,
              borderRadius: 6,
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#e2e8f0',
              fontSize: 11.5,
              padding: '0 8px',
            }}
            aria-label="Procedural artwork theme"
          >
            <option value="random">Art Theme: Random</option>
            <option value="solar">Solar Fractal Core</option>
            <option value="cometic">Cometic Pastel Gel</option>
            <option value="aurora">Aurora Mesh Horizon</option>
            <option value="evo">Evo Canopy Matrix</option>
            <option value="prism">Quantum Prism Lattice</option>
          </select>
          <button type="button" className="os-btn os-icon-btn" onClick={onShuffleSlides}>
            <Shuffle size={12} /> Shuffle
          </button>
        </div>
      </div>

      {/* Live WebGL Photo Styles */}
      <div className="panel-section">
        <div className="panel-label-row">
          <span className="panel-heading">Photo Styles (GLSL Film Grades)</span>
          <span className="font-mono" style={{ fontSize: 10, color: '#94a3b8' }}>
            {PHOTO_STYLES.find((s) => s.id === params.photoStyle)?.name}
          </span>
        </div>

        <div className="photo-style-grid">
          {PHOTO_STYLES.map((style) => {
            const active = params.photoStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                className={`photo-style-chip ${active ? 'photo-style-chip--active' : ''}`}
                onClick={() => onUpdateParams({ photoStyle: style.id })}
                title={style.note}
              >
                <span className="photo-style-swatch" style={{ backgroundColor: style.swatch }} />
                <span className="photo-style-label">{style.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ambient Surface Emergence Modes */}
      <div className="panel-section">
        <span className="panel-heading">Emergence & Surface Behavior</span>
        <div className="emerge-grid">
          {EMERGENCE_MODES.map((em) => {
            const active = params.emergenceMode === em.id;
            return (
              <button
                key={em.id}
                type="button"
                className={`seg-btn ${active ? 'seg-btn--active' : ''}`}
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: active ? 'rgba(56, 189, 248, 0.2)' : 'rgba(0,0,0,0.35)',
                }}
                onClick={() => onUpdateParams({ emergenceMode: em.id })}
                title={em.description}
              >
                {em.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel-section">
        <span className="panel-heading">Optical Framing & Timing</span>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div className="seg-group" role="group" aria-label="Image Fit Mode">
            {(['cover', 'contain'] as FitMode[]).map((fit) => (
              <button
                key={fit}
                type="button"
                className={`seg-btn ${params.fitMode === fit ? 'seg-btn--active' : ''}`}
                onClick={() => onUpdateParams({ fitMode: fit })}
              >
                {fit === 'cover' ? 'Cover' : 'Contain'}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`os-btn os-icon-btn ${params.kenBurns ? 'os-btn-active' : ''}`}
            onClick={() => onUpdateParams({ kenBurns: !params.kenBurns })}
          >
            Ken Burns: {params.kenBurns ? 'On' : 'Off'}
          </button>
        </div>

        <div className="slider-row">
          <span style={{ color: '#94a3b8' }}>Slide Timer</span>
          <input
            type="range"
            className="os-slider"
            min={2}
            max={15}
            step={0.5}
            value={params.slideInterval}
            onChange={(e) => onUpdateParams({ slideInterval: parseFloat(e.target.value) })}
            aria-label="Slide interval seconds"
          />
          <span className="slider-val">{params.slideInterval.toFixed(1)}s</span>
        </div>

        <div className="slider-row">
          <span style={{ color: '#94a3b8' }}>FX Duration</span>
          <input
            type="range"
            className="os-slider"
            min={0.35}
            max={2.4}
            step={0.05}
            value={params.transitionDuration}
            onChange={(e) => onUpdateParams({ transitionDuration: parseFloat(e.target.value) })}
            aria-label="Transition duration seconds"
          />
          <span className="slider-val">{params.transitionDuration.toFixed(2)}s</span>
        </div>

        <div className="slider-row">
          <span style={{ color: '#94a3b8' }}>Optical Warp</span>
          <input
            type="range"
            className="os-slider"
            min={0}
            max={2}
            step={0.05}
            value={params.lensStrength}
            onChange={(e) => onUpdateParams({ lensStrength: parseFloat(e.target.value) })}
            aria-label="Optical lens strength"
          />
          <span className="slider-val">{params.lensStrength.toFixed(2)}x</span>
        </div>

        <button
          type="button"
          className={`os-btn os-icon-btn ${beatSync ? 'os-btn-active' : ''}`}
          onClick={onToggleBeatSync}
        >
          Beat-Sync Slide Advance: {beatSync ? 'Active' : 'Off'}
        </button>
      </div>

      <div className="panel-section">
        <div className="seg-group" role="tablist" aria-label="Slide Source Filter">
          {(['all', 'pdf', 'loaded', 'curated', 'generated'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={filter === tab}
              className={`seg-btn ${filter === tab ? 'seg-btn--active' : ''}`}
              onClick={() => setFilter(tab)}
            >
              {tab === 'pdf' ? 'PDF' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="media-grid os-scroll">
          {filtered.map((slide) => {
            const isActive = slide.id === activeSlideId;
            return (
              <div
                key={slide.id}
                className={`media-thumb-card ${isActive ? 'media-thumb-card--active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSlide(slide.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSlide(slide.id);
                  }
                }}
                title={`${slide.title} (${slide.source})`}
              >
                <img src={slide.url} alt={slide.title} className="media-thumb-img" loading="lazy" />
                <div className="media-thumb-caption">
                  {slide.source === 'pdf' && slide.pageNumber && slide.totalPages
                    ? `Page ${slide.pageNumber}/${slide.totalPages}`
                    : slide.title}
                </div>
                {slide.source !== 'curated' && (
                  <button
                    type="button"
                    className="media-thumb-del"
                    aria-label={`Remove ${slide.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSlide(slide.id);
                    }}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '20px 8px',
                fontSize: 12,
                color: '#64748b',
              }}
            >
              No slides in this filter yet. Upload images, drop a PDF, or generate art above.
            </div>
          )}
        </div>
      </div>
    </>
  );
};
