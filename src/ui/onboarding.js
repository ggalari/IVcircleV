/**
 * First-run onboarding hint.
 * Shows a single line of text below the circle title on first visit.
 * Fades out after 5 seconds or on first user interaction.
 * Dismissal is persisted in a cookie so it never shows again.
 */

const COOKIE_NAME = 'onboardingDismissed';

/**
 * Check if onboarding has been dismissed.
 */
function isDismissed() {
  return document.cookie.includes(`${COOKIE_NAME}=true`);
}

/**
 * Mark onboarding as dismissed (1 year cookie).
 */
function dismiss() {
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=true;max-age=${maxAge};path=/;SameSite=Lax`;
}

/**
 * Show the onboarding hint in the given panel, after the title element.
 * @param {HTMLElement} panel - The circle view panel
 * @returns {function} Cleanup function
 */
export function showOnboardingHint(panel) {
  if (isDismissed()) return () => {};

  const hint = document.createElement('p');
  hint.className = 'onboarding-hint';
  hint.textContent = 'Glissez ← → pour accords et gammes · Touchez une tonalité · M pour mineur';

  // Insert after the title
  const title = panel.querySelector('.circle-title');
  if (title && title.nextSibling) {
    panel.insertBefore(hint, title.nextSibling);
  } else {
    panel.appendChild(hint);
  }

  let removed = false;

  function remove() {
    if (removed) return;
    removed = true;
    hint.classList.add('onboarding-hint--fading');
    setTimeout(() => {
      if (hint.parentNode) hint.parentNode.removeChild(hint);
    }, 300);
    dismiss();
    cleanup();
  }

  // Auto-dismiss after 5 seconds
  const timer = setTimeout(remove, 5000);

  // Dismiss on any user interaction
  function handleInteraction() {
    remove();
  }

  document.addEventListener('touchstart', handleInteraction, { once: true });
  document.addEventListener('click', handleInteraction, { once: true });
  document.addEventListener('keydown', handleInteraction, { once: true });

  function cleanup() {
    clearTimeout(timer);
    document.removeEventListener('touchstart', handleInteraction);
    document.removeEventListener('click', handleInteraction);
    document.removeEventListener('keydown', handleInteraction);
  }

  return cleanup;
}
