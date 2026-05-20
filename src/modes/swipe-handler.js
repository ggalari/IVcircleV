import { classifyGesture } from './gesture-classifier.js';

/**
 * Attach swipe detection to the mode track.
 * @param {HTMLElement} trackElement - The horizontal track container
 * @param {Object} callbacks
 * @param {function(GestureType): void} callbacks.onSwipe - Called for swipe gestures
 * @param {function({x: number, y: number}): void} callbacks.onTap - Called for tap gestures with initial touch coordinates
 * @returns {function} Cleanup function
 */
export function attachSwipeHandler(trackElement, callbacks) {
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  function handleTouchStart(e) {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
  }

  function handleTouchMove(e) {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);

    // Prevent page scroll when horizontal displacement exceeds vertical
    if (dx > dy) {
      e.preventDefault();
    }
  }

  function handleTouchEnd(e) {
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;

    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    const dx = endX - startX;
    const dy = endY - startY;
    const duration = endTime - startTime;

    const result = classifyGesture(dx, dy, duration);

    if (result === 'swipe-left' || result === 'swipe-right') {
      callbacks.onSwipe(result);
    } else if (result === 'tap') {
      callbacks.onTap({ x: startX, y: startY });
    }
    // 'discard' → do nothing
  }

  trackElement.addEventListener('touchstart', handleTouchStart, { passive: true });
  trackElement.addEventListener('touchmove', handleTouchMove, { passive: false });
  trackElement.addEventListener('touchend', handleTouchEnd, { passive: true });

  return function cleanup() {
    trackElement.removeEventListener('touchstart', handleTouchStart);
    trackElement.removeEventListener('touchmove', handleTouchMove);
    trackElement.removeEventListener('touchend', handleTouchEnd);
  };
}
