import { get, set } from '../state.js';

/**
 * Initialize the mode switcher. Creates the track container with 3 panels.
 * @param {HTMLElement} container - The .card element
 * @returns {{ goTo: function(number): void, next: function(): void, prev: function(): void, current: function(): number, destroy: function(): void }}
 */
export function createModeSwitcher(container) {
  // Create the horizontal track
  const track = document.createElement('div');
  track.className = 'mode-track';

  // Create 3 mode panels
  for (let i = 0; i < 3; i++) {
    const panel = document.createElement('div');
    panel.className = 'mode-panel';
    panel.dataset.mode = i;
    track.appendChild(panel);
  }

  container.appendChild(track);

  function handleTransitionEnd(e) {
    if (e.propertyName === 'transform') {
      set('isTransitioning', false);
    }
  }

  track.addEventListener('transitionend', handleTransitionEnd);

  function applyTransform(modeIndex) {
    // Each panel is one-third of the track width.
    // translateX percentage is relative to the element's own width.
    // Track width = 3 panels, so moving by one panel = 33.333% of track width.
    track.style.transform = `translateX(-${modeIndex * (100 / 3)}%)`;
  }

  /**
   * Navigate to mode index (0, 1, 2). Wraps around circularly.
   * @param {number} n - Target mode index
   */
  function goTo(n) {
    if (get('isTransitioning')) return;

    // Wrap around: 3 → 0, -1 → 2
    const wrapped = ((n % 3) + 3) % 3;
    const currentMode = get('currentMode');

    if (wrapped === currentMode) return;

    set('isTransitioning', true);
    set('currentMode', wrapped);
    applyTransform(wrapped);

    // Fallback: clear isTransitioning after 350ms in case transitionend doesn't fire
    setTimeout(() => {
      set('isTransitioning', false);
    }, 350);
  }

  /** Go to next mode (wraps: 2 → 0) */
  function next() {
    goTo(get('currentMode') + 1);
  }

  /** Go to previous mode (wraps: 0 → 2) */
  function prev() {
    goTo(get('currentMode') - 1);
  }

  /** Get current mode index */
  function current() {
    return get('currentMode');
  }

  /** Cleanup listeners */
  function destroy() {
    track.removeEventListener('transitionend', handleTransitionEnd);
    container.removeChild(track);
  }

  // Set initial position without animation
  applyTransform(get('currentMode'));

  return { goTo, next, prev, current, destroy };
}
