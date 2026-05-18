/**
 * @typedef {Object} MenuDimensions
 * @property {number} width - Menu element width in px
 * @property {number} height - Menu element height in px
 */

/**
 * @typedef {Object} ViewportDimensions
 * @property {number} width - Viewport width in px
 * @property {number} height - Viewport height in px
 */

/**
 * @typedef {Object} Position
 * @property {number} x - Left offset in px
 * @property {number} y - Top offset in px
 */

/**
 * @typedef {Object} ClampedResult
 * @property {number} x - Clamped left offset
 * @property {number} y - Clamped top offset
 * @property {number} maxHeight - Maximum allowed height (viewport.height - 2*inset)
 * @property {boolean} needsScroll - Whether menu needs vertical scrolling
 */

const INSET = 8;

/**
 * Clamp a menu position so all edges remain at least `inset` px inside the viewport.
 * @param {Position} desired - Desired top-left position
 * @param {MenuDimensions} menu - Menu dimensions
 * @param {ViewportDimensions} viewport - Viewport dimensions
 * @param {number} [inset=8] - Minimum distance from viewport edges
 * @returns {ClampedResult}
 */
export function clampMenuPosition(desired, menu, viewport, inset = INSET) {
  const maxWidth = viewport.width - 2 * inset;
  const maxHeight = viewport.height - 2 * inset;
  const effectiveWidth = Math.min(menu.width, maxWidth);
  const effectiveHeight = Math.min(menu.height, maxHeight);

  let x = Math.max(inset, Math.min(desired.x, viewport.width - effectiveWidth - inset));
  let y = Math.max(inset, Math.min(desired.y, viewport.height - effectiveHeight - inset));

  return {
    x,
    y,
    maxHeight,
    needsScroll: menu.height > maxHeight
  };
}

/**
 * Compute context menu width constraints for a given viewport width.
 * @param {number} viewportWidth
 * @param {number} [breakpoint=600] - Small breakpoint
 * @returns {{ minWidth: number, maxWidth: number }}
 */
export function getMenuWidthConstraints(viewportWidth, breakpoint = 600) {
  if (viewportWidth <= breakpoint) {
    return {
      minWidth: 180,
      maxWidth: viewportWidth - 16
    };
  }
  return {
    minWidth: 160,
    maxWidth: Infinity
  };
}
