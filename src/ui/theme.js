/**
 * Dark/light theme toggle.
 * Persisted in a cookie. Respects prefers-color-scheme as default.
 */

const COOKIE_NAME = 'theme';

/**
 * Get the saved theme preference, or detect from system.
 * @returns {'light' | 'dark'}
 */
export function getTheme() {
  const match = document.cookie.match(/(?:^|;\s*)theme=([^;]*)/);
  if (match) return match[1] === 'dark' ? 'dark' : 'light';
  // Default: respect system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Set the theme and persist in cookie.
 * @param {'light' | 'dark'} theme
 */
export function setTheme(theme) {
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${theme};max-age=${maxAge};path=/;SameSite=Lax`;
  applyTheme(theme);
}

/**
 * Apply the theme to the document.
 * @param {'light' | 'dark'} theme
 */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const metaThemeColor = document.getElementById('meta-theme-color');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1816' : '#2d2b2a');
  }
}

/**
 * Toggle between light and dark.
 */
export function toggleTheme() {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  updateThemeButton();
}

/**
 * Update the toggle button text to reflect current state.
 */
export function updateThemeButton() {
  const btn = document.getElementById('btn-toggle-theme');
  if (!btn) return;
  const theme = getTheme();
  const label = btn.querySelector('.dropdown-item__label');
  if (label) {
    label.textContent = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
  }
}

/**
 * Initialize theme on page load.
 */
export function initTheme() {
  const theme = getTheme();
  applyTheme(theme);
  updateThemeButton();
}
