import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attachTouchHandlers } from '../ui/touch-handler.js';

function createMockContainer() {
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

describe('ui/touch-handler', () => {
  let container;
  let scrollState;

  beforeEach(() => {
    container = createMockContainer();
    scrollState = { scrollTop: 0, scrollHeight: 800, clientHeight: 800 };
  });

  function attach() {
    return attachTouchHandlers(container, { getScrollState: () => scrollState });
  }

  it('returns a no-op cleanup if container is null', () => {
    const cleanup = attachTouchHandlers(null);
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('attaches touchstart, touchmove, touchend, and touchcancel listeners', () => {
    attach();
    const events = container.addEventListener.mock.calls.map(c => c[0]);
    expect(events).toContain('touchstart');
    expect(events).toContain('touchmove');
    expect(events).toContain('touchend');
    expect(events).toContain('touchcancel');
  });

  it('prevents overscroll bounce when at top and pulling down', () => {
    attach();
    scrollState.scrollTop = 0;

    const preventDefault = vi.fn();
    container._trigger('touchstart', { touches: [{ clientY: 100 }] });
    container._trigger('touchmove', { preventDefault, touches: [{ clientY: 120 }] });

    expect(preventDefault).toHaveBeenCalled();
  });

  it('prevents overscroll bounce when at bottom and pulling up', () => {
    attach();
    scrollState.scrollTop = 200;
    scrollState.scrollHeight = 1000;
    scrollState.clientHeight = 800;

    const preventDefault = vi.fn();
    container._trigger('touchstart', { touches: [{ clientY: 200 }] });
    container._trigger('touchmove', { preventDefault, touches: [{ clientY: 180 }] });

    expect(preventDefault).toHaveBeenCalled();
  });

  it('does NOT prevent default for normal single-touch moves (not at boundary)', () => {
    attach();
    scrollState.scrollTop = 100;
    scrollState.scrollHeight = 1600;
    scrollState.clientHeight = 800;

    const preventDefault = vi.fn();
    container._trigger('touchstart', { touches: [{ clientY: 100 }] });
    container._trigger('touchmove', { preventDefault, touches: [{ clientY: 120 }] });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('does NOT interfere with multi-touch (allows pinch-to-zoom)', () => {
    attach();

    const preventDefault = vi.fn();
    container._trigger('touchstart', { touches: [{ clientY: 100 }] });
    container._trigger('touchmove', { preventDefault, touches: [{ clientY: 110 }, { clientY: 120 }] });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('deactivates on multi-touch start', () => {
    attach();
    scrollState.scrollTop = 0;

    const preventDefault = vi.fn();
    container._trigger('touchstart', { touches: [{ clientY: 100 }, { clientY: 200 }] });
    container._trigger('touchmove', { preventDefault, touches: [{ clientY: 110 }] });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('clears active flag on touchend', () => {
    attach();
    scrollState.scrollTop = 0;

    const preventDefault = vi.fn();
    container._trigger('touchstart', { touches: [{ clientY: 100 }] });
    container._trigger('touchend', {});
    container._trigger('touchmove', { preventDefault, touches: [{ clientY: 120 }] });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('clears active flag on touchcancel', () => {
    attach();
    scrollState.scrollTop = 0;

    const preventDefault = vi.fn();
    container._trigger('touchstart', { touches: [{ clientY: 100 }] });
    container._trigger('touchcancel', {});
    container._trigger('touchmove', { preventDefault, touches: [{ clientY: 120 }] });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('returns a cleanup function that removes all listeners', () => {
    const cleanup = attach();
    cleanup();

    const removedEvents = container.removeEventListener.mock.calls.map(c => c[0]);
    expect(removedEvents).toContain('touchstart');
    expect(removedEvents).toContain('touchmove');
    expect(removedEvents).toContain('touchend');
    expect(removedEvents).toContain('touchcancel');
  });

  it('uses passive: false for touchmove to allow preventDefault', () => {
    attach();

    const touchmoveCalls = container.addEventListener.mock.calls.filter(c => c[0] === 'touchmove');
    touchmoveCalls.forEach(call => {
      expect(call[2]).toEqual({ passive: false });
    });
  });
});
