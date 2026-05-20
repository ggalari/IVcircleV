// src/modes/full-circle-view.js
// Full Circle View — wraps the existing circle + neighbor overlay in mode panel 0

import { subscribe, get } from '../state.js';
import { showNeighbors } from '../overlays/neighbors.js';

/**
 * Initialize the Full Circle View inside the first mode panel.
 * Moves the existing circle container and neighbor overlay into the panel,
 * subscribes to activeKey state changes, and shows neighbors for the default key.
 *
 * @param {HTMLElement} panel - The first .mode-panel element from the mode switcher
 * @returns {function} Cleanup function that unsubscribes from state
 */
export function initFullCircleView(panel) {
  // Add title
  const title = document.createElement('h2');
  title.className = 'circle-title';
  title.textContent = 'Cercle des quintes';
  panel.appendChild(title);

  // Move the existing circle container into this panel
  const circleContainer = document.getElementById('circle-container');
  if (circleContainer) {
    panel.appendChild(circleContainer);
  }

  // Move the legend element into this panel
  const legend = document.querySelector('.card > .legend');
  if (legend) panel.appendChild(legend);

  // Show neighbors for the current active key (default: C Major)
  const activeKey = get('activeKey') || { index: 0, type: 'major' };
  showNeighbors(activeKey);

  // Subscribe to activeKey state changes to update the neighbor overlay
  const unsubscribe = subscribe('activeKey', (newKey) => {
    if (newKey) {
      showNeighbors(newKey);
    }
  });

  return unsubscribe;
}
