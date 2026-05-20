/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get, set } from '../state.js';
import { createModeSwitcher } from '../modes/mode-switcher.js';

describe('mode-switcher', () => {
  let container;
  let switcher;

  beforeEach(() => {
    // Reset state
    set('currentMode', 0);
    set('isTransitioning', false);

    // Create a mock container
    container = document.createElement('div');
    container.className = 'card';
    document.body.appendChild(container);

    switcher = createModeSwitcher(container);
  });

  afterEach(() => {
    switcher.destroy();
    document.body.removeChild(container);
  });

  describe('DOM structure', () => {
    it('creates a .mode-track element inside the container', () => {
      const track = container.querySelector('.mode-track');
      expect(track).not.toBeNull();
    });

    it('creates 3 .mode-panel children inside the track', () => {
      const panels = container.querySelectorAll('.mode-track .mode-panel');
      expect(panels.length).toBe(3);
    });

    it('sets data-mode attribute on each panel', () => {
      const panels = container.querySelectorAll('.mode-panel');
      expect(panels[0].dataset.mode).toBe('0');
      expect(panels[1].dataset.mode).toBe('1');
      expect(panels[2].dataset.mode).toBe('2');
    });
  });

  describe('current()', () => {
    it('returns 0 initially', () => {
      expect(switcher.current()).toBe(0);
    });

    it('reflects state after goTo', () => {
      switcher.goTo(1);
      expect(switcher.current()).toBe(1);
    });
  });

  describe('goTo(n)', () => {
    it('navigates to mode 1', () => {
      switcher.goTo(1);
      expect(get('currentMode')).toBe(1);
    });

    it('navigates to mode 2', () => {
      switcher.goTo(2);
      expect(get('currentMode')).toBe(2);
    });

    it('wraps negative values to 2', () => {
      switcher.goTo(-1);
      expect(get('currentMode')).toBe(2);
    });

    it('wraps values above 2 to 0', () => {
      switcher.goTo(3);
      expect(get('currentMode')).toBe(0);
    });

    it('sets isTransitioning to true', () => {
      switcher.goTo(1);
      expect(get('isTransitioning')).toBe(true);
    });

    it('applies translateX transform to the track', () => {
      switcher.goTo(1);
      const track = container.querySelector('.mode-track');
      expect(track.style.transform).toBe('translateX(-33.333333333333336%)');
    });

    it('applies translateX(-66.67%) for mode 2', () => {
      switcher.goTo(2);
      const track = container.querySelector('.mode-track');
      expect(track.style.transform).toBe('translateX(-66.66666666666667%)');
    });

    it('ignores requests while transitioning', () => {
      switcher.goTo(1);
      // isTransitioning is now true
      switcher.goTo(2);
      // Should still be at mode 1
      expect(get('currentMode')).toBe(1);
    });

    it('does not transition if already at target mode', () => {
      switcher.goTo(0);
      expect(get('isTransitioning')).toBe(false);
    });
  });

  describe('next()', () => {
    it('goes from mode 0 to mode 1', () => {
      switcher.next();
      expect(get('currentMode')).toBe(1);
    });

    it('wraps from mode 2 to mode 0', () => {
      set('currentMode', 2);
      set('isTransitioning', false);
      switcher.next();
      // goTo(3) wraps to 0
      expect(get('currentMode')).toBe(0);
    });
  });

  describe('prev()', () => {
    it('goes from mode 1 to mode 0', () => {
      set('currentMode', 1);
      set('isTransitioning', false);
      switcher.prev();
      expect(get('currentMode')).toBe(0);
    });

    it('wraps from mode 0 to mode 2', () => {
      switcher.prev();
      // goTo(-1) wraps to 2
      expect(get('currentMode')).toBe(2);
    });
  });

  describe('transitionend handling', () => {
    it('clears isTransitioning on transitionend event', () => {
      switcher.goTo(1);
      expect(get('isTransitioning')).toBe(true);

      const track = container.querySelector('.mode-track');
      const event = new Event('transitionend', { bubbles: true });
      event.propertyName = 'transform';
      track.dispatchEvent(event);

      expect(get('isTransitioning')).toBe(false);
    });

    it('does not clear isTransitioning for non-transform transitions', () => {
      switcher.goTo(1);
      expect(get('isTransitioning')).toBe(true);

      const track = container.querySelector('.mode-track');
      const event = new Event('transitionend', { bubbles: true });
      event.propertyName = 'opacity';
      track.dispatchEvent(event);

      expect(get('isTransitioning')).toBe(true);
    });
  });

  describe('destroy()', () => {
    it('removes the track from the container', () => {
      switcher.destroy();
      const track = container.querySelector('.mode-track');
      expect(track).toBeNull();
      // Prevent afterEach from calling destroy again
      switcher = { destroy: () => {} };
    });
  });
});
