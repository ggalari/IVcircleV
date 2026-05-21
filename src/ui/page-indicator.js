import { subscribe, get } from '../state.js';

const VIEW_LABELS = ['Cercle', 'Accords', 'Gammes'];

/**
 * Create the page indicator with labeled tabs and subscribe to mode changes.
 * @param {HTMLElement} container - Parent element to append indicator to
 * @returns {function} Cleanup function
 */
export function createPageIndicator(container) {
  const indicator = document.createElement('nav');
  indicator.className = 'page-indicator';
  indicator.setAttribute('aria-label', 'Vues');

  const tabs = [];
  for (let i = 0; i < VIEW_LABELS.length; i++) {
    const tab = document.createElement('span');
    tab.className = 'page-tab';
    tab.textContent = VIEW_LABELS[i];
    tab.dataset.index = i;
    indicator.appendChild(tab);
    tabs.push(tab);
  }

  container.appendChild(indicator);

  function updateTabs(modeIndex) {
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].className = i === modeIndex ? 'page-tab page-tab--active' : 'page-tab';
    }
  }

  // Set initial active state
  updateTabs(get('currentMode') ?? 0);

  // Subscribe to mode changes
  const unsubscribe = subscribe('currentMode', updateTabs);

  return function cleanup() {
    unsubscribe();
    indicator.remove();
  };
}
