import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attachSwipeHandler } from '../modes/swipe-handler.js';

function createMockTrack() {
  const listeners = {};
  return {
    addEventListener: vi.fn((event, handler, options) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeEventListener: vi.fn((event, handler) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(h => h !== handler);
      }
    }),
    _trigger(event, eventObj = {}) {
      if (listeners[event]) {
        listeners[event].forEach(h => h(eventObj));
      }
    },
    _listeners: listeners,
  };
}

describe('modes/swipe-handler', () => {
  let track;
  let callbacks;

  beforeEach(() => {
    track = createMockTrack();
    callbacks = {
      onSwipe: vi.fn(),
      onTap: vi.fn(),
    };
    vi.spyOn(Date, 'now');
  });

  function attach() {
    return attachSwipeHandler(track, callbacks);
  }

  it('attaches touchstart, touchmove, and touchend listeners', () => {
    attach();
    const events = track.addEventListener.mock.calls.map(c => c[0]);
    expect(events).toContain('touchstart');
    expect(events).toContain('touchmove');
    expect(events).toContain('touchend');
  });

  it('returns a cleanup function that removes all listeners', () => {
    const cleanup = attach();
    cleanup();
    const removedEvents = track.removeEventListener.mock.calls.map(c => c[0]);
    expect(removedEvents).toContain('touchstart');
    expect(removedEvents).toContain('touchmove');
    expect(removedEvents).toContain('touchend');
  });

  it('calls onSwipe with swipe-left for a fast left swipe', () => {
    attach();
    Date.now.mockReturnValueOnce(1000).mockReturnValueOnce(1100);

    track._trigger('touchstart', { touches: [{ clientX: 200, clientY: 100 }] });
    track._trigger('touchend', { changedTouches: [{ clientX: 100, clientY: 100 }] });

    expect(callbacks.onSwipe).toHaveBeenCalledWith('swipe-left');
    expect(callbacks.onTap).not.toHaveBeenCalled();
  });

  it('calls onSwipe with swipe-right for a fast right swipe', () => {
    attach();
    Date.now.mockReturnValueOnce(1000).mockReturnValueOnce(1100);

    track._trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });
    track._trigger('touchend', { changedTouches: [{ clientX: 200, clientY: 100 }] });

    expect(callbacks.onSwipe).toHaveBeenCalledWith('swipe-right');
    expect(callbacks.onTap).not.toHaveBeenCalled();
  });

  it('calls onTap with start coordinates for a short tap', () => {
    attach();
    Date.now.mockReturnValueOnce(1000).mockReturnValueOnce(1050);

    track._trigger('touchstart', { touches: [{ clientX: 150, clientY: 200 }] });
    track._trigger('touchend', { changedTouches: [{ clientX: 152, clientY: 201 }] });

    expect(callbacks.onTap).toHaveBeenCalledWith({ x: 150, y: 200 });
    expect(callbacks.onSwipe).not.toHaveBeenCalled();
  });

  it('does nothing for a discarded gesture (slow drag)', () => {
    attach();
    Date.now.mockReturnValueOnce(1000).mockReturnValueOnce(2000);

    track._trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });
    track._trigger('touchend', { changedTouches: [{ clientX: 120, clientY: 115 }] });

    expect(callbacks.onSwipe).not.toHaveBeenCalled();
    expect(callbacks.onTap).not.toHaveBeenCalled();
  });

  it('prevents default on touchmove when horizontal displacement > vertical', () => {
    attach();
    Date.now.mockReturnValueOnce(1000);

    track._trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });

    const preventDefault = vi.fn();
    track._trigger('touchmove', {
      preventDefault,
      touches: [{ clientX: 130, clientY: 105 }],
    });

    expect(preventDefault).toHaveBeenCalled();
  });

  it('does NOT prevent default on touchmove when vertical displacement > horizontal', () => {
    attach();
    Date.now.mockReturnValueOnce(1000);

    track._trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });

    const preventDefault = vi.fn();
    track._trigger('touchmove', {
      preventDefault,
      touches: [{ clientX: 105, clientY: 130 }],
    });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('uses passive: false for touchmove to allow preventDefault', () => {
    attach();
    const touchmoveCalls = track.addEventListener.mock.calls.filter(c => c[0] === 'touchmove');
    touchmoveCalls.forEach(call => {
      expect(call[2]).toEqual({ passive: false });
    });
  });

  it('ignores touchstart with empty touches array without crashing', () => {
    attach();
    Date.now.mockReturnValueOnce(1000).mockReturnValueOnce(1050);

    // touchstart with no touches should not crash and should not update start position
    track._trigger('touchstart', { touches: [] });
    track._trigger('touchend', { changedTouches: [{ clientX: 0, clientY: 0 }] });

    // startTime was never set (still 0), so duration will be large → discard
    expect(callbacks.onSwipe).not.toHaveBeenCalled();
    expect(callbacks.onTap).not.toHaveBeenCalled();
  });

  it('ignores touchend with no changedTouches', () => {
    attach();
    Date.now.mockReturnValueOnce(1000);

    track._trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });
    track._trigger('touchend', {});

    expect(callbacks.onSwipe).not.toHaveBeenCalled();
    expect(callbacks.onTap).not.toHaveBeenCalled();
  });
});
