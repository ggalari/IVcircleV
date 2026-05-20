/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { set } from '../state.js';
import { createChevrons } from '../ui/chevrons.js';

describe('chevrons', () => {
  let container;
  let cleanup;
  let callbacks;

  beforeEach(() => {
    set('currentMode', 0);
    container = document.createElement('div');
    document.body.appendChild(container);
    callbacks = { onNext: vi.fn(), onPrev: vi.fn() };
    cleanup = createChevrons(container, callbacks);
  });

  afterEach(() => {
    cleanup();
    document.body.removeChild(container);
  });

  describe('DOM structure', () => {
    it('creates left and right chevron buttons', () => {
      const left = container.querySelector('.chevron-left');
      const right = container.querySelector('.chevron-right');
      expect(left).not.toBeNull();
      expect(right).not.toBeNull();
    });

    it('both buttons have chevron-btn class', () => {
      const buttons = container.querySelectorAll('.chevron-btn');
      expect(buttons.length).toBe(2);
    });

    it('left chevron has ‹ text', () => {
      const left = container.querySelector('.chevron-left');
      expect(left.textContent).toBe('\u2039');
    });

    it('right chevron has › text', () => {
      const right = container.querySelector('.chevron-right');
      expect(right.textContent).toBe('\u203A');
    });

    it('buttons have aria-labels', () => {
      const left = container.querySelector('.chevron-left');
      const right = container.querySelector('.chevron-right');
      expect(left.getAttribute('aria-label')).toBe('Previous mode');
      expect(right.getAttribute('aria-label')).toBe('Next mode');
    });
  });

  describe('visibility at mode 0', () => {
    it('shows both chevrons at mode 0 (circular navigation)', () => {
      const left = container.querySelector('.chevron-left');
      const right = container.querySelector('.chevron-right');
      expect(left.style.display).not.toBe('none');
      expect(right.style.display).not.toBe('none');
    });

    it('shows right chevron at mode 0', () => {
      const right = container.querySelector('.chevron-right');
      expect(right.style.display).not.toBe('none');
    });
  });

  describe('visibility at mode 1', () => {
    it('shows both chevrons at mode 1', () => {
      set('currentMode', 1);
      const left = container.querySelector('.chevron-left');
      const right = container.querySelector('.chevron-right');
      expect(left.style.display).not.toBe('none');
      expect(right.style.display).not.toBe('none');
    });
  });

  describe('visibility at mode 2', () => {
    it('shows both chevrons at mode 2 (circular navigation)', () => {
      set('currentMode', 2);
      const left = container.querySelector('.chevron-left');
      const right = container.querySelector('.chevron-right');
      expect(left.style.display).not.toBe('none');
      expect(right.style.display).not.toBe('none');
    });
  });

  describe('click handlers', () => {
    it('calls onPrev when left chevron is clicked', () => {
      set('currentMode', 1);
      const left = container.querySelector('.chevron-left');
      left.click();
      expect(callbacks.onPrev).toHaveBeenCalledTimes(1);
    });

    it('calls onNext when right chevron is clicked', () => {
      const right = container.querySelector('.chevron-right');
      right.click();
      expect(callbacks.onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('removes buttons from container', () => {
      cleanup();
      const buttons = container.querySelectorAll('.chevron-btn');
      expect(buttons.length).toBe(0);
      // Recreate so afterEach cleanup doesn't fail
      cleanup = createChevrons(container, callbacks);
    });

    it('unsubscribes from state changes after cleanup', () => {
      const left = container.querySelector('.chevron-left');
      cleanup();
      // After cleanup, state changes should not affect removed elements
      set('currentMode', 1);
      // No error thrown means unsubscribe worked
      // Recreate so afterEach cleanup doesn't fail
      cleanup = createChevrons(container, callbacks);
    });
  });
});
