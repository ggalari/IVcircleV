import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createBouncingSphere } from '../audio/bouncing-sphere.js';

describe('bouncing-sphere', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '600px';
    container.style.height = '400px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('element creation', () => {
    it('appends a sphere div to the container', () => {
      createBouncingSphere(container);
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere).not.toBeNull();
      expect(sphere.tagName).toBe('DIV');
    });

    it('has correct diameter (20px)', () => {
      createBouncingSphere(container);
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.style.width).toBe('20px');
      expect(sphere.style.height).toBe('20px');
    });

    it('has radial gradient background', () => {
      createBouncingSphere(container);
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.style.background).toContain('radial-gradient');
    });

    it('has border-radius 50% for circular shape', () => {
      createBouncingSphere(container);
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.style.borderRadius).toBe('50%');
    });

    it('is positioned absolute within the container', () => {
      createBouncingSphere(container);
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.style.position).toBe('absolute');
    });

    it('has aria-hidden attribute for accessibility', () => {
      createBouncingSphere(container);
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.getAttribute('aria-hidden')).toBe('true');
    });

    it('has pointer-events none so it does not block interactions', () => {
      createBouncingSphere(container);
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.style.pointerEvents).toBe('none');
    });
  });

  describe('z-index', () => {
    it('sets z-index to 100 or higher (above staff notation SVG)', () => {
      createBouncingSphere(container);
      const sphere = container.querySelector('.bouncing-sphere');
      expect(Number(sphere.style.zIndex)).toBeGreaterThanOrEqual(100);
    });
  });

  describe('show()', () => {
    it('makes the sphere visible with opacity 1', () => {
      const { show } = createBouncingSphere(container);
      show();
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.style.opacity).toBe('1');
      expect(sphere.style.display).toBe('block');
    });
  });

  describe('hide()', () => {
    it('sets opacity to 0 with 50ms transition', () => {
      const { show, hide } = createBouncingSphere(container);
      show();
      hide();
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.style.opacity).toBe('0');
      expect(sphere.style.transition).toContain('50ms');
    });

    it('sets display none after timeout', () => {
      vi.useFakeTimers();
      const { show, hide } = createBouncingSphere(container);
      show();
      hide();
      vi.advanceTimersByTime(60);
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.style.display).toBe('none');
      vi.useRealTimers();
    });
  });

  describe('moveTo()', () => {
    it('updates position via transform', () => {
      const { moveTo } = createBouncingSphere(container);
      moveTo(100, 50, 500);
      const sphere = container.querySelector('.bouncing-sphere');
      // Position should be x - diameter/2, y - diameter/2 = 90, 40
      expect(sphere.style.transform).toBe('translate(90px, 40px)');
    });

    it('first moveTo has no transition (instant appearance)', () => {
      const { moveTo } = createBouncingSphere(container);
      moveTo(100, 50, 500);
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.style.transition).toBe('none');
    });

    it('first moveTo makes sphere visible (opacity 1, display block)', () => {
      const { moveTo } = createBouncingSphere(container);
      moveTo(100, 50, 500);
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.style.opacity).toBe('1');
      expect(sphere.style.display).toBe('block');
    });

    it('subsequent moveTo has CSS transition with duration', () => {
      const { moveTo } = createBouncingSphere(container);
      moveTo(100, 50, 500); // first — instant
      moveTo(200, 50, 400); // second — animated
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.style.transition).toContain('400ms');
      expect(sphere.style.transition).toContain('transform');
    });

    it('subsequent moveTo uses ease-out timing (cubic-bezier)', () => {
      const { moveTo } = createBouncingSphere(container);
      moveTo(100, 50, 500);
      moveTo(200, 50, 400);
      const sphere = container.querySelector('.bouncing-sphere');
      expect(sphere.style.transition).toContain('cubic-bezier');
    });

    it('subsequent moveTo updates position correctly', () => {
      const { moveTo } = createBouncingSphere(container);
      moveTo(100, 50, 500);
      moveTo(250, 80, 400);
      const sphere = container.querySelector('.bouncing-sphere');
      // 250 - 10 = 240, 80 - 10 = 70
      expect(sphere.style.transform).toBe('translate(240px, 70px)');
    });
  });

  describe('destroy()', () => {
    it('removes the sphere element from DOM', () => {
      const { destroy } = createBouncingSphere(container);
      expect(container.querySelector('.bouncing-sphere')).not.toBeNull();
      destroy();
      expect(container.querySelector('.bouncing-sphere')).toBeNull();
    });

    it('subsequent method calls are no-ops after destroy', () => {
      const { destroy, moveTo, show, hide } = createBouncingSphere(container);
      destroy();
      // These should not throw
      expect(() => moveTo(100, 100, 500)).not.toThrow();
      expect(() => show()).not.toThrow();
      expect(() => hide()).not.toThrow();
    });

    it('calling destroy multiple times does not throw', () => {
      const { destroy } = createBouncingSphere(container);
      destroy();
      expect(() => destroy()).not.toThrow();
    });
  });
});
