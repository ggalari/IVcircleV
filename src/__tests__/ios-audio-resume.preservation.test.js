import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock dependencies before importing the module under test
vi.mock('../audio/sample-library.js', () => ({
  loadSamples: vi.fn(),
  getBuffer: vi.fn(),
  clearBuffers: vi.fn()
}));

vi.mock('../audio/scheduler.js', () => ({
  scheduleScale: vi.fn(),
  scheduleChordSequence: vi.fn(),
  scheduleImmediate: vi.fn(),
  createImmediateStopFn: vi.fn()
}));

vi.mock('../audio/pitch-mapper.js', () => ({
  mapScaleToSampleKeys: vi.fn(),
  mapChordToSampleKeys: vi.fn(),
  mapChordSequenceToSampleKeys: vi.fn(),
  mapChordToSampleKeysFromStaff: vi.fn()
}));

vi.mock('../modes/staff-renderer.js', () => ({
  getChordStaffPositions: vi.fn()
}));

vi.mock('../state.js', () => {
  const listeners = new Map();
  const store = new Map();
  return {
    get: vi.fn((key) => store.get(key)),
    set: vi.fn((key, value) => {
      store.set(key, value);
      const cbs = listeners.get(key);
      if (cbs) cbs.forEach(cb => cb(value));
    }),
    subscribe: vi.fn((key, cb) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(cb);
      return () => listeners.get(key).delete(cb);
    }),
    _reset: () => { listeners.clear(); store.clear(); }
  };
});

import {
  initAudioEngine,
  playScale,
  playChordSequence,
  playSingleNote,
  playSingleChord,
  stopPlaybackImmediate,
  _resetForTesting
} from '../audio/audio-engine.js';

import { loadSamples } from '../audio/sample-library.js';
import { scheduleScale, scheduleChordSequence, scheduleImmediate } from '../audio/scheduler.js';
import { mapScaleToSampleKeys, mapChordToSampleKeysFromStaff } from '../audio/pitch-mapper.js';
import { getChordStaffPositions } from '../modes/staff-renderer.js';
import { _reset as resetState } from '../state.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createMockAudioContext(state = 'running') {
  return {
    currentTime: 0.1,
    state,
    resume: vi.fn().mockResolvedValue(undefined),
    destination: {}
  };
}

/**
 * Arbitrary for selecting one of the four playback functions.
 */
const playbackActionArb = fc.constantFrom('playScale', 'playChordSequence', 'playSingleNote', 'playSingleChord');

/**
 * Arbitrary for generating valid note names (French solfège).
 */
const noteNameArb = fc.constantFrom('DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI', 'DO#', 'RE#', 'FA#', 'SOL#', 'LA#');

/**
 * Arbitrary for generating valid key indices (0-11).
 */
const keyIndexArb = fc.integer({ min: 0, max: 11 });

/**
 * Arbitrary for key type.
 */
const keyTypeArb = fc.constantFrom('major', 'minor');

/**
 * Arbitrary for tempo values (reasonable range).
 */
const tempoArb = fc.integer({ min: 100, max: 2000 });

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('iOS Audio Resume - Preservation Properties', () => {
  let mockAudioContext;

  beforeEach(() => {
    vi.useFakeTimers();
    _resetForTesting();
    resetState();
    vi.clearAllMocks();

    mockAudioContext = createMockAudioContext('running');
    globalThis.AudioContext = vi.fn(() => mockAudioContext);

    // Default mock implementations
    loadSamples.mockResolvedValue({
      buffers: new Map([['C4', {}], ['D4', {}], ['E4', {}], ['C3', {}], ['E3', {}], ['G3', {}]]),
      loaded: true,
      failedSamples: []
    });

    mapScaleToSampleKeys.mockReturnValue(['C4', 'D4', 'E4']);
    mapChordToSampleKeysFromStaff.mockReturnValue(['C3', 'E3', 'G3']);
    getChordStaffPositions.mockReturnValue([0, 2, 4]);

    scheduleScale.mockReturnValue({
      stopFn: vi.fn(),
      immediateStopFn: vi.fn(),
      scheduledEndTime: 1.6
    });

    scheduleChordSequence.mockReturnValue({
      stopFn: vi.fn(),
      immediateStopFn: vi.fn(),
      scheduledEndTime: 7.1
    });

    scheduleImmediate.mockReturnValue({
      stopFn: vi.fn(),
      immediateStopFn: vi.fn()
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.AudioContext;
  });

  /**
   * Helper to call a playback function by name with valid parameters.
   */
  function callPlaybackFunction(action) {
    switch (action) {
      case 'playScale':
        playScale('test-section', { notes: ['DO', 'RE', 'MI'], staffPositions: [0, 1, 2] }, 500, {});
        break;
      case 'playChordSequence':
        playChordSequence(
          'test-section',
          [{ root: 'DO', intervals: [0, 4, 7], noteNames: ['DO', 'MI', 'SOL'] }],
          0, 'major', 1000, {}
        );
        break;
      case 'playSingleNote':
        playSingleNote('DO');
        break;
      case 'playSingleChord':
        playSingleChord({ root: 'DO', intervals: [0, 4, 7], noteNames: ['DO', 'MI', 'SOL'] }, 0, 'major');
        break;
    }
  }

  describe('Property 1: Running context - resume() is NOT called and scheduling happens synchronously', () => {
    it('for all playback attempts where audioContext.state === "running", resume() is NOT called and a scheduler function IS called synchronously', async () => {
      /**
       * Validates: Requirements 3.1, 3.2, 3.3, 3.4
       *
       * Property: When the AudioContext is already in 'running' state,
       * playback functions never call resume() and scheduling functions
       * are invoked synchronously (no async hop).
       */
      await initAudioEngine();

      fc.assert(
        fc.property(playbackActionArb, (action) => {
          // Reset call counts before each property check
          mockAudioContext.resume.mockClear();
          scheduleScale.mockClear();
          scheduleChordSequence.mockClear();
          scheduleImmediate.mockClear();

          // Ensure context is running
          mockAudioContext.state = 'running';

          // Call the playback function
          callPlaybackFunction(action);

          // Assertion 1: resume() was NOT called
          expect(mockAudioContext.resume).not.toHaveBeenCalled();

          // Assertion 2: a scheduler function WAS called (synchronously)
          const schedulerCalled =
            scheduleScale.mock.calls.length > 0 ||
            scheduleChordSequence.mock.calls.length > 0 ||
            scheduleImmediate.mock.calls.length > 0;
          expect(schedulerCalled).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Early return guard - no scheduler called when prerequisites missing', () => {
    it('for all playback attempts where !audioContext || !samplesLoaded, functions return immediately without calling any scheduler', async () => {
      /**
       * Validates: Requirements 3.3
       *
       * Property: When audioContext is null or samples are not loaded,
       * playback functions return immediately without calling any
       * scheduler function or resume().
       */

      // Test case A: audioContext is null (engine not initialized)
      fc.assert(
        fc.property(playbackActionArb, (action) => {
          // Reset everything - engine not initialized means no audioContext
          _resetForTesting();
          resetState();
          vi.clearAllMocks();

          scheduleScale.mockReturnValue({ stopFn: vi.fn(), immediateStopFn: vi.fn(), scheduledEndTime: 1.6 });
          scheduleChordSequence.mockReturnValue({ stopFn: vi.fn(), immediateStopFn: vi.fn(), scheduledEndTime: 7.1 });
          scheduleImmediate.mockReturnValue({ stopFn: vi.fn(), immediateStopFn: vi.fn() });

          // Call the playback function without initializing the engine
          callPlaybackFunction(action);

          // No scheduler should have been called
          expect(scheduleScale).not.toHaveBeenCalled();
          expect(scheduleChordSequence).not.toHaveBeenCalled();
          expect(scheduleImmediate).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );

      // Test case B: audioContext exists but samples not loaded
      // Simulate by making loadSamples reject
      _resetForTesting();
      resetState();
      vi.clearAllMocks();

      mockAudioContext = createMockAudioContext('running');
      globalThis.AudioContext = vi.fn(() => mockAudioContext);
      loadSamples.mockRejectedValue(new Error('Load failed'));

      scheduleScale.mockReturnValue({ stopFn: vi.fn(), immediateStopFn: vi.fn(), scheduledEndTime: 1.6 });
      scheduleChordSequence.mockReturnValue({ stopFn: vi.fn(), immediateStopFn: vi.fn(), scheduledEndTime: 7.1 });
      scheduleImmediate.mockReturnValue({ stopFn: vi.fn(), immediateStopFn: vi.fn() });

      await initAudioEngine();
      vi.clearAllMocks();

      fc.assert(
        fc.property(playbackActionArb, (action) => {
          scheduleScale.mockClear();
          scheduleChordSequence.mockClear();
          scheduleImmediate.mockClear();

          callPlaybackFunction(action);

          // No scheduler should have been called since samples failed to load
          expect(scheduleScale).not.toHaveBeenCalled();
          expect(scheduleChordSequence).not.toHaveBeenCalled();
          expect(scheduleImmediate).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: stopPlaybackImmediate() remains synchronous and abrupt', () => {
    it('for all non-suspended contexts, stopPlaybackImmediate() introduces no new async operations', async () => {
      /**
       * Validates: Requirements 3.4
       *
       * Property: stopPlaybackImmediate() is fully synchronous — it calls
       * immediateStopFn, resets state, and does not invoke resume() or
       * introduce any Promises/async operations regardless of context state.
       */
      await initAudioEngine();

      const nonSuspendedStates = fc.constantFrom('running', 'closed');

      fc.assert(
        fc.property(
          fc.tuple(playbackActionArb, nonSuspendedStates),
          ([action, contextState]) => {
            // Setup: start playback first so there's something to stop
            mockAudioContext.state = 'running';
            mockAudioContext.resume.mockClear();

            callPlaybackFunction(action);

            // Now change state to the test state before stopping
            mockAudioContext.state = contextState;
            mockAudioContext.resume.mockClear();

            // Get the immediateStopFn that was registered
            const immediateStopFn =
              scheduleScale.mock.results[scheduleScale.mock.results.length - 1]?.value.immediateStopFn ||
              scheduleChordSequence.mock.results[scheduleChordSequence.mock.results.length - 1]?.value.immediateStopFn ||
              scheduleImmediate.mock.results[scheduleImmediate.mock.results.length - 1]?.value.immediateStopFn;

            // Call stopPlaybackImmediate
            stopPlaybackImmediate();

            // Assertion 1: immediateStopFn was called (abrupt stop)
            expect(immediateStopFn).toHaveBeenCalled();

            // Assertion 2: resume() was NOT called during stop
            expect(mockAudioContext.resume).not.toHaveBeenCalled();

            // Assertion 3: The return value of stopPlaybackImmediate is undefined (synchronous, no promise)
            const result = stopPlaybackImmediate();
            expect(result).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
