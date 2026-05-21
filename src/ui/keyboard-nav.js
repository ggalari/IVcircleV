import { get, set } from '../state.js';

/**
 * Attach keyboard navigation:
 * - Left/Right arrows: switch between views (modes)
 * - Up/Down arrows: cycle through keys (12 positions)
 * - M key: toggle between major/minor ring
 *
 * Ignores key presses when a text input is focused.
 * @param {Object} callbacks
 * @param {function(): void} callbacks.onNext
 * @param {function(): void} callbacks.onPrev
 * @returns {function} Cleanup function
 */
export function attachKeyboardNav(callbacks) {
  const IGNORED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

  function handleKeydown(e) {
    if (IGNORED_TAGS.has(document.activeElement?.tagName)) {
      return;
    }

    if (e.key === 'ArrowLeft') {
      callbacks.onPrev();
    } else if (e.key === 'ArrowRight') {
      callbacks.onNext();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cycleKey(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      cycleKey(1);
    } else if (e.key === 'm' || e.key === 'M') {
      toggleKeyType();
    }
  }

  /**
   * Cycle the active key index by the given offset (wraps 0-11).
   */
  function cycleKey(offset) {
    const activeKey = get('activeKey') || { index: 0, type: 'major' };
    const newIndex = ((activeKey.index + offset) % 12 + 12) % 12;
    set('activeKey', { index: newIndex, type: activeKey.type });
  }

  /**
   * Toggle between major and minor for the current key index.
   */
  function toggleKeyType() {
    const activeKey = get('activeKey') || { index: 0, type: 'major' };
    const newType = activeKey.type === 'major' ? 'minor' : 'major';
    set('activeKey', { index: activeKey.index, type: newType });
  }

  document.addEventListener('keydown', handleKeydown);

  return function cleanup() {
    document.removeEventListener('keydown', handleKeydown);
  };
}
