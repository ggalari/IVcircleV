import '../style.css';
import { renderCircle } from './circle/renderer.js';
import { createOverlay } from './overlays/neighbors.js';
import { attachContextMenuListeners } from './ui/context-menu.js';
import { attachToolbarListeners } from './ui/toolbar.js';
import { attachTouchHandlers } from './ui/touch-handler.js';
import { attachHamburgerMenu } from './ui/hamburger.js';

document.addEventListener('DOMContentLoaded', () => {
  try {
    renderCircle('circle-container');
    const svg = document.querySelector('#circle-container svg');
    if (svg) createOverlay(svg);

    // Wire touch handlers to prevent unintended zoom/scroll on the SVG container
    const circleContainer = document.getElementById('circle-container');
    attachTouchHandlers(circleContainer);

    attachContextMenuListeners();
    attachToolbarListeners();
    attachHamburgerMenu();
  } catch (err) {
    document.getElementById('circle-container').innerHTML =
      `<p style="color:red">Failed to load application: ${err.message}</p>`;
  }
});
