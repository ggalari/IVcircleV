import '../style.css';
import { renderCircle } from './circle/renderer.js';
import { createOverlay } from './overlays/neighbors.js';
import { attachContextMenuListeners } from './ui/context-menu.js';
import { attachToolbarListeners } from './ui/toolbar.js';
import { attachTouchHandlers } from './ui/touch-handler.js';
import { attachHamburgerMenu } from './ui/hamburger.js';
import { set } from './state.js';
import { createModeSwitcher } from './modes/mode-switcher.js';
import { initFullCircleView } from './modes/full-circle-view.js';
import { initChordExplorerView } from './modes/chord-explorer-view.js';
import { initScaleExplorerView } from './modes/scale-explorer-view.js';
import { createPageIndicator } from './ui/page-indicator.js';
import { createChevrons } from './ui/chevrons.js';
import { attachKeyboardNav } from './ui/keyboard-nav.js';
import { attachSwipeHandler } from './modes/swipe-handler.js';
import { hitTestKey } from './modes/hit-test.js';

document.addEventListener('DOMContentLoaded', () => {
  try {
    // 1. Existing circle rendering (keep as-is)
    renderCircle('circle-container');
    const svg = document.querySelector('#circle-container svg');
    if (svg) createOverlay(svg);

    // Wire touch handlers to prevent unintended zoom/scroll on the SVG container
    const circleContainer = document.getElementById('circle-container');
    attachTouchHandlers(circleContainer);

    attachContextMenuListeners();

    // Desktop click handler for key selection in circle view
    if (svg) {
      svg.addEventListener('click', (e) => {
        const hit = hitTestKey({ x: e.clientX, y: e.clientY }, svg);
        if (hit) {
          set('activeKey', { index: hit.index, type: hit.type });
        }
      });
    }

    attachToolbarListeners();
    attachHamburgerMenu();

    // 2. Initialize activeKey state
    set('activeKey', { index: 0, type: 'major' });

    // 3. Create mode switcher (creates the track with 3 panels)
    const container = document.querySelector('.card');
    const modeSwitcher = createModeSwitcher(container);

    // Get panels from the mode switcher track
    const panels = container.querySelectorAll('.mode-panel');

    // 4. Move circle into first panel
    initFullCircleView(panels[0]);

    // 5. Set up chord view in second panel
    initChordExplorerView(panels[1]);

    // 6. Set up scale view in third panel
    initScaleExplorerView(panels[2]);

    // 7. Add page indicator dots
    createPageIndicator(container);

    // 8. Add chevron navigation buttons
    createChevrons(container, {
      onNext: () => modeSwitcher.next(),
      onPrev: () => modeSwitcher.prev(),
    });

    // 9. Attach keyboard navigation
    attachKeyboardNav({
      onNext: () => modeSwitcher.next(),
      onPrev: () => modeSwitcher.prev(),
    });

    // 10. Attach swipe/tap handler on the mode track
    const trackElement = container.querySelector('.mode-track');
    attachSwipeHandler(trackElement, {
      onSwipe(direction) {
        if (direction === 'swipe-left') {
          modeSwitcher.next();
        } else if (direction === 'swipe-right') {
          modeSwitcher.prev();
        }
      },
      onTap({ x, y }) {
        const svgEl = document.querySelector('#circle-container svg');
        if (!svgEl) return;
        const hit = hitTestKey({ x, y }, svgEl);
        if (hit) {
          set('activeKey', { index: hit.index, type: hit.type });
        }
      },
    });
  } catch (err) {
    document.getElementById('circle-container').innerHTML =
      `<p style="color:red">Failed to load application: ${err.message}</p>`;
  }
});
