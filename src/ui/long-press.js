/**
 * Long-press gesture detection module.
 *
 * State machine: Idle → Waiting → Feedback (200ms) → Active (500ms)
 *
 * @typedef {Object} LongPressConfig
 * @property {number} [threshold=500] - Time in ms to trigger long-press
 * @property {number} [moveThreshold=10] - Max movement in px before cancel
 * @property {number} [feedbackDelay=200] - Time in ms before visual feedback
 * @property {function} onLongPress - Callback when long-press completes (receives {x, y})
 * @property {function} [onFeedbackStart] - Callback when visual feedback should begin
 * @property {function} [onCancel] - Callback when gesture is cancelled
 */

/**
 * Compute Euclidean distance between two points.
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 * @returns {number}
 */
export function distance(a, b) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/**
 * Determine if a movement exceeds the long-press cancellation threshold.
 * @param {{ x: number, y: number }} start - Initial touch point
 * @param {{ x: number, y: number }} current - Current touch point
 * @param {number} [threshold=10] - Maximum allowed movement in px
 * @returns {boolean} True if movement exceeds threshold (gesture should cancel)
 */
export function exceedsMovementThreshold(start, current, threshold = 10) {
  return distance(start, current) > threshold;
}

// Internal states
const STATE_IDLE = 'idle';
const STATE_WAITING = 'waiting';
const STATE_FEEDBACK = 'feedback';
const STATE_ACTIVE = 'active';

/**
 * Attach long-press detection to an element.
 * Returns a cleanup function to remove all listeners.
 *
 * @param {Element} element - The DOM element to attach long-press detection to
 * @param {LongPressConfig} config - Configuration for the long-press gesture
 * @returns {function} Cleanup function to remove all listeners
 */
export function attachLongPress(element, config) {
  const threshold = config.threshold ?? 500;
  const moveThreshold = config.moveThreshold ?? 10;
  const feedbackDelay = config.feedbackDelay ?? 200;

  let state = STATE_IDLE;
  let startPoint = null;
  let feedbackTimer = null;
  let longPressTimer = null;

  function cancel() {
    if (state === STATE_IDLE) return;

    clearTimeout(feedbackTimer);
    clearTimeout(longPressTimer);
    feedbackTimer = null;
    longPressTimer = null;

    if (state === STATE_FEEDBACK || state === STATE_ACTIVE) {
      if (config.onCancel) config.onCancel();
    } else if (state === STATE_WAITING) {
      if (config.onCancel) config.onCancel();
    }

    state = STATE_IDLE;
    startPoint = null;
  }

  function handleTouchStart(e) {
    // Only handle single-touch gestures
    if (e.touches.length !== 1) {
      cancel();
      return;
    }

    const touch = e.touches[0];
    startPoint = { x: touch.clientX, y: touch.clientY };
    state = STATE_WAITING;

    // Suppress context menu and text selection during gesture
    e.preventDefault();

    // Start feedback timer (200ms)
    feedbackTimer = setTimeout(() => {
      if (state === STATE_WAITING) {
        state = STATE_FEEDBACK;
        if (config.onFeedbackStart) {
          config.onFeedbackStart();
        }
      }
    }, feedbackDelay);

    // Start long-press timer (500ms)
    longPressTimer = setTimeout(() => {
      if (state === STATE_WAITING || state === STATE_FEEDBACK) {
        state = STATE_ACTIVE;
        if (config.onLongPress) {
          config.onLongPress({ x: startPoint.x, y: startPoint.y });
        }
        // After triggering, return to idle
        state = STATE_IDLE;
        startPoint = null;
      }
    }, threshold);
  }

  function handleTouchMove(e) {
    if (state === STATE_IDLE) return;

    const touch = e.touches[0];
    const current = { x: touch.clientX, y: touch.clientY };

    if (exceedsMovementThreshold(startPoint, current, moveThreshold)) {
      cancel();
    }
  }

  function handleTouchEnd(e) {
    // If finger lifts before threshold, cancel (treat as tap)
    if (state === STATE_WAITING || state === STATE_FEEDBACK) {
      cancel();
    }
  }

  function handleTouchCancel(e) {
    cancel();
  }

  function handleContextMenu(e) {
    // Suppress browser context menu on this element during touch interactions
    if (state !== STATE_IDLE) {
      e.preventDefault();
    }
  }

  // Attach listeners
  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: true });
  element.addEventListener('touchend', handleTouchEnd);
  element.addEventListener('touchcancel', handleTouchCancel);
  element.addEventListener('contextmenu', handleContextMenu);

  // Return cleanup function
  return function cleanup() {
    cancel();
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchcancel', handleTouchCancel);
    element.removeEventListener('contextmenu', handleContextMenu);
  };
}
