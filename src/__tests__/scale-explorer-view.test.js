/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { set } from '../state.js';

// Mock abcjs since jsdom doesn't support full SVG rendering
vi.mock('abcjs', () => ({
  default: {
    renderAbc: vi.fn((el, abc, opts) => {
      el.innerHTML = `<svg class="abcjs-mock">${abc}</svg>`;
    })
  }
}));

import { initScaleExplorerView } from '../modes/scale-explorer-view.js';

describe('scale-explorer-view', () => {
  let panel;
  let cleanup;

  beforeEach(() => {
    vi.clearAllMocks();
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
    it('renders scale content for the default key (C Major) on init', () => {
      cleanup = initScaleExplorerView(panel);
      expect(panel.innerHTML).toContain('DO Majeur');
      expect(panel.innerHTML).toContain('Gammes');
    });

    it('renders 4 scale sections on init', () => {
      cleanup = initScaleExplorerView(panel);
      const containers = panel.querySelectorAll('.scale-staff-container');
      expect(containers.length).toBe(4);
    });

    it('renders scale type labels', () => {
      cleanup = initScaleExplorerView(panel);
      expect(panel.innerHTML).toContain('Majeure');
      expect(panel.innerHTML).toContain('Mineure naturelle');
      expect(panel.innerHTML).toContain('Mineure harmonique');
      expect(panel.innerHTML).toContain('Mineure mélodique');
    });
  });

  describe('state subscription', () => {
    it('updates content when activeKey changes', () => {
      cleanup = initScaleExplorerView(panel);
      set('activeKey', { index: 1, type: 'major' });
      expect(panel.innerHTML).toContain('SOL Majeur');
    });

    it('renders 4 scale sections after key change', () => {
      cleanup = initScaleExplorerView(panel);
      set('activeKey', { index: 5, type: 'major' });
      const containers = panel.querySelectorAll('.scale-staff-container');
      expect(containers.length).toBe(4);
    });
  });

  describe('cleanup', () => {
    it('returns a cleanup function', () => {
      cleanup = initScaleExplorerView(panel);
      expect(typeof cleanup).toBe('function');
    });

    it('unsubscribes from state changes after cleanup', () => {
      cleanup = initScaleExplorerView(panel);
      cleanup();
      const htmlAfterCleanup = panel.innerHTML;
      set('activeKey', { index: 7, type: 'major' });
      expect(panel.innerHTML).toBe(htmlAfterCleanup);
      cleanup = null;
    });
  });
});
