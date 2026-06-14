/**
 * Orientation Prompt Module
 *
 * Displays a landscape orientation suggestion overlay on phone-sized screens
 * when the device is in portrait orientation. Persists dismissal state in
 * sessionStorage for the duration of the browser session.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.4
 */

const STORAGE_KEY = 'orientation-prompt-dismissed';
const DEFAULT_BREAKPOINT = 600;
const LANDSCAPE_DISMISS_DELAY = 300;
const BREAKPOINT_DISMISS_DELAY = 100;

/**
 * Safely read from sessionStorage (private browsing may throw).
 * @returns {boolean}
 */
function isDismissed() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Safely write to sessionStorage.
 */
function setDismissed() {
  try {
    sessionStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Private browsing — graceful degradation
  }
}

/**
 * Creates the orientation prompt overlay DOM element.
 * @returns {HTMLElement}
 */
function createOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'orientation-prompt';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', "Suggestion d'orientation");

  overlay.innerHTML = `
    <div class="orientation-prompt__content">
      <svg class="orientation-prompt__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
        <path d="M15 19h2"/>
        <path d="M20 7l2 2-2 2"/>
        <path d="M17 9h5"/>
      </svg>
      <p class="orientation-prompt__text">Tournez votre appareil pour une meilleure expérience</p>
      <button class="orientation-prompt__dismiss" aria-label="Fermer">✕</button>
    </div>
  `;

  return overlay;
}

/**
 * Shows a landscape orientation prompt if conditions are met:
 * - viewport ≤ breakpoint
 * - device is in portrait (innerWidth <= innerHeight)
 * - user hasn't dismissed in this session
 *
 * @param {object} [options]
 * @param {number} [options.breakpoint=600] - Max viewport width to show prompt
 * @returns {() => void} Cleanup function that removes listeners and DOM element
 */
export function showOrientationPrompt(options) {
  const breakpoint = (options && options.breakpoint) || DEFAULT_BREAKPOINT;

  // If already dismissed, return a no-op cleanup
  if (isDismissed()) {
    return () => {};
  }

  // If not on a phone-sized screen or already landscape, don't show
  if (window.innerWidth > breakpoint || window.innerWidth > window.innerHeight) {
    return () => {};
  }

  const overlay = createOverlay();
  document.body.appendChild(overlay);

  let dismissed = false;
  let landscapeTimer = null;
  let breakpointTimer = null;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(landscapeTimer);
    clearTimeout(breakpointTimer);
    setDismissed();
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    cleanup();
  }

  function handleResize() {
    if (dismissed) return;

    // Auto-dismiss within 100ms when viewport transitions above breakpoint (Req 6.4)
    if (window.innerWidth > breakpoint) {
      clearTimeout(breakpointTimer);
      breakpointTimer = setTimeout(dismiss, BREAKPOINT_DISMISS_DELAY);
      return;
    }

    // Auto-dismiss within 300ms when landscape detected (Req 4.5)
    if (window.innerWidth > window.innerHeight) {
      clearTimeout(landscapeTimer);
      landscapeTimer = setTimeout(dismiss, LANDSCAPE_DISMISS_DELAY);
    }
  }

  function handleOrientationChange() {
    if (dismissed) return;
    // Use a short delay to let the browser update dimensions
    clearTimeout(landscapeTimer);
    landscapeTimer = setTimeout(() => {
      if (window.innerWidth > window.innerHeight) {
        dismiss();
      }
    }, LANDSCAPE_DISMISS_DELAY);
  }

  // Dismiss button click
  const dismissBtn = overlay.querySelector('.orientation-prompt__dismiss');
  dismissBtn.addEventListener('click', dismiss);

  // Listen for orientation/resize changes
  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('resize', handleResize);

  function cleanup() {
    dismissBtn.removeEventListener('click', dismiss);
    window.removeEventListener('orientationchange', handleOrientationChange);
    window.removeEventListener('resize', handleResize);
    clearTimeout(landscapeTimer);
    clearTimeout(breakpointTimer);
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  return cleanup;
}
