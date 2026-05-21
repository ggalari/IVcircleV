/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get, set } from '../state.js';

// Mock abcjs since jsdom doesn't support full SVG rendering
vi.mock('abcjs', () => ({
  default: {
    renderAbc: vi.fn((el, abc, opts) => {
      // Create a minimal SVG element to simulate rendering
      el.innerHTML = `<svg class="abcjs-mock">${abc}</svg>`;
    })
  }
}));

import { initChordExplorerView } from '../modes/chord-explorer-view.js';

describe('chord-explorer-view', () => {
  let panel;
  let cleanup;

  beforeEach(() => {
    set('activeKey', { index: 0, type: 'major' });

    // Create mock circle container for the zoom feature
    const circleContainer = document.createElement('div');
    circleContainer.id = 'circle-container';
    circleContainer.innerHTML = '<svg viewBox="0 0 980 980"></svg>';
    document.body.appendChild(circleContainer);

    panel = document.createElement('div');
    panel.className = 'mode-panel';
    Object.defineProperty(panel, 'clientWidth', { value: 360, configurable: true });
    document.body.appendChild(panel);
  });

  afterEach(() => {
    if (cleanup) cleanup();
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('renders content on init for the default key (C Major)', () => {
      cleanup = initChordExplorerView(panel);
      expect(panel.innerHTML).not.toBe('');
    });

    it('displays the key name in the title', () => {
      cleanup = initChordExplorerView(panel);
      const title = panel.querySelector('.chord-explorer__title');
      expect(title).not.toBeNull();
      expect(title.textContent).toContain('DO Majeur');
    });

    it('renders two staff sections (triads and sevenths)', () => {
      cleanup = initChordExplorerView(panel);
      const staffSections = panel.querySelectorAll('.chord-explorer__staff');
      expect(staffSections.length).toBe(2);
    });

    it('renders abcjs staves for chords', () => {
      cleanup = initChordExplorerView(panel);
      const staves = panel.querySelectorAll('.abcjs-staff');
      expect(staves.length).toBe(2);
    });
  });

  describe('state subscription', () => {
    it('updates content when activeKey changes', () => {
      cleanup = initChordExplorerView(panel);
      set('activeKey', { index: 1, type: 'major' });
      const title = panel.querySelector('.chord-explorer__title');
      expect(title.textContent).toContain('SOL Majeur');
    });

    it('updates content for minor keys', () => {
      cleanup = initChordExplorerView(panel);
      set('activeKey', { index: 0, type: 'minor' });
      const title = panel.querySelector('.chord-explorer__title');
      expect(title.textContent).toContain('la mineur');
    });
  });

  describe('cleanup', () => {
    it('returns a cleanup function', () => {
      cleanup = initChordExplorerView(panel);
      expect(typeof cleanup).toBe('function');
    });

    it('unsubscribes from state changes after cleanup', () => {
      cleanup = initChordExplorerView(panel);
      cleanup();
      const contentAfterCleanup = panel.innerHTML;
      set('activeKey', { index: 5, type: 'major' });
      expect(panel.innerHTML).toBe(contentAfterCleanup);
      cleanup = null;
    });
  });
});
