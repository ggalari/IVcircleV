/**
 * @typedef {'tap' | 'swipe-left' | 'swipe-right' | 'discard'} GestureType
 */

// Thresholds (exported for testing)
export const SWIPE_MIN_DX = 30;       // px
export const SWIPE_MAX_DURATION = 300; // ms
export const TAP_MAX_DISPLACEMENT = 10; // px
export const TAP_MAX_DURATION = 300;   // ms

/**
 * Classify a touch interaction based on displacement and duration.
 * Swipe check takes priority over tap check.
 *
 * @param {number} dx - Horizontal displacement (positive = right)
 * @param {number} dy - Vertical displacement
 * @param {number} duration - Touch duration in milliseconds
 * @returns {GestureType}
 */
export function classifyGesture(dx, dy, duration) {
  // Swipe check first (takes priority)
  if (Math.abs(dx) > SWIPE_MIN_DX && duration < SWIPE_MAX_DURATION) {
    return dx < 0 ? 'swipe-left' : 'swipe-right';
  }

  // Tap check
  const displacement = Math.sqrt(dx * dx + dy * dy);
  if (displacement <= TAP_MAX_DISPLACEMENT && duration <= TAP_MAX_DURATION) {
    return 'tap';
  }

  // Everything else is discarded
  return 'discard';
}
