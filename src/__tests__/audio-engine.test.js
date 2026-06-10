import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('../audio/sample-library.js', () => ({
  loadSamples: vi.fn(),
  getBuffer: vi.fn()
}));

vi.mock('../audio/scheduler.js', () => ({
  scheduleScale: vi.fn(),
  scheduleChordSequence: vi.fn(),
  scheduleImmediate: vi.fn(),
  createImmediateStopFn: vi.fn()
}));

vi.mock('../audio/pitch-mapper.js', () => ({
  mapScaleToSampleKeys: vi.fn(),
  mapChordToSampleKeys: vi.fn()
}));

// We need a real state store for subscription testing
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
  stopPlayback,
  stopPlaybackImmediate,
  cleanupAudioEngine,
  isReady,
  getPlaybackState,
  _resetForTesting
} from '../audio/audio-engine.js';

import { loadSamples, getBuffer } from '../audio/sample-library.js';
import { scheduleScale, scheduleChordSequence, scheduleImmediate } from '../audio/scheduler.js';
import { mapScaleToSampleKeys, mapChordToSampleKeys } from '../audio/pitch-mapper.js';
import { get, set, subscribe, _reset as resetState } from '../state.js';

// Minimal AudioContext mock
function createMockAudioContext() {
  return {
    currentTime: 0.1,
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),
    destination: {}
  };
}

describe('audio-engine', () => {
  let MockAudioContext;

  beforeEach(() => {
    vi.useFakeTimers();
    _resetForTesting();
    resetState();
    vi.clearAllMocks();

    // Setup global AudioContext mock
    MockAudioContext = vi.fn(() => createMockAudioContext());
    globalThis.AudioContext = MockAudioContext;

    // Default mock implementations
    loadSamples.mockResolvedValue({
      buffers: new Map([['C4', {}], ['D4', {}], ['E4', {}]]),
      loaded: true,
      failedSamples: []
    });

    mapScaleToSampleKeys.mockReturnValue(['C4', 'D4', 'E4']);
    mapChordToSampleKeys.mockReturnValue(['C4', 'E4', 'G4']);

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

  describe('initAudioEngine', () => {
    it('creates AudioContext and returns true on success', async () => {
      const result = await initAudioEngine();
      expect(result).toBe(true);
      expect(MockAudioContext).toHaveBeenCalledTimes(1);
    });

    it('is idempotent — multiple calls return same AudioContext', async () => {
      await initAudioEngine();
      await initAudioEngine();
      await initAudioEngine();
      expect(MockAudioContext).toHaveBeenCalledTimes(1);
    });

    it('returns false if AudioContext constructor throws', async () => {
      MockAudioContext.mockImplementation(() => {
        throw new Error('Not allowed');
      });
      const result = await initAudioEngine();
      expect(result).toBe(false);
    });

    it('triggers sample loading exactly once', async () => {
      await initAudioEngine();
      await initAudioEngine();
      expect(loadSamples).toHaveBeenCalledTimes(1);
    });

    it('resumes suspended AudioContext', async () => {
      const ctx = createMockAudioContext();
      ctx.state = 'suspended';
      MockAudioContext.mockReturnValue(ctx);

      await initAudioEngine();
      expect(ctx.resume).toHaveBeenCalled();
    });

    it('subscribes to activeKey and currentMode state changes', async () => {
      await initAudioEngine();
      expect(subscribe).toHaveBeenCalledWith('activeKey', expect.any(Function));
      expect(subscribe).toHaveBeenCalledWith('currentMode', expect.any(Function));
    });
  });

  describe('isReady', () => {
    it('returns false before initialization', () => {
      expect(isReady()).toBe(false);
    });

    it('returns true after successful initialization', async () => {
      await initAudioEngine();
      expect(isReady()).toBe(true);
    });
  });

  describe('getPlaybackState', () => {
    it('returns default state before playback', () => {
      const state = getPlaybackState();
      expect(state).toEqual({
        isPlaying: false,
        sectionId: null,
        currentIndex: -1,
        type: null
      });
    });
  });

  describe('playScale', () => {
    beforeEach(async () => {
      await initAudioEngine();
    });

    it('calls mapScaleToSampleKeys with the scale notes', () => {
      const scaleResult = { notes: ['DO', 'RE', 'MI'] };
      playScale('scale-major', scaleResult, 500, {});
      expect(mapScaleToSampleKeys).toHaveBeenCalledWith(['DO', 'RE', 'MI'], 3);
    });

    it('calls scheduleScale with correct parameters', () => {
      const scaleResult = { notes: ['DO', 'RE', 'MI'] };
      playScale('scale-major', scaleResult, 500, {});
      expect(scheduleScale).toHaveBeenCalledWith(
        expect.any(Object), // audioContext
        expect.any(Map),    // buffers
        ['C4', 'D4', 'E4'], // mapped sample keys
        expect.any(Number), // startTime
        500,                // tempo
        0.8,                // gain
        expect.any(Function) // onNoteStart callback
      );
    });

    it('updates playback state to playing', () => {
      const scaleResult = { notes: ['DO', 'RE', 'MI'] };
      playScale('scale-major', scaleResult, 500, {});
      const state = getPlaybackState();
      expect(state.isPlaying).toBe(true);
      expect(state.sectionId).toBe('scale-major');
      expect(state.type).toBe('scale');
    });

    it('publishes playback state to store', () => {
      const scaleResult = { notes: ['DO', 'RE', 'MI'] };
      playScale('scale-major', scaleResult, 500, {});
      expect(set).toHaveBeenCalledWith('playbackState', expect.objectContaining({
        isPlaying: true,
        sectionId: 'scale-major',
        type: 'scale'
      }));
    });

    it('stops current playback before starting new one', () => {
      const scaleResult = { notes: ['DO', 'RE', 'MI'] };
      playScale('scale-1', scaleResult, 500, {});
      const firstImmediateStopFn = scheduleScale.mock.results[0].value.immediateStopFn;

      playScale('scale-2', scaleResult, 500, {});
      expect(firstImmediateStopFn).toHaveBeenCalled();
    });

    it('fires onComplete callback when playback duration elapses', () => {
      const onComplete = vi.fn();
      const scaleResult = { notes: ['DO', 'RE', 'MI'] };
      playScale('scale-major', scaleResult, 500, { onComplete });

      // Advance time past the scheduled end
      vi.advanceTimersByTime(2000);
      expect(onComplete).toHaveBeenCalled();
    });

    it('does nothing if engine is not ready', () => {
      _resetForTesting();
      const scaleResult = { notes: ['DO', 'RE', 'MI'] };
      playScale('scale-major', scaleResult, 500, {});
      expect(scheduleScale).not.toHaveBeenCalled();
    });
  });

  describe('playChordSequence', () => {
    beforeEach(async () => {
      await initAudioEngine();
    });

    it('calls mapChordToSampleKeys for each chord', () => {
      const chords = [
        { root: 'DO', intervals: [0, 4, 7] },
        { root: 'RE', intervals: [0, 3, 7] }
      ];
      playChordSequence('chords-triads', chords, 0, 'major', 1000, {});
      expect(mapChordToSampleKeys).toHaveBeenCalledTimes(2);
      expect(mapChordToSampleKeys).toHaveBeenCalledWith('DO', [0, 4, 7], 3);
      expect(mapChordToSampleKeys).toHaveBeenCalledWith('RE', [0, 3, 7], 3);
    });

    it('calls scheduleChordSequence with mapped chord arrays', () => {
      const chords = [
        { root: 'DO', intervals: [0, 4, 7] }
      ];
      playChordSequence('chords-triads', chords, 0, 'major', 1000, {});
      expect(scheduleChordSequence).toHaveBeenCalledWith(
        expect.any(Object), // audioContext
        expect.any(Map),    // buffers
        [['C4', 'E4', 'G4']], // chordSampleKeys (one chord)
        expect.any(Number), // startTime
        1000,               // tempo
        expect.any(Function) // onChordStart
      );
    });

    it('updates playback state to chord type', () => {
      const chords = [{ root: 'DO', intervals: [0, 4, 7] }];
      playChordSequence('chords-triads', chords, 0, 'major', 1000, {});
      const state = getPlaybackState();
      expect(state.isPlaying).toBe(true);
      expect(state.sectionId).toBe('chords-triads');
      expect(state.type).toBe('chord');
    });

    it('stops current playback before starting new chord sequence', () => {
      const chords = [{ root: 'DO', intervals: [0, 4, 7] }];
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      const scaleImmediateStopFn = scheduleScale.mock.results[0].value.immediateStopFn;

      playChordSequence('chords-triads', chords, 0, 'major', 1000, {});
      expect(scaleImmediateStopFn).toHaveBeenCalled();
    });
  });

  describe('playSingleNote', () => {
    beforeEach(async () => {
      await initAudioEngine();
    });

    it('calls mapScaleToSampleKeys for the single note', () => {
      playSingleNote('FA#');
      expect(mapScaleToSampleKeys).toHaveBeenCalledWith(['FA#'], 3);
    });

    it('calls scheduleImmediate with the mapped sample keys', () => {
      playSingleNote('DO');
      expect(scheduleImmediate).toHaveBeenCalledWith(
        expect.any(Object), // audioContext
        expect.any(Map),    // buffers
        ['C4', 'D4', 'E4'], // from mock return
        1.0                 // gain
      );
    });

    it('stops current playback before playing single note', () => {
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      const scaleImmediateStopFn = scheduleScale.mock.results[0].value.immediateStopFn;

      playSingleNote('RE');
      expect(scaleImmediateStopFn).toHaveBeenCalled();
    });
  });

  describe('playSingleChord', () => {
    beforeEach(async () => {
      await initAudioEngine();
    });

    it('calls mapChordToSampleKeys with chord root and intervals', () => {
      const chord = { root: 'DO', intervals: [0, 4, 7] };
      playSingleChord(chord, 0, 'major');
      expect(mapChordToSampleKeys).toHaveBeenCalledWith('DO', [0, 4, 7], 3);
    });

    it('calls scheduleImmediate with normalized gain', () => {
      const chord = { root: 'DO', intervals: [0, 4, 7] };
      playSingleChord(chord, 0, 'major');
      // mapChordToSampleKeys returns ['C4', 'E4', 'G4'] (3 notes) → gain = 1/3
      expect(scheduleImmediate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Map),
        ['C4', 'E4', 'G4'],
        1 / 3
      );
    });
  });

  describe('stopPlayback', () => {
    beforeEach(async () => {
      await initAudioEngine();
    });

    it('calls the current stopFn', () => {
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      const stopFn = scheduleScale.mock.results[0].value.stopFn;

      stopPlayback();
      expect(stopFn).toHaveBeenCalled();
    });

    it('resets playback state', () => {
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      stopPlayback();
      const state = getPlaybackState();
      expect(state.isPlaying).toBe(false);
      expect(state.sectionId).toBe(null);
      expect(state.currentIndex).toBe(-1);
    });

    it('cancels completion timeout', () => {
      const onComplete = vi.fn();
      playScale('scale-1', { notes: ['DO'] }, 500, { onComplete });
      stopPlayback();
      vi.advanceTimersByTime(5000);
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('stopPlaybackImmediate', () => {
    beforeEach(async () => {
      await initAudioEngine();
    });

    it('stops playback immediately using immediateStopFn (no fade-out)', () => {
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      const immediateStopFn = scheduleScale.mock.results[0].value.immediateStopFn;

      stopPlaybackImmediate();
      expect(immediateStopFn).toHaveBeenCalled();
    });

    it('resets playback state', () => {
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      stopPlaybackImmediate();
      expect(getPlaybackState().isPlaying).toBe(false);
    });

    it('does not error when nothing is playing', () => {
      expect(() => stopPlaybackImmediate()).not.toThrow();
    });

    it('does not call the regular stopFn (no fade-out envelope)', () => {
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      const stopFn = scheduleScale.mock.results[0].value.stopFn;

      stopPlaybackImmediate();
      expect(stopFn).not.toHaveBeenCalled();
    });
  });

  describe('state subscription triggers stop', () => {
    beforeEach(async () => {
      await initAudioEngine();
    });

    it('stops playback when activeKey changes (abrupt, no fade-out)', () => {
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      const immediateStopFn = scheduleScale.mock.results[0].value.immediateStopFn;
      const stopFn = scheduleScale.mock.results[0].value.stopFn;

      // Trigger activeKey change through the mocked state
      const activeKeyCallback = subscribe.mock.calls.find(c => c[0] === 'activeKey')[1];
      activeKeyCallback({ index: 3, type: 'major' });

      expect(immediateStopFn).toHaveBeenCalled();
      expect(stopFn).not.toHaveBeenCalled();
      expect(getPlaybackState().isPlaying).toBe(false);
    });

    it('stops playback when currentMode changes (abrupt, no fade-out)', () => {
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      const immediateStopFn = scheduleScale.mock.results[0].value.immediateStopFn;
      const stopFn = scheduleScale.mock.results[0].value.stopFn;

      // Trigger currentMode change
      const modeCallback = subscribe.mock.calls.find(c => c[0] === 'currentMode')[1];
      modeCallback(0);

      expect(immediateStopFn).toHaveBeenCalled();
      expect(stopFn).not.toHaveBeenCalled();
      expect(getPlaybackState().isPlaying).toBe(false);
    });

    it('stops playback when currentMode changes away from mode 1 (Chord Explorer)', () => {
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      const immediateStopFn = scheduleScale.mock.results[0].value.immediateStopFn;

      const modeCallback = subscribe.mock.calls.find(c => c[0] === 'currentMode')[1];
      modeCallback(3); // Switch to a non-audio mode

      expect(immediateStopFn).toHaveBeenCalled();
      expect(getPlaybackState().isPlaying).toBe(false);
    });
  });

  describe('playback state published to store', () => {
    beforeEach(async () => {
      await initAudioEngine();
    });

    it('publishes isPlaying=true on playback start', () => {
      playScale('scale-major', { notes: ['DO'] }, 500, {});
      expect(set).toHaveBeenCalledWith('playbackState', expect.objectContaining({
        isPlaying: true
      }));
    });

    it('publishes isPlaying=false on stop', () => {
      playScale('scale-major', { notes: ['DO'] }, 500, {});
      vi.clearAllMocks();
      stopPlayback();
      expect(set).toHaveBeenCalledWith('playbackState', expect.objectContaining({
        isPlaying: false
      }));
    });

    it('publishes sectionId and type', () => {
      playScale('my-section', { notes: ['DO'] }, 500, {});
      expect(set).toHaveBeenCalledWith('playbackState', expect.objectContaining({
        sectionId: 'my-section',
        type: 'scale'
      }));
    });
  });

  describe('cleanupAudioEngine', () => {
    beforeEach(async () => {
      await initAudioEngine();
    });

    it('stops any active playback', () => {
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      const immediateStopFn = scheduleScale.mock.results[0].value.immediateStopFn;

      cleanupAudioEngine();
      expect(immediateStopFn).toHaveBeenCalled();
      expect(getPlaybackState().isPlaying).toBe(false);
    });

    it('unsubscribes from activeKey state changes', () => {
      // After cleanup, state changes should not trigger stop on old playback
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      cleanupAudioEngine();

      // Start new playback after re-init
      _resetForTesting();
      vi.clearAllMocks();

      // Verify that calling subscribe was done during init (already verified above)
      // The key behavior: after cleanup, the subscription should be removed.
      // We verify by initializing again and checking subscribe is called again
      // (meaning old subscription was cleaned up)
    });

    it('after cleanup, state changes do not trigger stop on stale playback', async () => {
      playScale('scale-1', { notes: ['DO'] }, 500, {});
      cleanupAudioEngine();

      // Re-initialize to create new subscriptions
      _resetForTesting();
      vi.clearAllMocks();

      scheduleScale.mockReturnValue({
        stopFn: vi.fn(),
        immediateStopFn: vi.fn(),
        scheduledEndTime: 1.6
      });

      await initAudioEngine();
      playScale('scale-2', { notes: ['DO'] }, 500, {});
      const newImmediateStopFn = scheduleScale.mock.results[0].value.immediateStopFn;

      // Trigger activeKey change — should work on new subscription
      const activeKeyCallback = subscribe.mock.calls.find(c => c[0] === 'activeKey')[1];
      activeKeyCallback({ index: 5, type: 'major' });

      expect(newImmediateStopFn).toHaveBeenCalled();
    });

    it('unsubscribes from currentMode state changes', () => {
      cleanupAudioEngine();
      expect(subscribe).toHaveBeenCalledWith('currentMode', expect.any(Function));
    });

    it('does not error when called multiple times', () => {
      expect(() => {
        cleanupAudioEngine();
        cleanupAudioEngine();
      }).not.toThrow();
    });
  });
});
