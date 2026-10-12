// audio/audio-context.js — the AudioContext + sample-buffer seam.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../audio/sample-library.js', () => ({
  loadSamples: vi.fn(),
  clearBuffers: vi.fn(),
}));

import {
  initAudioContext,
  loadInstrument,
  isAudioReady,
  ensureContextRunning,
  getAudioContext,
  getAudioBuffers,
  detachVisibility,
  resetAudioContext,
} from '../audio/audio-context.js';
import { loadSamples, clearBuffers } from '../audio/sample-library.js';

function createMockAudioContext() {
  return {
    currentTime: 0.1,
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),
    destination: {},
  };
}

describe('audio-context', () => {
  let MockAudioContext;

  beforeEach(() => {
    MockAudioContext = vi.fn(() => createMockAudioContext());
    globalThis.AudioContext = MockAudioContext;
    loadSamples.mockResolvedValue({
      buffers: new Map([['C4', {}], ['D4', {}]]),
      loaded: true,
      failedSamples: [],
    });
  });

  afterEach(() => {
    resetAudioContext();
    delete globalThis.AudioContext;
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('initAudioContext', () => {
    it('creates the context, loads samples once, and reports ready', async () => {
      const result = await initAudioContext();
      expect(result).toBe(true);
      expect(MockAudioContext).toHaveBeenCalledTimes(1);
      expect(loadSamples).toHaveBeenCalledWith(getAudioContext(), 'guitar');
      expect(isAudioReady()).toBe(true);
      expect(getAudioBuffers().has('C4')).toBe(true);
    });

    it('is idempotent — reuses the context and does not reload samples', async () => {
      await initAudioContext();
      await initAudioContext();
      expect(MockAudioContext).toHaveBeenCalledTimes(1);
      expect(loadSamples).toHaveBeenCalledTimes(1);
    });

    it('returns false when the AudioContext constructor throws', async () => {
      MockAudioContext.mockImplementation(() => {
        throw new Error('Not allowed');
      });
      expect(await initAudioContext()).toBe(false);
      expect(isAudioReady()).toBe(false);
    });

    it('resumes a suspended context', async () => {
      const ctx = createMockAudioContext();
      ctx.state = 'suspended';
      MockAudioContext.mockReturnValue(ctx);
      await initAudioContext();
      expect(ctx.resume).toHaveBeenCalled();
    });
  });

  describe('ensureContextRunning', () => {
    it('resumes the context only while suspended', async () => {
      await initAudioContext();
      const ctx = getAudioContext();
      ctx.resume.mockClear();

      ensureContextRunning();
      expect(ctx.resume).not.toHaveBeenCalled();

      ctx.state = 'suspended';
      ensureContextRunning();
      expect(ctx.resume).toHaveBeenCalled();
    });
  });

  describe('loadInstrument', () => {
    it('clears the old buffers and loads the new instrument', async () => {
      await initAudioContext();
      loadSamples.mockClear();

      await loadInstrument('piano');

      expect(clearBuffers).toHaveBeenCalled();
      expect(loadSamples).toHaveBeenCalledWith(getAudioContext(), 'piano');
      expect(isAudioReady()).toBe(true);
    });

    it('marks the seam not ready when loading fails', async () => {
      await initAudioContext();
      loadSamples.mockRejectedValueOnce(new Error('Load failed'));

      await loadInstrument('piano');

      expect(isAudioReady()).toBe(false);
    });
  });

  describe('teardown', () => {
    it('detachVisibility removes the visibilitychange listener', async () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener');
      await initAudioContext();
      detachVisibility();
      expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('resetAudioContext clears the seam so it can be re-initialized', async () => {
      await initAudioContext();
      resetAudioContext();

      expect(isAudioReady()).toBe(false);
      expect(getAudioContext()).toBe(null);

      expect(await initAudioContext()).toBe(true);
      expect(MockAudioContext).toHaveBeenCalledTimes(2);
    });
  });
});
