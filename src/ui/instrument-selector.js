/**
 * Instrument selector UI controller.
 * Manages the instrument submenu in the settings dropdown, showing both
 * "Guitare" and "Piano" options with the active one checked.
 */

import { get, set, subscribe } from '../state.js';
import { getInstrument, setInstrument } from './instrument-preference.js';

/** @type {Function|null} */
let unsubscribe = null;

/**
 * Initialize the instrument selector:
 * - Syncs state from cookie on first load
 * - Attaches click listeners to submenu toggle and instrument options
 * - Subscribes to state changes for reactive UI updates
 */
export function initInstrumentSelector() {
  // Set initial state from persisted cookie value
  set('instrument', getInstrument());

  // Submenu toggle: expand/collapse the instrument panel
  const menuBtn = document.getElementById('btn-instrument-menu');
  const submenu = menuBtn?.closest('.dropdown-submenu');
  const panel = submenu?.querySelector('.dropdown-submenu__panel');

  if (menuBtn && submenu && panel) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = submenu.getAttribute('aria-expanded') === 'true';
      submenu.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
    });
  }

  // Instrument option buttons
  const radioButtons = document.querySelectorAll('[data-instrument]');
  radioButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newValue = btn.dataset.instrument;
      if (newValue !== get('instrument')) {
        set('instrument', newValue);
        setInstrument(newValue);
      }
    });
  });

  // Subscribe to state changes for reactive UI updates
  unsubscribe = subscribe('instrument', () => {
    updateInstrumentChecks();
  });

  // Set initial checked state
  updateInstrumentChecks();
}

/**
 * Update the aria-checked attributes and visual check marks
 * on the instrument radio buttons to reflect current state.
 */
export function updateInstrumentChecks() {
  const instrument = get('instrument');
  const radioButtons = document.querySelectorAll('[data-instrument]');

  radioButtons.forEach((btn) => {
    const isActive = btn.dataset.instrument === instrument;
    btn.setAttribute('aria-checked', String(isActive));
  });
}
