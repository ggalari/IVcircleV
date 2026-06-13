/**
 * Instrument preference persistence via cookie.
 * Mirrors the pattern used in theme.js (pure cookie read/write functions).
 */

const COOKIE_NAME = 'instrument';
const VALID_VALUES = ['guitar', 'piano'];
const DEFAULT_VALUE = 'guitar';

/**
 * Get the saved instrument preference from the cookie.
 * Returns the cookie value if valid ('guitar' or 'piano'), otherwise defaults to 'guitar'.
 * @returns {'guitar' | 'piano'}
 */
export function getInstrument() {
  const match = document.cookie.match(/(?:^|;\s*)instrument=([^;]*)/);
  if (match && VALID_VALUES.includes(match[1])) {
    return match[1];
  }
  return DEFAULT_VALUE;
}

/**
 * Set the instrument preference and persist in cookie.
 * @param {'guitar' | 'piano'} value
 */
export function setInstrument(value) {
  document.cookie = `${COOKIE_NAME}=${value};max-age=31536000;path=/;SameSite=Lax`;
}
