/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { set, get } from '../state.js';
import { initFullCircleView } from '../modes/full-circle-view.js';

// Mock the neighbors overlay module
vi.mock('../overlays/neighbors.js', () => ({
  showNeighbors: vi.fn(),
}));

import { showNeighbors } from '../overlays/neighbors.js';

describe('full-circle-view', () => {
  let panel;
  let circleContainer;
  let cleanup;

  beforeEach(() => {
    vi.clearAllMocks();
    set('activeKey', { index: 0, type: 'major' });

    // Create a mock circle container in the document body
    circleContainer = document.createElement('div');
    circleContainer.id = 'circle-container';
    document.body.appendChild(circleContainer);

    // Create the panel element (first .mode-panel)
    panel = document.createElement('div');
    panel.className = 'mode-panel';
    document.body.appendChild(panel);
  });

  afterEach(() => {
    if (cleanup) cleanup();
    // Clean up DOM
    if (panel.parentNode) panel.parentNode.removeChild(panel);
    if (circleContainer.parentNode) circleContainer.parentNode.removeChild(circleContainer);
  });

  describe('initialization', () => {
    it('moves the circle container into the panel', () => {
      cleanup = initFullCircleView(panel);
      expect(panel.contains(circleContainer)).toBe(true);
    });

    it('shows neighbors for the default key (C Major) on init', () => {
      cleanup = initFullCircleView(panel);
      expect(showNeighbors).toHaveBeenCalledWith({ index: 0, type: 'major' });
    });

    it('shows neighbors for the current activeKey if not default', () => {
      set('activeKey', { index: 3, type: 'minor' });
      cleanup = initFullCircleView(panel);
      expect(showNeighbors).toHaveBeenCalledWith({ index: 3, type: 'minor' });
    });
  });

  describe('state subscription', () => {
    it('calls showNeighbors when activeKey changes', () => {
      cleanup = initFullCircleView(panel);
      vi.clearAllMocks();

      set('activeKey', { index: 5, type: 'major' });
      expect(showNeighbors).toHaveBeenCalledWith({ index: 5, type: 'major' });
    });

    it('calls showNeighbors with minor key', () => {
      cleanup = initFullCircleView(panel);
      vi.clearAllMocks();

      set('activeKey', { index: 9, type: 'minor' });
      expect(showNeighbors).toHaveBeenCalledWith({ index: 9, type: 'minor' });
    });

    it('does not call showNeighbors when same key is set again', () => {
      cleanup = initFullCircleView(panel);
      vi.clearAllMocks();

      // Setting the same value should not trigger the subscriber (state.js skips equal values)
      set('activeKey', { index: 0, type: 'major' });
      expect(showNeighbors).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('returns a cleanup function', () => {
      cleanup = initFullCircleView(panel);
      expect(typeof cleanup).toBe('function');
    });

    it('unsubscribes from state changes after cleanup', () => {
      cleanup = initFullCircleView(panel);
      vi.clearAllMocks();

      cleanup();
      set('activeKey', { index: 7, type: 'major' });
      expect(showNeighbors).not.toHaveBeenCalled();
      cleanup = null; // Prevent afterEach from calling it again
    });
  });
});
