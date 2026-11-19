// Fixed scenes for screenshots. `?shot=cover` shows the cover alone (cover-only view);
// `?shot=editor` shows the editor with sample photos loaded. `photo` picks the sample
// (samples/<photo>.jpg), `caption` the title, `layout` the poster layout, `size`
// the export size (1080, 1350 or 1920) for cover shots.
// window.__shotReady is set once the cover has painted.
export async function runShot(shot, query, load) {
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'VICE CITY';
  const layout = query.get('layout') ?? 'classic';
  const size = query.get('size') ?? '1080';
  if (shot === 'cover') document.body.classList.add('cover-only');
  await load({ photo, caption, layout, size, view: shot === 'cover' ? 'cover' : 'editor' });
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
