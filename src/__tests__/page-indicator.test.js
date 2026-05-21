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

    it('creates 3 tab elements with labels', () => {
      const tabs = container.querySelectorAll('.page-tab');
      expect(tabs.length).toBe(3);
      expect(tabs[0].textContent).toBe('Cercle');
      expect(tabs[1].textContent).toBe('Accords');
      expect(tabs[2].textContent).toBe('Gammes');
    });

    it('has aria-label for navigation', () => {
      const nav = container.querySelector('.page-indicator');
      expect(nav.getAttribute('aria-label')).toBe('Vues');
    });
  });

  describe('initial state', () => {
    it('sets first tab as active when currentMode is 0', () => {
      const tabs = container.querySelectorAll('.page-tab');
      expect(tabs[0].classList.contains('page-tab--active')).toBe(true);
      expect(tabs[1].classList.contains('page-tab--active')).toBe(false);
      expect(tabs[2].classList.contains('page-tab--active')).toBe(false);
    });
  });

  describe('state subscription', () => {
    it('updates active tab when currentMode changes to 1', () => {
      set('currentMode', 1);
      const tabs = container.querySelectorAll('.page-tab');
      expect(tabs[0].classList.contains('page-tab--active')).toBe(false);
      expect(tabs[1].classList.contains('page-tab--active')).toBe(true);
      expect(tabs[2].classList.contains('page-tab--active')).toBe(false);
    });

    it('updates active tab when currentMode changes to 2', () => {
      set('currentMode', 2);
      const tabs = container.querySelectorAll('.page-tab');
      expect(tabs[0].classList.contains('page-tab--active')).toBe(false);
      expect(tabs[1].classList.contains('page-tab--active')).toBe(false);
      expect(tabs[2].classList.contains('page-tab--active')).toBe(true);
    });

    it('returns to first tab when mode goes back to 0', () => {
      set('currentMode', 2);
      set('currentMode', 0);
      const tabs = container.querySelectorAll('.page-tab');
      expect(tabs[0].classList.contains('page-tab--active')).toBe(true);
      expect(tabs[1].classList.contains('page-tab--active')).toBe(false);
      expect(tabs[2].classList.contains('page-tab--active')).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('removes the indicator element from the container', () => {
      cleanup();
      const indicator = container.querySelector('.page-indicator');
      expect(indicator).toBeNull();
      cleanup = () => {};
    });

    it('unsubscribes from state changes after cleanup', () => {
      const tabs = container.querySelectorAll('.page-tab');
      cleanup();
      set('currentMode', 2);
      // Tabs still exist in memory but should not have been updated
      expect(tabs[0].classList.contains('page-tab--active')).toBe(true);
      cleanup = () => {};
    });
  });
});
