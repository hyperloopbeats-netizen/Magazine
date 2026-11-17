import {
  EmergenceModeInfo,
  PhotoStyleInfo,
  SlideItem,
  TransitionModeInfo,
} from '../types/matrix';

export const TRANSITION_MODES: TransitionModeInfo[] = [
  {
    id: 0,
    key: 'liquid-lens',
    code: '01',
    name: 'Liquid Lens Halftone',
    shortName: 'Liquid Lens',
    origin: 'Optical Core',
    description: 'Convex barrel warp with 5-tap directional blur and 4-point spark lattice wavefront.',
    accent: '#38bdf8',
  },
  {
    id: 1,
    key: 'spark-iris',
    code: '02',
    name: 'Spark Aperture Iris',
    shortName: 'Spark Iris',
    origin: 'Hero Aperture',
    description: 'Expanding 4-point concave star iris reveal with cobalt-ice perimeter corona.',
    accent: '#60a5fa',
  },
  {
    id: 2,
    key: 'gel-morph',
    code: '03',
    name: 'Gel Squish Morph',
    shortName: 'Gel Morph',
    origin: 'Cometic Engine',
    description: 'Organic gelatinous sinusoidal UV displacement with pastel pink and cyan rim glow.',
    accent: '#f472b6',
  },
  {
    id: 3,
    key: 'solar-fractal',
    code: '04',
    name: 'Solar Fractal Dissolve',
    shortName: 'Solar Fractal',
    origin: 'Sentient Sun',
    description: 'Complex-plane fractal energy burn with warm solar core and teal corona.',
    accent: '#f59e0b',
  },
  {
    id: 4,
    key: 'shutter-curtain',
    code: '05',
    name: 'Shutter Curtain Wipe',
    shortName: 'Shutter Wipe',
    origin: 'Monolith Gate',
    description: 'Architectural split-curtain reveal with counter-scale parallax and hairline glint.',
    accent: '#93c5fd',
  },
  {
    id: 5,
    key: 'kinetic-blades',
    code: '06',
    name: 'Kinetic Blade Accordion',
    shortName: 'Blade Sweep',
    origin: '6-Blade Stage',
    description: 'Six staggered architectural vertical blades sweeping across the frame with prism split.',
    accent: '#34d399',
  },
  {
    id: 6,
    key: 'perspective-flip',
    code: '07',
    name: '3D Perspective Flip',
    shortName: '3D Flip',
    origin: 'Dual Canvas',
    description: 'Spatial 180-degree Y-axis projective rotation with mid-turn edge specular flash.',
    accent: '#a78bfa',
  },
  {
    id: 7,
    key: 'gravity-vortex',
    code: '08',
    name: 'Gravity Hug Vortex',
    shortName: 'Hug Vortex',
    origin: 'Evo Singularity',
    description: 'Swirling gravitational spiral singularity pulling outgoing image into incoming frame.',
    accent: '#fb7185',
  },
  {
    id: 8,
    key: 'velocity-pan',
    code: '09',
    name: 'Velocity Pan Arrest',
    shortName: 'Velocity Pan',
    origin: 'Motion Track',
    description: 'High-velocity horizontal camera pan with directional blur arresting to stillness.',
    accent: '#22d3ee',
  },
  {
    id: 9,
    key: 'voxel-mosaic',
    code: '10',
    name: 'Chibi Voxel Mosaic',
    shortName: 'Voxel Grid',
    origin: 'Cometic Voxel',
    description: 'Progressive spatial hyper-voxel grid quantization morphing cleanly between frames.',
    accent: '#f9a8d4',
  },
  {
    id: 10,
    key: 'natural-page-curl',
    code: '11',
    name: 'Natural Page Curl',
    shortName: 'Page Curl',
    origin: 'Folio Physics',
    description: 'Organic cylindrical page turn with curved paper crease, cast shadow, and directional turn.',
    accent: '#fef08a',
  },
  {
    id: 11,
    key: 'ink-bloom',
    code: '12',
    name: 'Ink Bloom Emergence',
    shortName: 'Ink Bloom',
    origin: 'Fluid Rag',
    description: 'Organic multi-octave fluid ink absorption bleeding outward into crystal focus.',
    accent: '#5eead4',
  },
  {
    id: 12,
    key: 'prism-shatter',
    code: '13',
    name: 'Prism Shatter Emergence',
    shortName: 'Prism Facet',
    origin: 'Crystal Lattice',
    description: 'Refractive cellular facets emerging with chromatic edge dispersion.',
    accent: '#c4b5fd',
  },
  {
    id: 13,
    key: 'bio-mitosis',
    code: '14',
    name: 'Bio-Vacuole Emergence',
    shortName: 'Bio Mitosis',
    origin: 'Living Cell',
    description: 'Organic membrane rings expanding and coalescing into the incoming photograph or page.',
    accent: '#6ee7b7',
  },
];

export const PHOTO_STYLES: PhotoStyleInfo[] = [
  { id: 'natural', index: 0, name: 'Studio Natural', note: 'Calibrated neutral color', swatch: '#cbd5e1' },
  { id: 'leica-mono', index: 1, name: 'Silver Gelatin', note: 'Platinum monochrome + 35mm grain', swatch: '#94a3b8' },
  { id: 'kodachrome', index: 2, name: 'Kodachrome 64', note: 'Warm amber highlights & deep cyan', swatch: '#f59e0b' },
  { id: 'cyanotype', index: 3, name: 'Cyanotype Blueprint', note: 'Prussian blue archival print', swatch: '#38bdf8' },
  { id: 'velvia', index: 4, name: 'Velvia Vivid', note: 'High-saturation slide film contrast', swatch: '#ec4899' },
  { id: 'infrared', index: 5, name: 'Aerochrome IR', note: 'Crimson foliage & obsidian sky', swatch: '#f43f5e' },
  { id: 'halide-sepia', index: 6, name: 'Archival Sepia', note: 'Warm silver-halide museum tone', swatch: '#d97706' },
  { id: 'cyber-chrome', index: 7, name: 'Liquid Chrome', note: 'Anodized steel curve & cool indigo', swatch: '#6366f1' },
  { id: 'solar-wash', index: 8, name: 'Golden Halation', note: 'Soft optical bloom & warm rim', swatch: '#fde047' },
];

export const EMERGENCE_MODES: EmergenceModeInfo[] = [
  { id: 'rest', index: 0, name: 'Quiet Rest', description: 'Crisp unmodulated image or PDF page' },
  { id: 'breathing-halo', index: 1, name: 'Breathing Halo', description: 'Soft ambient radial light pulse across edges' },
  { id: 'liquid-ripple', index: 2, name: 'Liquid Surface', description: 'Mercury surface micro-waves reactive to touch' },
  { id: 'prism-edge', index: 3, name: 'Chromatic Edge', description: 'Subtle peripheral RGB spectral refraction' },
  { id: 'bioluminescent', index: 4, name: 'Bio Caustics', description: 'Organic caustics emerging across dark areas' },
];

interface RawPhotoDef {
  stem: string;
  title: string;
  subtitle: string;
}

const CURATED_PHOTO_DEFS: RawPhotoDef[] = [
  { stem: '01_a_sweatshirt_wide', title: 'Architectural Sweatshirt Study', subtitle: 'Concrete Wide Frame' },
  { stem: '02_a_banana_tee_candid', title: 'Xenon Night Candid', subtitle: 'Soft Yellow Jersey' },
  { stem: '03_b_tote_side_a_carry', title: 'Unbleached Canvas Carry', subtitle: 'Street Daylight' },
  { stem: '06_d_black_tee_full', title: 'Cobalt Spotlight Drape', subtitle: 'Obsidian Tee Study' },
  { stem: '05_b_pin_night_portrait', title: 'Lapel Night Flash', subtitle: 'Enamel Pin Portrait' },
  { stem: '07_c_bottle_basalt_macro', title: 'Basalt Powder Coat', subtitle: 'Matte Steel Monolith' },
  { stem: '08_a_stickers_concrete_sheet', title: 'Prism Foil Kiss-Cut', subtitle: 'Concrete Macro' },
  { stem: '04_a_socks_overhead_trio', title: 'Ribbed Crew Trio', subtitle: 'Overhead Study' },
  { stem: '01_b_sweatshirt_medium', title: 'Fleece Three-Quarter', subtitle: 'Butter Cream Cut' },
  { stem: '02_c_banana_tee_chest_flash', title: 'Chest Flash Print', subtitle: 'Direct Xenon' },
  { stem: '03_a_tote_overhead_walk', title: 'Overhead Stride', subtitle: 'Canvas Motion' },
  { stem: '06_a_black_tee_shutter', title: 'Shutter Echo Frame', subtitle: 'Vertical Blade' },
  { stem: '07_a_bottle_pan_blur', title: 'High-Velocity Pan', subtitle: 'Motion Streak' },
  { stem: '08_b_stickers_laptop_metal', title: 'Anodized Aluminum', subtitle: 'Iridescent Peel' },
  { stem: '01_c_sweatshirt_front_macro', title: 'Raised Chain Stitch', subtitle: 'Embroidery Macro' },
  { stem: '04_b_socks_pavement_stride', title: 'Pavement Stride', subtitle: 'Optic White Knit' },
  { stem: '05_a_pin_collar_flash', title: 'Collar Specular Bevel', subtitle: 'Die-Struck Enamel' },
  { stem: '06_b_black_tee_crouch', title: 'Low-Angle Studio', subtitle: 'Heavyweight Jersey' },
  { stem: '03_c_tote_side_b_closeup', title: 'Reverse Canvas Print', subtitle: 'Woven Detail' },
  { stem: '08_c_stickers_polycarbonate_peel', title: 'Polycarbonate Foil', subtitle: 'Refraction Study' },
  { stem: '02_b_banana_tee_walk', title: 'Night Crosswalk', subtitle: 'Motion Candid' },
  { stem: '07_b_bottle_hand_reach', title: 'Foreground Grip', subtitle: 'Steel Cylinder' },
  { stem: '01_d_sweatshirt_back_collar', title: 'Back-Collar Stitch', subtitle: 'Macro Detail' },
  { stem: '05_c_pin_enamel_macro', title: 'Hard Enamel Macro', subtitle: 'Polished Rim' },
  { stem: '06_c_black_tee_chest_macro', title: 'Left-Chest Lockup', subtitle: 'Fabric Texture' },
  { stem: '03_d_tote_curb_still', title: 'Curbside Still Life', subtitle: 'Reinforced Webbing' },
  { stem: '04_c_socks_ankle_macro', title: 'Ankle Embroidery', subtitle: 'Cushioned Knit' },
  { stem: '02_d_banana_tee_back_collar', title: 'Rear Collar Print', subtitle: 'Combed Cotton' },
  { stem: '08_d_stickers_steel_street', title: 'Brushed Street Steel', subtitle: 'Holographic Seal' },
];

export function getCuratedSlides(): SlideItem[] {
  return CURATED_PHOTO_DEFS.map((item, idx) => ({
    id: `curated_${item.stem}`,
    title: item.title,
    subtitle: item.subtitle,
    url: `./assets/photos/web/${item.stem}.webp`,
    source: 'curated',
    createdAt: idx,
  }));
}

export type ProceduralTheme = 'solar' | 'cometic' | 'aurora' | 'evo' | 'prism';

const THEME_LABELS: Record<ProceduralTheme, { title: string; subtitle: string }> = {
  solar: { title: 'Solar Fractal Core', subtitle: 'Procedural Julia Field' },
  cometic: { title: 'Cometic Pastel Gel', subtitle: 'Procedural Bloom Aura' },
  aurora: { title: 'Aurora Mesh Horizon', subtitle: 'Procedural Spectral Wave' },
  evo: { title: 'Evo Canopy Matrix', subtitle: 'Procedural Bio-Lattice' },
  prism: { title: 'Quantum Prism Lattice', subtitle: 'Procedural Interference' },
};

export function generateProceduralSlide(requestedTheme?: ProceduralTheme): SlideItem {
  const themes: ProceduralTheme[] = ['solar', 'cometic', 'aurora', 'evo', 'prism'];
  const theme = requestedTheme || themes[Math.floor(Math.random() * themes.length)];
  const seed = Math.random() * 1000;

  const width = 1280;
  const height = 800;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    if (theme === 'solar') {
      ctx.fillStyle = '#040914';
      ctx.fillRect(0, 0, width, height);
      const cx = width * (0.35 + (seed % 30) / 100);
      const cy = height * (0.35 + ((seed * 3) % 30) / 100);
      const radGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, width * 0.65);
      radGrad.addColorStop(0, 'rgba(255, 232, 160, 0.98)');
      radGrad.addColorStop(0.18, 'rgba(245, 158, 11, 0.78)');
      radGrad.addColorStop(0.45, 'rgba(14, 116, 144, 0.35)');
      radGrad.addColorStop(1, 'rgba(2, 6, 23, 1)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        const r = 60 + i * 36;
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(251, 191, 36, 0.22)' : 'rgba(56, 189, 248, 0.18)';
        ctx.lineWidth = 1.5 + (i % 3);
        ctx.ellipse(
          cx,
          cy,
          r * (1 + Math.sin(seed + i) * 0.15),
          r * (0.72 + Math.cos(seed + i) * 0.15),
          (seed + i) * 0.2,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    } else if (theme === 'cometic') {
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, '#0b0f19');
      bg.addColorStop(0.5, '#1e1b4b');
      bg.addColorStop(1, '#091526');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const blobs = [
        { x: 0.3, y: 0.4, c: 'rgba(244, 114, 182, 0.55)', r: 380 },
        { x: 0.7, y: 0.55, c: 'rgba(56, 189, 248, 0.52)', r: 420 },
        { x: 0.5, y: 0.3, c: 'rgba(168, 85, 247, 0.45)', r: 320 },
      ];
      blobs.forEach((b, idx) => {
        const bx = width * (b.x + Math.sin(seed + idx) * 0.12);
        const by = height * (b.y + Math.cos(seed + idx * 2) * 0.12);
        const g = ctx.createRadialGradient(bx, by, 10, bx, by, b.r);
        g.addColorStop(0, b.c);
        g.addColorStop(1, 'rgba(11, 15, 25, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      });

      ctx.strokeStyle = 'rgba(244, 114, 182, 0.22)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += 64) {
        ctx.beginPath();
        ctx.moveTo(width * 0.5 + (x - width * 0.5) * 0.35, height * 0.55);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = height * 0.55; y <= height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (theme === 'aurora') {
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);
      const colors = ['#38bdf8', '#a855f7', '#ec4899', '#10b981'];
      for (let ribbon = 0; ribbon < 5; ribbon++) {
        ctx.beginPath();
        const baseY = height * (0.22 + ribbon * 0.14);
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= width; x += 32) {
          const y =
            baseY +
            Math.sin(x * 0.005 + seed + ribbon) * 85 +
            Math.cos(x * 0.011 - seed * 0.5) * 40;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, baseY - 120, 0, baseY + 240);
        grad.addColorStop(0, colors[ribbon % colors.length] + '66');
        grad.addColorStop(1, 'rgba(3, 7, 18, 0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
    } else if (theme === 'evo') {
      ctx.fillStyle = '#020b0d';
      ctx.fillRect(0, 0, width, height);
      const g = ctx.createRadialGradient(width * 0.5, height * 0.5, 20, width * 0.5, height * 0.5, 620);
      g.addColorStop(0, 'rgba(16, 185, 129, 0.34)');
      g.addColorStop(0.6, 'rgba(6, 78, 59, 0.16)');
      g.addColorStop(1, 'rgba(2, 6, 23, 1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 42; i++) {
        pts.push({
          x: ((Math.sin(seed + i * 1.7) * 0.5 + 0.5) * 0.84 + 0.08) * width,
          y: ((Math.cos(seed * 1.3 + i * 2.3) * 0.5 + 0.5) * 0.8 + 0.1) * height,
        });
      }
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.22)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < 210) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      pts.forEach((p, idx) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + (idx % 5) * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = idx % 3 === 0 ? '#6ee7b7' : '#38bdf8';
        ctx.fill();
      });
    } else {
      ctx.fillStyle = '#07080d';
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 36; i++) {
        const x = (Math.sin(seed + i * 0.9) * 0.5 + 0.5) * width;
        const y = (Math.cos(seed + i * 1.4) * 0.5 + 0.5) * height;
        const w = 140 + (i % 5) * 60;
        const h = 140 + ((i * 3) % 5) * 60;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((seed + i * 0.4) % Math.PI);
        const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        g.addColorStop(0, i % 2 === 0 ? 'rgba(56, 189, 248, 0.26)' : 'rgba(244, 114, 182, 0.24)');
        g.addColorStop(1, 'rgba(31, 52, 255, 0.04)');
        ctx.fillStyle = g;
        ctx.strokeStyle = 'rgba(210, 227, 252, 0.25)';
        ctx.lineWidth = 1;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }

    for (let s = 0; s < 55; s++) {
      const sx = (Math.sin(seed * 2.1 + s * 13.7) * 0.5 + 0.5) * width;
      const sy = (Math.cos(seed * 1.7 + s * 9.3) * 0.5 + 0.5) * height;
      const r = 1.5 + (s % 4) * 1.1;
      ctx.fillStyle = s % 3 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(150,208,255,0.6)';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const info = THEME_LABELS[theme];
  const uid = `${theme}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  return {
    id: `gen_${uid}`,
    title: info.title,
    subtitle: info.subtitle,
    url: canvas.toDataURL('image/webp', 0.92),
    source: 'generated',
    aspectHint: width / height,
    createdAt: Date.now(),
  };
}
