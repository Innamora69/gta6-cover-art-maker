// Vice Cover Studio — the cover renderer. Everything is drawn by hand on canvas:
// multi-panel poster layouts, per-panel photos with crop + position, a Vice City
// sunset/neon grade, a retro sun disc and palm silhouettes drawn from paths,
// and bold condensed caption lettering. No Rockstar assets, no network.

// Panel rectangles in unit space (fractions of the cover). Index 0 is the hero.
// The caption band sits at the bottom of every layout.
export const LAYOUTS = {
  classic: {
    panels: [
      [0, 0, 1, 0.58],
      [0, 0.58, 1 / 3, 0.24],
      [1 / 3, 0.58, 1 / 3, 0.24],
      [2 / 3, 0.58, 1 / 3, 0.24],
    ],
    band: [0, 0.82, 1, 0.18],
  },
  quad: {
    panels: [
      [0, 0, 0.5, 0.41],
      [0.5, 0, 0.5, 0.41],
      [0, 0.41, 0.5, 0.41],
      [0.5, 0.41, 0.5, 0.41],
    ],
    band: [0, 0.82, 1, 0.18],
  },
  strip: {
    panels: [
      [0, 0, 1, 0.7],
      [0, 0.7, 1 / 3, 0.16],
      [1 / 3, 0.7, 1 / 3, 0.16],
      [2 / 3, 0.7, 1 / 3, 0.16],
    ],
    band: [0, 0.86, 1, 0.14],
  },
};

export const PANEL_NAMES = ['Hero', 'Panel 1', 'Panel 2', 'Panel 3'];
export const DISPLAY_FONT = '"Anton", "Arial Narrow", sans-serif';

/** Panel + band rectangles in pixels for a cover of this size and layout. */
export function layoutRects(width, height, layout) {
  const def = LAYOUTS[layout] ?? LAYOUTS.classic;
  const gap = Math.max(4, Math.round(width * 0.008));
  const panels = def.panels.map(([x, y, w, h]) => ({
    x: x * width + gap / 2,
    y: y * height + gap / 2,
    w: w * width - gap,
    h: h * height - gap,
  }));
  const [bx, by, bw, bh] = def.band;
  return { panels, band: { x: bx * width, y: by * height, w: bw * width, h: bh * height }, gap };
}

/** Which panel (0..3) contains canvas point (px, py), or -1 for the band/gutter. */
export function panelAt(width, height, layout, px, py) {
  const { panels } = layoutRects(width, height, layout);
  for (let i = 0; i < panels.length; i += 1) {
    const r = panels[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

function coverFitRect(img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  // Clamp the offsets so the photo always covers its panel — no gaps at the edges.
  const maxOx = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const maxOy = Math.max(0, (dh - rect.h) / 2 / rect.h);
  const cx = Math.max(-maxOx, Math.min(maxOx, ox));
  const cy = Math.max(-maxOy, Math.min(maxOy, oy));
  return {
    x: rect.x + (rect.w - dw) / 2 + cx * rect.w,
    y: rect.y + (rect.h - dh) / 2 + cy * rect.h,
    w: dw,
    h: dh,
  };
}

function drawPlaceholder(ctx, rect, index, scale) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#3b0764');
  g.addColorStop(0.55, '#9d174d');
  g.addColorStop(1, '#c2410c');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.setLineDash([10 * scale, 8 * scale]);
  ctx.lineWidth = 2 * scale;
  ctx.strokeRect(rect.x + 8 * scale, rect.y + 8 * scale, rect.w - 16 * scale, rect.h - 16 * scale);
  ctx.restore();
  const num = String(index + 1);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = `${Math.round(rect.h * 0.5)}px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(num, rect.x + rect.w / 2, rect.y + rect.h / 2 - rect.h * 0.08);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `bold ${Math.max(12, Math.round(rect.h * 0.09))}px system-ui, sans-serif`;
  ctx.fillText('ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h * 0.78);
  ctx.textBaseline = 'alphabetic';
}

// Retro sun disc with horizontal slits, drawn inside the hero panel.
// The slits are punched on a scratch canvas first, so they reveal the photo
// behind the sun instead of erasing through it.
function drawSun(ctx, rect, grade, scale) {
  const cx = rect.x + rect.w * 0.76;
  const cy = rect.y + rect.h * 0.34;
  const r = Math.min(rect.w, rect.h) * 0.22;
  const scratch = document.createElement('canvas');
  const pad = Math.ceil(r * 2 + 4);
  scratch.width = pad;
  scratch.height = pad;
  const s = scratch.getContext('2d');
  const g = s.createLinearGradient(0, 0, 0, pad);
  g.addColorStop(0, '#fde68a');
  g.addColorStop(0.55, '#fb923c');
  g.addColorStop(1, '#f43f5e');
  s.beginPath();
  s.arc(pad / 2, pad / 2, r, 0, Math.PI * 2);
  s.fillStyle = g;
  s.fill();
  s.globalCompositeOperation = 'destination-out';
  const slits = 5;
  for (let i = 0; i < slits; i += 1) {
    const y = pad / 2 + r * 0.05 + i * (r * 0.18);
    const half = Math.sqrt(Math.max(0, r * r - (y - pad / 2) * (y - pad / 2)));
    s.fillRect(pad / 2 - half, y, half * 2, r * 0.055 + i * r * 0.012);
  }
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.65 * grade;
  ctx.drawImage(scratch, cx - pad / 2, cy - pad / 2);
  ctx.restore();
}

// One palm silhouette, drawn from paths: curved trunk + drooping fronds.
function drawPalm(ctx, x, y, size, lean, flip) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.rotate(lean);
  ctx.strokeStyle = '#160a24';
  ctx.fillStyle = '#160a24';
  ctx.lineCap = 'round';
  // Trunk: a gentle S-curve up from the base.
  ctx.lineWidth = size * 0.045;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.06, -size * 0.45, size * 0.02, -size * 0.85);
  ctx.stroke();
  // Fronds: seven arcs fanning from the crown.
  const crownX = size * 0.02;
  const crownY = -size * 0.85;
  ctx.lineWidth = size * 0.035;
  for (let i = 0; i < 7; i += 1) {
    const a = (-Math.PI * 0.95) + (i * Math.PI * 0.9) / 6;
    const len = size * (0.42 - Math.abs(i - 3) * 0.03);
    const tipX = crownX + Math.cos(a) * len;
    const tipY = crownY + Math.sin(a) * len * 0.55 + size * 0.16;
    const ctrlX = crownX + Math.cos(a) * len * 0.6;
    const ctrlY = crownY + Math.sin(a) * len * 0.4 - size * 0.08;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(crownX - size * 0.03, crownY + size * 0.03, size * 0.035, 0, Math.PI * 2);
  ctx.arc(crownX + size * 0.04, crownY + size * 0.04, size * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGrade(ctx, width, height, panels, grade, scale) {
  if (grade <= 0) return;
  ctx.save();
  ctx.beginPath();
  for (const r of panels) ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  // Sunset wash: violet top, magenta middle, orange bottom.
  const wash = ctx.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, `rgba(124, 58, 237, ${0.34 * grade})`);
  wash.addColorStop(0.5, `rgba(219, 39, 119, ${0.30 * grade})`);
  wash.addColorStop(1, `rgba(249, 115, 22, ${0.34 * grade})`);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = `rgba(255, 120, 60, ${0.35 * grade})`;
  ctx.fillRect(0, height * 0.4, width, height * 0.6);
  ctx.globalCompositeOperation = 'source-over';
  // Vignette: darken the corners so the caption band pops.
  const vig = ctx.createRadialGradient(
    width / 2, height * 0.42, Math.min(width, height) * 0.42,
    width / 2, height * 0.5, Math.max(width, height) * 0.72,
  );
  vig.addColorStop(0, 'rgba(10, 4, 20, 0)');
  vig.addColorStop(1, `rgba(10, 4, 20, ${0.5 * grade})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function fitTitleSize(ctx, text, maxWidth, start) {
  let size = start;
  ctx.font = `${size}px ${DISPLAY_FONT}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${DISPLAY_FONT}`;
  }
  return size;
}

function drawCaptionBand(ctx, band, title, subtitle, scale) {
  const g = ctx.createLinearGradient(band.x, band.y, band.x, band.y + band.h);
  g.addColorStop(0, '#1c0a33');
  g.addColorStop(1, '#0d0518');
  ctx.fillStyle = g;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  // Neon top edge: pink into cyan.
  const edge = ctx.createLinearGradient(band.x, 0, band.x + band.w, 0);
  edge.addColorStop(0, '#ff2e88');
  edge.addColorStop(0.5, '#ffb020');
  edge.addColorStop(1, '#22d3ee');
  ctx.fillStyle = edge;
  ctx.fillRect(band.x, band.y, band.w, Math.max(3, 4 * scale));

  const text = (title || '').trim().toUpperCase();
  const sub = (subtitle || '').trim().toUpperCase();
  const cx = band.x + band.w / 2;
  if (text) {
    const size = fitTitleSize(ctx, text, band.w * 0.92, Math.round(band.h * 0.58));
    ctx.save();
    ctx.translate(cx, band.y + band.h * 0.52);
    ctx.transform(1, 0, -0.07, 1, 0, 0);
    ctx.font = `${size}px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255, 46, 136, 0.55)';
    ctx.shadowBlur = size * 0.14;
    ctx.shadowOffsetY = size * 0.045;
    ctx.strokeStyle = '#0b0614';
    ctx.lineWidth = Math.max(3, size * 0.14);
    ctx.strokeText(text, 0, 0);
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  if (sub) {
    ctx.save();
    ctx.font = `700 ${Math.max(11, Math.round(band.h * 0.13))}px system-ui, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(band.h * 0.05)}px`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(sub, cx, band.y + band.h * 0.86);
    ctx.restore();
  }
}

/**
 * Draws the whole cover onto `canvas` (its own pixel size) from `state`:
 * { layout, title, subtitle, grade (0..1), panels: [{img, zoom, ox, oy}] }.
 * opts.badges draws panel numbers for the editor preview; exports leave them out.
 */
export function drawCover(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const scale = w / 1080;
  const { panels, band } = layoutRects(w, h, state.layout);
  // Ivory poster frame shows through the gutters.
  ctx.fillStyle = '#f8ead8';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < panels.length; i += 1) {
    const rect = panels[i];
    const panel = state.panels[i] ?? {};
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (panel.img) {
      const d = coverFitRect(panel.img, rect, panel.zoom ?? 1, panel.ox ?? 0, panel.oy ?? 0);
      ctx.drawImage(panel.img, d.x, d.y, d.w, d.h);
    } else {
      drawPlaceholder(ctx, rect, i, scale);
    }
    // Retro sun + palms live inside the hero panel.
    if (i === 0) {
      drawSun(ctx, rect, state.grade ?? 0.8, scale);
      ctx.globalAlpha = 0.92;
      drawPalm(ctx, rect.x + rect.w * 0.07, rect.y + rect.h * 0.99, rect.h * 0.42, -0.06, false);
      drawPalm(ctx, rect.x + rect.w * 0.17, rect.y + rect.h * 0.99, rect.h * 0.3, 0.1, true);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (opts.badges) {
      ctx.fillStyle = 'rgba(11, 6, 20, 0.85)';
      ctx.beginPath();
      ctx.arc(rect.x + 18 * scale, rect.y + 18 * scale, 13 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${Math.round(13 * scale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), rect.x + 18 * scale, rect.y + 18 * scale + 1);
      ctx.textBaseline = 'alphabetic';
    }
  }

  drawGrade(ctx, w, h, panels, state.grade ?? 0.8, scale);
  drawCaptionBand(ctx, band, state.title, state.subtitle, scale);
}

/** Renders `state` at an exact export size and returns the canvas. */
export function renderExport(state, exportWidth, exportHeight) {
  const canvas = document.createElement('canvas');
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  drawCover(canvas, state, { badges: false });
  return canvas;
}
