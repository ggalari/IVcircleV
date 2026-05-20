/**
 * Attach keyboard navigation (left/right arrow keys).
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
    }
  }

  document.addEventListener('keydown', handleKeydown);

  return function cleanup() {
    document.removeEventListener('keydown', handleKeydown);
  };
}
