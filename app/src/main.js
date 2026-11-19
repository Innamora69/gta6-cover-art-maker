// Vice Cover Studio — wires the page: layout, per-panel photos (upload, drag to
// reposition, zoom, apply-to-all, samples), caption, Vice City grade, and PNG
// export in 1080x1080, 1080x1350 and 1920x1080. Photos are read on this machine
// with FileReader and never leave it. Query params: ?demo=1 loads the samples,
// ?view=cover shows the cover alone (for presenting / screenshots).
import { drawCover, renderExport, panelAt, layoutRects, PANEL_NAMES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const gradeInput = document.getElementById('grade');
const gradeVal = document.getElementById('grade-val');
const zoomInput = document.getElementById('zoom');
const zoomVal = document.getElementById('zoom-val');
const status = document.getElementById('status');
const photoInput = document.getElementById('photo');

const state = {
  layout: 'classic',
  title: 'VICE CITY',
  subtitle: 'WELCOME BACK TO THE SUNSHINE STATE',
  grade: 0.8,
  exportSize: '1080x1080',
  panels: [
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
  ],
};
let selected = 0;

function redraw() {
  drawCover(canvas, state, { badges: !document.body.classList.contains('cover-only') });
}

function applyExportSize() {
  const [w, h] = state.exportSize.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  redraw();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function selectPanel(index) {
  selected = index;
  document.querySelectorAll('#panel-pick button').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.panel) === index);
  });
  const panel = state.panels[index];
  zoomInput.value = String(Math.round(panel.zoom * 100));
  zoomVal.textContent = `${Math.round(panel.zoom * 100)}%`;
  status.textContent = `${PANEL_NAMES[index]} selected — load a photo, drag it to move, zoom to crop.`;
  redraw();
}

async function setPanelPhoto(index, img) {
  state.panels[index] = { img, zoom: 1, ox: 0, oy: 0 };
  selectPanel(index);
}

async function loadSample(name, index) {
  try {
    const img = await loadImage(`samples/${name}.jpg`);
    await setPanelPhoto(index, img);
    status.textContent = `Sample ${name} loaded into ${PANEL_NAMES[index]}.`;
  } catch {
    status.textContent = `Could not load sample ${name}.`;
  }
}

async function loadDemo() {
  const boulevard = await loadImage('samples/boulevard.jpg');
  const pier = await loadImage('samples/pier.jpg');
  // Hero frames the pier fisherman's face (oy lifts the photo; coverFitRect
  // clamps it per panel so it can never leave a gap).
  state.panels[0] = { img: pier, zoom: 1.05, ox: 0, oy: 0.3 };
  state.panels[1] = { img: boulevard, zoom: 1.1, ox: 0, oy: 0 };
  state.panels[2] = { img: pier, zoom: 1.4, ox: -0.08, oy: 0.05 };
  state.panels[3] = { img: boulevard, zoom: 1.25, ox: 0.06, oy: -0.04 };
  selectPanel(0);
}

// --- Controls -------------------------------------------------------------
document.querySelectorAll('#layouts button').forEach((button) => {
  button.addEventListener('click', () => {
    state.layout = button.dataset.layout;
    document.querySelectorAll('#layouts button').forEach((b) => {
      b.classList.toggle('active', b === button);
    });
    redraw();
  });
});
document.querySelectorAll('#panel-pick button').forEach((button) => {
  button.addEventListener('click', () => selectPanel(Number(button.dataset.panel)));
});
document.querySelectorAll('#sizes button').forEach((button) => {
  button.addEventListener('click', () => {
    state.exportSize = button.dataset.size;
    document.querySelectorAll('#sizes button').forEach((b) => {
      b.classList.toggle('active', b === button);
    });
    applyExportSize();
    status.textContent = `Export size ${state.exportSize}.`;
  });
});

photoInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const img = await loadImage(URL.createObjectURL(file));
    await setPanelPhoto(selected, img);
    status.textContent = `${file.name} loaded into ${PANEL_NAMES[selected]}.`;
  } catch {
    status.textContent = 'That file could not be read as a photo.';
  }
  photoInput.value = '';
});
zoomInput.addEventListener('input', () => {
  state.panels[selected].zoom = Number(zoomInput.value) / 100;
  zoomVal.textContent = `${zoomInput.value}%`;
  redraw();
});
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
gradeInput.addEventListener('input', () => {
  state.grade = Number(gradeInput.value) / 100;
  gradeVal.textContent = `${gradeInput.value}%`;
  redraw();
});
document.getElementById('apply-all').addEventListener('click', () => {
  const src = state.panels[selected];
  if (!src.img) { status.textContent = 'Load a photo into this panel first.'; return; }
  for (let i = 0; i < state.panels.length; i += 1) {
    state.panels[i] = { img: src.img, zoom: src.zoom, ox: src.ox, oy: src.oy };
  }
  status.textContent = 'That photo now fills all four panels.';
  redraw();
});
document.getElementById('clear-panel').addEventListener('click', () => {
  state.panels[selected] = { img: null, zoom: 1, ox: 0, oy: 0 };
  selectPanel(selected);
});
document.getElementById('sample-boulevard').addEventListener('click', () => loadSample('boulevard', selected));
document.getElementById('sample-pier').addEventListener('click', () => loadSample('pier', selected));

// --- Drag to reposition the photo inside its panel ------------------------
let drag = null;
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  if (document.body.classList.contains('cover-only')) return;
  const p = canvasPoint(e);
  const index = panelAt(canvas.width, canvas.height, state.layout, p.x, p.y);
  if (index < 0 || !state.panels[index].img) return;
  selectPanel(index);
  drag = { index, startX: p.x, startY: p.y, ox: state.panels[index].ox, oy: state.panels[index].oy };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[drag.index];
  // Offsets are fractions of the panel's own width/height, so a drag moves the
  // photo the same visual distance at any export size.
  const rect = layoutRects(canvas.width, canvas.height, state.layout).panels[drag.index];
  panel.ox = drag.ox + (p.x - drag.startX) / rect.w;
  panel.oy = drag.oy + (p.y - drag.startY) / rect.h;
  panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox));
  panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

// --- Export ----------------------------------------------------------------
document.getElementById('export').addEventListener('click', () => {
  const [w, h] = state.exportSize.split('x').map(Number);
  const out = renderExport(state, w, h);
  out.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-cover-${w}x${h}.png`;
  }, 'image/png');
});

// --- Startup: demo / cover-only / shot scenes ------------------------------
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
const view = query.get('view');

async function start() {
  if (shot) {
    await runShot(shot, query, async ({ photo, caption, layout, size }) => {
      state.layout = layout;
      state.title = caption;
      if (query.get('subtitle')) state.subtitle = query.get('subtitle');
      titleInput.value = state.title;
      state.exportSize = size === '1350' ? '1080x1350' : size === '1920' ? '1920x1080' : '1080x1080';
      applyExportSize();
      await loadDemo();
      // The shot's chosen photo fills the hero for a clean cover.
      const img = await loadImage(`samples/${photo}.jpg`);
      state.panels[0] = { img, zoom: 1.05, ox: 0, oy: 0.3 };
      selectPanel(0);
    });
    return;
  }
  if (view === 'cover') {
    document.body.classList.add('cover-only');
    state.layout = query.get('layout') ?? 'classic';
    state.title = query.get('caption') ?? 'VICE CITY';
    if (query.get('subtitle')) state.subtitle = query.get('subtitle');
    const size = query.get('size') ?? '1080';
    state.exportSize = size === '1350' ? '1080x1350' : size === '1920' ? '1920x1080' : '1080x1080';
    applyExportSize();
    await loadDemo();
    const img = await loadImage(`samples/${query.get('photo') ?? 'pier'}.jpg`);
    state.panels[0] = { img, zoom: 1.05, ox: 0, oy: 0.3 };
    redraw();
    await document.fonts.ready;
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
    return;
  }
  if (query.get('demo') === '1') {
    state.layout = query.get('layout') ?? 'classic';
    document.querySelectorAll('#layouts button').forEach((b) => {
      b.classList.toggle('active', b.dataset.layout === state.layout);
    });
    await loadDemo();
    await document.fonts.ready;
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
    return;
  }
  selectPanel(0);
}

start().catch(() => {
  status.textContent = 'Could not load the sample photos — load your own photo to begin.';
  redraw();
});
document.fonts.ready.then(redraw);
