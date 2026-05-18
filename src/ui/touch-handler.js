/**
 * Attach touch event handlers to the SVG container to prevent
 * unintended elastic overscroll (bounce) while allowing pinch-to-zoom
 * and long-press gestures to work normally.
 *
 * Rules:
 * - Single touch drag within SVG when page is at scroll boundary: prevent bounce
 * - Multi-touch (pinch-to-zoom): allowed — do not interfere
 * - Touch outside SVG: allow normal scrolling
 * - Long-press: not affected (handled by long-press.js)
 *
 * @param {Element} svgContainer - The #circle-container element
 * @param {object} [options] - Optional overrides (for testing)
 * @param {function} [options.getScrollState] - Returns { scrollTop, scrollHeight, clientHeight }
 * @returns {function} Cleanup function to remove listeners
 */
export function attachTouchHandlers(svgContainer, options = {}) {
  if (!svgContainer) {
    return () => {};
  }

  const getScrollState = options.getScrollState || (() => ({
    scrollTop: document.documentElement.scrollTop || document.body.scrollTop,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));

  let active = false;
  let startY = 0;

  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      active = true;
      startY = e.touches[0].clientY;
    } else {
      // Multi-touch: don't interfere (allow pinch-to-zoom)
      active = false;
    }
  }

  function handleTouchMove(e) {
    if (!active) return;
    // Allow multi-touch (pinch-to-zoom) through
    if (e.touches.length > 1) return;

    const { scrollTop, scrollHeight, clientHeight } = getScrollState();
    const deltaY = e.touches[0].clientY - startY;

    // At top and pulling down, or at bottom and pulling up → prevent bounce
    const atTop = scrollTop <= 0 && deltaY > 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight && deltaY < 0;

    if (atTop || atBottom) {
      e.preventDefault();
    }
  }

  function handleTouchEnd() {
    active = false;
  }

  svgContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
  svgContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
  svgContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
  svgContainer.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  return function cleanup() {
    svgContainer.removeEventListener('touchstart', handleTouchStart);
    svgContainer.removeEventListener('touchmove', handleTouchMove);
    svgContainer.removeEventListener('touchend', handleTouchEnd);
    svgContainer.removeEventListener('touchcancel', handleTouchEnd);
    active = false;
  };
}
