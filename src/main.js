import '../style.css';
import { renderCircle } from './circle/renderer.js';
import { createOverlay } from './overlays/neighbors.js';
import { attachContextMenuListeners } from './ui/context-menu.js';
import { attachToolbarListeners } from './ui/toolbar.js';

document.addEventListener('DOMContentLoaded', () => {
  try {
    renderCircle('circle-container');
    const svg = document.querySelector('#circle-container svg');
    if (svg) createOverlay(svg);
    attachContextMenuListeners();
    attachToolbarListeners();
  } catch (err) {
    document.getElementById('circle-container').innerHTML =
      `<p style="color:red">Failed to load application: ${err.message}</p>`;
  }
});
