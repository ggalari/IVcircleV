import { subscribe, get } from '../state.js';

const NUM_DOTS = 3;

/**
 * Create the page indicator DOM element and subscribe to mode changes.
 * @param {HTMLElement} container - Parent element to append indicator to
 * @returns {function} Cleanup function
 */
export function createPageIndicator(container) {
  const indicator = document.createElement('div');
  indicator.className = 'page-indicator';

  const dots = [];
  for (let i = 0; i < NUM_DOTS; i++) {
    const dot = document.createElement('span');
    dot.className = 'page-dot';
    indicator.appendChild(dot);
    dots.push(dot);
  }

  container.appendChild(indicator);

  function updateDots(modeIndex) {
    for (let i = 0; i < dots.length; i++) {
      dots[i].className = i === modeIndex ? 'page-dot page-dot--active' : 'page-dot';
    }
  }

  // Set initial active state
  updateDots(get('currentMode') ?? 0);

  // Subscribe to mode changes
  const unsubscribe = subscribe('currentMode', updateDots);

  return function cleanup() {
    unsubscribe();
    indicator.remove();
  };
}
