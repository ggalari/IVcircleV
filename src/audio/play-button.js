/**
 * Play/Stop button component for audio playback controls.
 * Pure DOM component — no framework dependencies.
 */

const PLAY_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="6,3 20,12 6,21"></polygon></svg>`;

const STOP_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="6" width="12" height="12"></rect></svg>`;

/**
 * Creates a reusable play/stop button component.
 * @param {Object} options
 * @param {string} options.label - Visible label text (optional, can be empty)
 * @param {function} options.onPlay - Callback when play is triggered
 * @param {function} options.onStop - Callback when stop is triggered
 * @param {string} options.ariaLabel - Accessible label for the button (e.g., "Jouer la gamme majeure")
 * @returns {{ element: HTMLButtonElement, setPlaying: (bool: boolean) => void, setDisabled: (bool: boolean) => void, destroy: () => void }}
 */
export function createPlayButton({ label, onPlay, onStop, ariaLabel }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'play-button';

  // State
  let isPlaying = false;
  const initialAriaLabel = ariaLabel;

  // Styles — inline for component isolation
  Object.assign(button.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '44px',
    minHeight: '44px',
    padding: '8px',
    border: '1px solid var(--color-border-light, #ece9e5)',
    borderRadius: 'var(--radius-button, 6px)',
    background: 'transparent',
    color: 'var(--color-text-primary, #2e2a28)',
    cursor: 'pointer',
    position: 'relative',
    lineHeight: '1',
    fontFamily: 'var(--font-body, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif)',
    fontSize: '0',
    transition: 'background-color 0.1s, border-color 0.1s',
  });

  // ARIA attributes
  button.setAttribute('aria-label', ariaLabel);
  button.setAttribute('aria-pressed', 'false');

  // Focus styles via a <style> element scoped by class
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .play-button:focus-visible {
      outline: 3px solid var(--color-major, #8b0000);
      outline-offset: 2px;
    }
    .play-button:hover:not(:disabled) {
      background-color: var(--color-surface-parchment, #f4f2ec);
      border-color: var(--color-border-medium, #bbb8b4);
    }
    .play-button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;

  // Render icon
  function renderIcon() {
    button.innerHTML = isPlaying ? STOP_ICON : PLAY_ICON;
  }

  // Update ARIA state
  function updateAria() {
    button.setAttribute('aria-pressed', String(isPlaying));
    button.setAttribute('aria-label', isPlaying ? 'Arrêter la lecture' : initialAriaLabel);
  }

  // Initial render
  renderIcon();

  // Event handlers
  function handleClick() {
    if (button.disabled) return;
    if (isPlaying) {
      onStop();
    } else {
      onPlay();
    }
  }

  function handleKeydown(e) {
    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  }

  button.addEventListener('click', handleClick);
  button.addEventListener('keydown', handleKeydown);

  // Append style element to document head (once)
  if (!document.querySelector('[data-play-button-styles]')) {
    styleEl.setAttribute('data-play-button-styles', '');
    document.head.appendChild(styleEl);
  }

  // Public API
  function setPlaying(playing) {
    isPlaying = playing;
    renderIcon();
    updateAria();
  }

  function setDisabled(disabled) {
    button.disabled = disabled;
  }

  function destroy() {
    button.removeEventListener('click', handleClick);
    button.removeEventListener('keydown', handleKeydown);
    // Remove style element if it's ours and still in document
    const existingStyle = document.querySelector('[data-play-button-styles]');
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  return {
    element: button,
    setPlaying,
    setDisabled,
    destroy,
  };
}
