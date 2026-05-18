import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { distance, exceedsMovementThreshold, attachLongPress } from '../ui/long-press.js';

describe('ui/long-press', () => {
  describe('distance', () => {
    it('returns 0 for identical points', () => {
      expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    });

    it('computes horizontal distance', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
    });

    it('computes vertical distance', () => {
      expect(distance({ x: 0, y: 0 }, { x: 0, y: 4 })).toBe(4);
    });

    it('computes diagonal distance (3-4-5 triangle)', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });

    it('handles negative coordinates', () => {
      expect(distance({ x: -3, y: -4 }, { x: 0, y: 0 })).toBe(5);
    });
  });

  describe('exceedsMovementThreshold', () => {
    it('returns false when distance equals threshold', () => {
      // distance of exactly 10 should NOT exceed threshold of 10
      expect(exceedsMovementThreshold({ x: 0, y: 0 }, { x: 10, y: 0 }, 10)).toBe(false);
    });

    it('returns true when distance exceeds threshold', () => {
      expect(exceedsMovementThreshold({ x: 0, y: 0 }, { x: 11, y: 0 }, 10)).toBe(true);
    });

    it('returns false when distance is below threshold', () => {
      expect(exceedsMovementThreshold({ x: 0, y: 0 }, { x: 5, y: 5 }, 10)).toBe(false);
    });

    it('uses default threshold of 10 when not specified', () => {
      expect(exceedsMovementThreshold({ x: 0, y: 0 }, { x: 11, y: 0 })).toBe(true);
      expect(exceedsMovementThreshold({ x: 0, y: 0 }, { x: 9, y: 0 })).toBe(false);
    });
  });

  describe('attachLongPress', () => {
    let element;
    let config;
    let cleanup;

    beforeEach(() => {
      vi.useFakeTimers();
      element = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      config = {
        onLongPress: vi.fn(),
        onFeedbackStart: vi.fn(),
        onCancel: vi.fn(),
      };
    });

    afterEach(() => {
      if (cleanup) cleanup();
      vi.useRealTimers();
    });

    it('attaches all required event listeners', () => {
      cleanup = attachLongPress(element, config);
      const events = element.addEventListener.mock.calls.map(c => c[0]);
      expect(events).toContain('touchstart');
      expect(events).toContain('touchmove');
      expect(events).toContain('touchend');
      expect(events).toContain('touchcancel');
      expect(events).toContain('contextmenu');
    });

    it('returns a cleanup function that removes all listeners', () => {
      cleanup = attachLongPress(element, config);
      cleanup();
      const events = element.removeEventListener.mock.calls.map(c => c[0]);
      expect(events).toContain('touchstart');
      expect(events).toContain('touchmove');
      expect(events).toContain('touchend');
      expect(events).toContain('touchcancel');
      expect(events).toContain('contextmenu');
      cleanup = null; // already cleaned up
    });

    it('calls onFeedbackStart at 200ms after touchstart', () => {
      cleanup = attachLongPress(element, config);

      // Get the touchstart handler
      const touchstartCall = element.addEventListener.mock.calls.find(c => c[0] === 'touchstart');
      const handleTouchStart = touchstartCall[1];

      // Simulate touchstart
      handleTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      });

      // At 199ms, no feedback yet
      vi.advanceTimersByTime(199);
      expect(config.onFeedbackStart).not.toHaveBeenCalled();

      // At 200ms, feedback fires
      vi.advanceTimersByTime(1);
      expect(config.onFeedbackStart).toHaveBeenCalledTimes(1);
    });

    it('calls onLongPress at 500ms with touch coordinates', () => {
      cleanup = attachLongPress(element, config);

      const touchstartCall = element.addEventListener.mock.calls.find(c => c[0] === 'touchstart');
      const handleTouchStart = touchstartCall[1];

      handleTouchStart({
        touches: [{ clientX: 150, clientY: 200 }],
        preventDefault: vi.fn(),
      });

      // At 499ms, no long-press yet
      vi.advanceTimersByTime(499);
      expect(config.onLongPress).not.toHaveBeenCalled();

      // At 500ms, long-press fires
      vi.advanceTimersByTime(1);
      expect(config.onLongPress).toHaveBeenCalledTimes(1);
      expect(config.onLongPress).toHaveBeenCalledWith({ x: 150, y: 200 });
    });

    it('cancels if finger moves more than 10px', () => {
      cleanup = attachLongPress(element, config);

      const touchstartCall = element.addEventListener.mock.calls.find(c => c[0] === 'touchstart');
      const handleTouchStart = touchstartCall[1];
      const touchmoveCall = element.addEventListener.mock.calls.find(c => c[0] === 'touchmove');
      const handleTouchMove = touchmoveCall[1];

      handleTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      });

      // Move finger 15px away (exceeds 10px threshold)
      handleTouchMove({
        touches: [{ clientX: 115, clientY: 100 }],
      });

      // Advance past 500ms — should NOT fire
      vi.advanceTimersByTime(600);
      expect(config.onLongPress).not.toHaveBeenCalled();
      expect(config.onCancel).toHaveBeenCalled();
    });

    it('cancels if finger lifts before 500ms', () => {
      cleanup = attachLongPress(element, config);

      const touchstartCall = element.addEventListener.mock.calls.find(c => c[0] === 'touchstart');
      const handleTouchStart = touchstartCall[1];
      const touchendCall = element.addEventListener.mock.calls.find(c => c[0] === 'touchend');
      const handleTouchEnd = touchendCall[1];

      handleTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      });

      // Lift finger at 300ms
      vi.advanceTimersByTime(300);
      handleTouchEnd({});

      // Advance past 500ms — should NOT fire
      vi.advanceTimersByTime(300);
      expect(config.onLongPress).not.toHaveBeenCalled();
      expect(config.onCancel).toHaveBeenCalled();
    });

    it('suppresses context menu during active gesture', () => {
      cleanup = attachLongPress(element, config);

      const touchstartCall = element.addEventListener.mock.calls.find(c => c[0] === 'touchstart');
      const handleTouchStart = touchstartCall[1];
      const contextmenuCall = element.addEventListener.mock.calls.find(c => c[0] === 'contextmenu');
      const handleContextMenu = contextmenuCall[1];

      handleTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
      });

      const preventDefaultSpy = vi.fn();
      handleContextMenu({ preventDefault: preventDefaultSpy });
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});
