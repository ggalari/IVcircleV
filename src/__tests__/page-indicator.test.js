/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get, set } from '../state.js';
import { createPageIndicator } from '../ui/page-indicator.js';

describe('page-indicator', () => {
  let container;
  let cleanup;

  beforeEach(() => {
    set('currentMode', 0);
    container = document.createElement('div');
    document.body.appendChild(container);
    cleanup = createPageIndicator(container);
  });

  afterEach(() => {
    cleanup();
    document.body.removeChild(container);
  });

  describe('DOM structure', () => {
    it('creates a .page-indicator container', () => {
      const indicator = container.querySelector('.page-indicator');
      expect(indicator).not.toBeNull();
    });

    it('creates 3 dot elements', () => {
      const dots = container.querySelectorAll('.page-dot');
      expect(dots.length).toBe(3);
    });
  });

  describe('initial state', () => {
    it('sets first dot as active when currentMode is 0', () => {
      const dots = container.querySelectorAll('.page-dot');
      expect(dots[0].classList.contains('page-dot--active')).toBe(true);
      expect(dots[1].classList.contains('page-dot--active')).toBe(false);
      expect(dots[2].classList.contains('page-dot--active')).toBe(false);
    });
  });

  describe('state subscription', () => {
    it('updates active dot when currentMode changes to 1', () => {
      set('currentMode', 1);
      const dots = container.querySelectorAll('.page-dot');
      expect(dots[0].classList.contains('page-dot--active')).toBe(false);
      expect(dots[1].classList.contains('page-dot--active')).toBe(true);
      expect(dots[2].classList.contains('page-dot--active')).toBe(false);
    });

    it('updates active dot when currentMode changes to 2', () => {
      set('currentMode', 2);
      const dots = container.querySelectorAll('.page-dot');
      expect(dots[0].classList.contains('page-dot--active')).toBe(false);
      expect(dots[1].classList.contains('page-dot--active')).toBe(false);
      expect(dots[2].classList.contains('page-dot--active')).toBe(true);
    });

    it('returns to first dot when mode goes back to 0', () => {
      set('currentMode', 2);
      set('currentMode', 0);
      const dots = container.querySelectorAll('.page-dot');
      expect(dots[0].classList.contains('page-dot--active')).toBe(true);
      expect(dots[1].classList.contains('page-dot--active')).toBe(false);
      expect(dots[2].classList.contains('page-dot--active')).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('removes the indicator element from the container', () => {
      cleanup();
      const indicator = container.querySelector('.page-indicator');
      expect(indicator).toBeNull();
      // Prevent afterEach from calling cleanup again
      cleanup = () => {};
    });

    it('unsubscribes from state changes after cleanup', () => {
      const dots = container.querySelectorAll('.page-dot');
      cleanup();
      // After cleanup, changing state should not affect the (now removed) dots
      set('currentMode', 2);
      // Dots still exist in memory but should not have been updated
      expect(dots[0].classList.contains('page-dot--active')).toBe(true);
      // Prevent afterEach from calling cleanup again
      cleanup = () => {};
    });
  });
});
