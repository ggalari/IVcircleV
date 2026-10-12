import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadSamples, getBuffer, _resetForTesting } from '../audio/sample-library.js';

/**
 * Create a mock AudioBuffer object.
 */
function createMockAudioBuffer(key) {
  return {
    duration: 1.5,
    length: 66150,
    numberOfChannels: 1,
    sampleRate: 44100,
    _key: key // internal marker for test identification
  };
}

/**
 * Create a mock AudioContext with a decodeAudioData method.
 */
function createMockAudioContext() {
  return {
    sampleRate: 44100,
    decodeAudioData: vi.fn(async (arrayBuffer) => {
      return createMockAudioBuffer('decoded');
    }),
    createBuffer: vi.fn((channels, length, sampleRate) => {
      const data = new Float32Array(length);
      return {
        duration: length / sampleRate,
        length,
        numberOfChannels: channels,
        sampleRate,
        getChannelData: vi.fn(() => data),
        _synthesized: true
      };
    })
  };
}

// All 36 chromatic keys (C3–B5)
const ALL_KEYS = [
  'C3', 'Db3', 'D3', 'Eb3', 'E3', 'F3', 'Gb3', 'G3', 'Ab3', 'A3', 'Bb3', 'B3',
  'C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4',
  'C5', 'Db5', 'D5', 'Eb5', 'E5', 'F5', 'Gb5', 'G5', 'Ab5', 'A5', 'Bb5', 'B5'
];

describe('sample-library', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    _resetForTesting();
  });

  describe('loadSamples', () => {
    it('fetches all 36 chromatic samples from C3 to B5', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      });
      vi.stubGlobal('fetch', mockFetch);

      const audioContext = createMockAudioContext();
      await loadSamples(audioContext);

      expect(mockFetch).toHaveBeenCalledTimes(36);
      for (const key of ALL_KEYS) {
        expect(mockFetch).toHaveBeenCalledWith(`samples/guitar/${key}.mp3`);
      }
    });

    it('returns loaded: true when all samples succeed', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      }));

      const audioContext = createMockAudioContext();
      const result = await loadSamples(audioContext);

      expect(result.loaded).toBe(true);
      expect(result.failedSamples).toEqual([]);
      expect(result.buffers).toBeInstanceOf(Map);
      expect(result.buffers.size).toBeGreaterThanOrEqual(25);
    });

    it('returns loaded: true even when some samples fail (graceful degradation with synthesis fallback)', async () => {
      const failKeys = new Set(['D3', 'Ab4', 'C5']);

      vi.stubGlobal('fetch', vi.fn((url) => {
        const key = url.replace('samples/guitar/', '').replace('.mp3', '');
        if (failKeys.has(key)) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
        });
      }));

      const audioContext = createMockAudioContext();
      const result = await loadSamples(audioContext);

      expect(result.loaded).toBe(true);
      // Failed HTTP samples are synthesized, so failedSamples should be empty
      expect(result.failedSamples).toHaveLength(0);
      // All 25 keys present (22 decoded + 3 synthesized) + enharmonic aliases
      expect(result.buffers.size).toBeGreaterThanOrEqual(25);
    });

    it('handles decodeAudioData failure for specific samples (falls back to synthesis)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      }));

      let callIndex = 0;
      const audioContext = {
        sampleRate: 44100,
        decodeAudioData: vi.fn(async () => {
          callIndex++;
          // Fail on the 3rd and 10th calls
          if (callIndex === 3 || callIndex === 10) {
            throw new Error('Decode failed');
          }
          return createMockAudioBuffer('decoded');
        }),
        createBuffer: vi.fn((channels, length, sampleRate) => {
          const data = new Float32Array(length);
          return {
            duration: length / sampleRate,
            length,
            numberOfChannels: channels,
            sampleRate,
            getChannelData: vi.fn(() => data),
            _synthesized: true
          };
        })
      };

      const result = await loadSamples(audioContext);

      expect(result.loaded).toBe(true);
      // Decode failures are recovered via synthesis
      expect(result.failedSamples).toHaveLength(0);
      expect(result.buffers.size).toBeGreaterThanOrEqual(25);
    });

    it('handles network fetch rejection without throwing (falls back to synthesis)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const audioContext = createMockAudioContext();
      const result = await loadSamples(audioContext);

      expect(result.loaded).toBe(true);
      // All samples synthesized, none truly failed
      expect(result.failedSamples).toHaveLength(0);
      expect(result.buffers.size).toBeGreaterThanOrEqual(25);
    });

    it('uses Promise.allSettled - does not reject on individual failures', async () => {
      // Mix of successes and failures
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn(() => {
        callCount++;
        if (callCount % 5 === 0) {
          return Promise.reject(new Error('Intermittent failure'));
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
        });
      }));

      const audioContext = createMockAudioContext();

      // Should NOT throw
      await expect(loadSamples(audioContext)).resolves.toBeDefined();
    });

    it('decodes each fetched ArrayBuffer using audioContext.decodeAudioData', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(16))
      }));

      const audioContext = createMockAudioContext();
      await loadSamples(audioContext);

      expect(audioContext.decodeAudioData).toHaveBeenCalledTimes(36);
    });
  });

  describe('getBuffer', () => {
    it('returns cached AudioBuffer for a loaded sample', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      }));

      const audioContext = createMockAudioContext();
      await loadSamples(audioContext);

      const buffer = getBuffer('C4');
      expect(buffer).not.toBeNull();
      expect(buffer).toHaveProperty('duration');
    });

    it('returns synthesized buffer for a sample whose file failed to load', async () => {
      const failKeys = new Set(['E4']);
      vi.stubGlobal('fetch', vi.fn((url) => {
        const key = url.replace('samples/guitar/', '').replace('.mp3', '');
        if (failKeys.has(key)) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
        });
      }));

      const audioContext = createMockAudioContext();
      await loadSamples(audioContext);

      // With synthesis fallback, E4 gets a synthesized buffer instead of null
      const buffer = getBuffer('E4');
      expect(buffer).not.toBeNull();
      expect(buffer._synthesized).toBe(true);
    });

    it('returns null for a key that does not exist in the library', () => {
      expect(getBuffer('Z9')).toBeNull();
    });

    it('returns the same reference on repeated calls (referential identity)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      }));

      const audioContext = createMockAudioContext();
      await loadSamples(audioContext);

      const buffer1 = getBuffer('G3');
      const buffer2 = getBuffer('G3');
      expect(buffer1).toBe(buffer2);
    });

    it('resolves a sharp spelling to the loaded flat slot', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      }));

      const audioContext = createMockAudioContext();
      await loadSamples(audioContext);

      // 'Gb4' is the loaded slot; 'F#4' is the same pitch spelled differently
      expect(getBuffer('F#4')).toBe(getBuffer('Gb4'));
    });

    it('resolves a double accidental across the enharmonic boundary', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      }));

      const audioContext = createMockAudioContext();
      await loadSamples(audioContext);

      // D𝄪 = E, so the spelled key must reach the loaded 'E4' slot
      expect(getBuffer('D##4')).toBe(getBuffer('E4'));
    });

    it('exposes the raw buffers map so the scheduler resolves spelled keys', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      }));

      const audioContext = createMockAudioContext();
      const { buffers } = await loadSamples(audioContext);

      // The scheduler looks notes up directly on the map; a spelled key must resolve
      expect(buffers.get('F#4')).toBe(buffers.get('Gb4'));
    });
  });
});
