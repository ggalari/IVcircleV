/**
 * Tempo Slider Component
 * Range input for controlling playback speed (inter-note/chord onset spacing).
 * Range: 500ms–3000ms, step 100ms, default 500ms.
 */

const MIN_VALUE = 500;
const MAX_VALUE = 3000;
const STEP = 100;
const DEFAULT_VALUE = 500;

/**
 * Creates a tempo slider control with accessible range input.
 * @param {HTMLElement} containerEl - Parent element to append the slider into
 * @param {function} onChange - Callback fired with new value (number) on change
 * @returns {{ getValue: () => number, setValue: (ms: number) => void, destroy: () => void }}
 */
export function createTempoSlider(containerEl, onChange) {
  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'tempo-slider-wrapper';

  // Create the range input
  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'tempo-slider';
  input.min = String(MIN_VALUE);
  input.max = String(MAX_VALUE);
  input.step = String(STEP);
  input.value = String(DEFAULT_VALUE);

  // ARIA attributes
  input.setAttribute('aria-label', 'Vitesse de lecture');
  input.setAttribute('aria-valuemin', String(MIN_VALUE));
  input.setAttribute('aria-valuemax', String(MAX_VALUE));
  input.setAttribute('aria-valuenow', String(DEFAULT_VALUE));
  input.setAttribute('aria-valuetext', `${DEFAULT_VALUE} millisecondes par note`);

  // Create value label
  const label = document.createElement('span');
  label.className = 'tempo-slider-label';
  label.textContent = `${DEFAULT_VALUE} ms`;

  // Assemble
  wrapper.appendChild(input);
  wrapper.appendChild(label);
  containerEl.appendChild(wrapper);

  // Update function for syncing label + ARIA on value change
  function updateDisplay(value) {
    label.textContent = `${value} ms`;
    input.setAttribute('aria-valuenow', String(value));
    input.setAttribute('aria-valuetext', `${value} millisecondes par note`);
  }

  // Event handler for input (fires during drag, real-time)
  function handleInput() {
    const value = Number(input.value);
    updateDisplay(value);
    if (onChange) {
      onChange(value);
    }
  }

  input.addEventListener('input', handleInput);

  return {
    /** Returns current slider value as a number (ms) */
    getValue() {
      return Number(input.value);
    },

    /** Programmatically set the slider value and update the display */
    setValue(ms) {
      const clamped = Math.min(MAX_VALUE, Math.max(MIN_VALUE, ms));
      input.value = String(clamped);
      updateDisplay(clamped);
    },

    /** Removes event listeners and removes the element from the container */
    destroy() {
      input.removeEventListener('input', handleInput);
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };
}
