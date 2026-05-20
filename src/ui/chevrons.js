import { subscribe, get } from '../state.js';

/**
 * Chevrons are always visible since navigation wraps around.
 */
function updateVisibility(leftBtn, rightBtn, mode) {
  leftBtn.style.display = '';
  rightBtn.style.display = '';
}

/**
 * Create chevron navigation buttons and subscribe to mode changes.
 * @param {HTMLElement} container - Parent element
 * @param {Object} callbacks
 * @param {function(): void} callbacks.onNext - Called when right chevron clicked
 * @param {function(): void} callbacks.onPrev - Called when left chevron clicked
 * @returns {function} Cleanup function
 */
export function createChevrons(container, callbacks) {
  const leftBtn = document.createElement('button');
  leftBtn.className = 'chevron-btn chevron-left';
  leftBtn.textContent = '\u2039';
  leftBtn.setAttribute('aria-label', 'Previous mode');

  const rightBtn = document.createElement('button');
  rightBtn.className = 'chevron-btn chevron-right';
  rightBtn.textContent = '\u203A';
  rightBtn.setAttribute('aria-label', 'Next mode');

  container.appendChild(leftBtn);
  container.appendChild(rightBtn);

  // Set initial visibility
  const currentMode = get('currentMode');
  updateVisibility(leftBtn, rightBtn, currentMode);

  // Subscribe to mode changes
  const unsubscribe = subscribe('currentMode', (mode) => {
    updateVisibility(leftBtn, rightBtn, mode);
  });

  // Wire click handlers
  const handlePrev = () => callbacks.onPrev();
  const handleNext = () => callbacks.onNext();

  leftBtn.addEventListener('click', handlePrev);
  rightBtn.addEventListener('click', handleNext);

  // Return cleanup function
  return () => {
    unsubscribe();
    leftBtn.removeEventListener('click', handlePrev);
    rightBtn.removeEventListener('click', handleNext);
    leftBtn.remove();
    rightBtn.remove();
  };
}
