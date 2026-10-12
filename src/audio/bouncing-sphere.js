/**
 * Bouncing Sphere - Animated visual indicator for audio playback.
 * Tracks the current note/chord position during scale or chord sequence playback.
 *
 * @module bouncing-sphere
 */

import {
  SPHERE_DIAMETER,
  SPHERE_Z_INDEX,
  SPHERE_ARC_MAX_HEIGHT,
  SPHERE_ARC_RATIO,
  SPHERE_HIDE_DURATION_MS
} from '../config.js';

/**
 * Creates a bouncing sphere visual indicator within the given container.
 *
 * @param {HTMLElement} containerEl - The container element to position the sphere within.
 * @returns {{ moveTo: (x: number, y: number, durationMs: number) => void, show: () => void, hide: () => void, reset: () => void, destroy: () => void }}
 */
export function createBouncingSphere(containerEl) {
  const HALF = SPHERE_DIAMETER / 2;

  let hasPosition = false;
  let currentX = 0;
  let currentY = 0;
  let destroyed = false;
  let hideTimeout = null;

  // Create the sphere element
  const sphere = document.createElement('div');
  sphere.className = 'bouncing-sphere';
  sphere.style.position = 'absolute';
  // Pin the element to the container origin so moveTo()'s transform is the only
  // offset. Without this, `top: auto` places the sphere at its static position —
  // which is below any preceding content (e.g. a section header) — and every
  // moveTo lands that much too low.
  sphere.style.top = '0';
  sphere.style.left = '0';
  sphere.style.width = `${SPHERE_DIAMETER}px`;
  sphere.style.height = `${SPHERE_DIAMETER}px`;
  sphere.style.borderRadius = '50%';
  sphere.style.background = 'radial-gradient(circle at 35% 35%, rgba(255,120,120,0.95), var(--color-major, #8b0000) 60%, rgba(80,0,0,0.9))';
  sphere.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
  sphere.style.zIndex = String(SPHERE_Z_INDEX);
  sphere.style.pointerEvents = 'none';
  sphere.style.opacity = '0';
  sphere.style.display = 'none';
  sphere.style.willChange = 'transform, opacity';
  sphere.setAttribute('aria-hidden', 'true');

  containerEl.appendChild(sphere);

  /**
   * Move the sphere to a new position.
   * First call: instant appearance (no transition).
   * Subsequent calls: animate with parabolic arc using ease-out.
   *
   * @param {number} x - Target x position (center of element, in px relative to container).
   * @param {number} y - Target y position (center of element, in px relative to container).
   * @param {number} durationMs - Duration of transition in milliseconds.
   */
  function moveTo(x, y, durationMs) {
    if (destroyed) return;

    // Cancel any pending hide — we're actively positioning
    if (hideTimeout !== null) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    const targetX = x - HALF;
    const targetY = y - HALF;

    if (!hasPosition) {
      // First element: appear instantly without transition
      sphere.style.transition = 'none';
      sphere.style.transform = `translate(${targetX}px, ${targetY}px)`;
      sphere.style.opacity = '1';
      sphere.style.display = 'block';
      hasPosition = true;
      currentX = targetX;
      currentY = targetY;
      return;
    }

    // Subsequent elements: animate with bounce arc
    // Calculate arc height based on horizontal distance for parabolic effect
    const dx = Math.abs(targetX - currentX);
    const arcHeight = Math.min(dx * SPHERE_ARC_RATIO, SPHERE_ARC_MAX_HEIGHT);

    // Use CSS transition for the main movement with ease-out
    sphere.style.transition = `transform ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    sphere.style.transform = `translate(${targetX}px, ${targetY}px)`;

    // Apply vertical bounce via Web Animations API if available and there's meaningful horizontal movement
    if (arcHeight > 2 && typeof sphere.animate === 'function') {
      sphere.animate([
        { transform: `translate(${currentX}px, ${currentY}px)` },
        { transform: `translate(${(currentX + targetX) / 2}px, ${Math.min(currentY, targetY) - arcHeight}px)` },
        { transform: `translate(${targetX}px, ${targetY}px)` }
      ], {
        duration: durationMs,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      });
    }

    currentX = targetX;
    currentY = targetY;
  }

  /**
   * Show the sphere (make visible).
   * Cancels any pending hide timeout to prevent race conditions.
   */
  function show() {
    if (destroyed) return;
    if (hideTimeout !== null) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    sphere.style.display = 'block';
    sphere.style.opacity = '1';
  }

  /**
   * Hide the sphere within a short fade-out.
   */
  function hide() {
    if (destroyed) return;
    if (hideTimeout !== null) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    sphere.style.transition = `opacity ${SPHERE_HIDE_DURATION_MS}ms ease-out`;
    sphere.style.opacity = '0';
    // Reset position tracking synchronously so next show starts fresh
    hasPosition = false;
    hideTimeout = setTimeout(() => {
      hideTimeout = null;
      if (!destroyed) {
        sphere.style.display = 'none';
      }
    }, SPHERE_HIDE_DURATION_MS);
  }

  /**
   * Reset the sphere to its initial state (hidden, no position).
   * Call this before starting a new playback sequence.
   * Cancels any pending hide timeouts and running animations.
   */
  function reset() {
    if (destroyed) return;
    if (hideTimeout !== null) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    // Cancel any running Web Animations to prevent stale transforms
    if (typeof sphere.getAnimations === 'function') {
      sphere.getAnimations().forEach(a => a.cancel());
    }
    sphere.style.transition = 'none';
    sphere.style.transform = '';
    sphere.style.opacity = '0';
    sphere.style.display = 'none';
    hasPosition = false;
    currentX = 0;
    currentY = 0;
  }

  /**
   * Remove element from DOM and clean up.
   */
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (sphere.parentNode) {
      sphere.parentNode.removeChild(sphere);
    }
  }

  return { moveTo, show, hide, reset, destroy };
}
