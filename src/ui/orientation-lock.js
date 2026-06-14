/**
 * Orientation Lock Module
 *
 * Attempts to lock screen orientation to landscape on phone-sized viewports.
 * Falls back to showing the orientation prompt on failure or API unavailability.
 * Unlocks when viewport exceeds the phone breakpoint.
 *
 * Requirements: 5.2, 5.3, 5.4, 5.5, 6.1, 6.2
 */

import { showOrientationPrompt } from './orientation-prompt.js';

const BREAKPOINT = 600;
const DEBOUNCE_MS = 100;

/**
 * Attempts to lock screen orientation to landscape on phone-sized viewports.
 * Falls back to showing the orientation prompt on failure.
 * Unlocks when viewport exceeds breakpoint.
 *
 * @returns {() => void} Cleanup function that removes resize listener and unlocks if active
 */
export function initOrientationLock() {
  let lockActive = false;
  let promptCleanup = null;
  let debounceTimer = null;
  let wasSmallViewport = window.innerWidth <= BREAKPOINT;

  /**
   * Attempts to lock orientation to landscape.
   * On failure or API unavailability, shows the orientation prompt.
   */
  function attemptLock() {
    // Never attempt lock when viewport > breakpoint (Req 6.2)
    if (window.innerWidth > BREAKPOINT) {
      return;
    }

    if (
      typeof screen !== 'undefined' &&
      screen.orientation &&
      typeof screen.orientation.lock === 'function'
    ) {
      screen.orientation.lock('landscape').then(
        () => {
          lockActive = true;
        },
        () => {
          // Lock rejected — show orientation prompt (Req 5.3)
          lockActive = false;
          promptCleanup = showOrientationPrompt();
        }
      );
    } else {
      // API unavailable — show orientation prompt (Req 5.3)
      lockActive = false;
      promptCleanup = showOrientationPrompt();
    }
  }

  /**
   * Releases the orientation lock if one is active.
   */
  function releaseLock() {
    if (lockActive) {
      if (
        typeof screen !== 'undefined' &&
        screen.orientation &&
        typeof screen.orientation.unlock === 'function'
      ) {
        screen.orientation.unlock();
      }
      lockActive = false;
    }
  }

  /**
   * Handles viewport resize transitions across the breakpoint.
   * Debounced at 100ms to avoid thrashing.
   */
  function handleResize() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const isSmallViewport = window.innerWidth <= BREAKPOINT;

      if (!isSmallViewport && wasSmallViewport) {
        // Viewport transitioned to >600px — release lock (Req 5.4, 5.5)
        releaseLock();
      } else if (isSmallViewport && !wasSmallViewport) {
        // Viewport transitioned back to ≤600px — re-attempt lock
        attemptLock();
      }

      wasSmallViewport = isSmallViewport;
    }, DEBOUNCE_MS);
  }

  // On load: attempt lock if viewport ≤ 600px (Req 5.2)
  if (window.innerWidth <= BREAKPOINT) {
    attemptLock();
  }

  // Listen for resize events
  window.addEventListener('resize', handleResize);

  /**
   * Cleanup function: removes resize listener and unlocks if active.
   */
  return function cleanup() {
    clearTimeout(debounceTimer);
    window.removeEventListener('resize', handleResize);
    releaseLock();
    if (promptCleanup) {
      promptCleanup();
      promptCleanup = null;
    }
  };
}
