import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Bug Condition Exploration Test - iOS AudioContext Suspended Silent Failure
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug exists: when AudioContext.state === 'suspended'
 * (post-init, simulating iOS returning from background), playback functions
 * never call resume(), causing silent failure.
 *
 * Property: for all action in [playScale, playChordSequence, playSingleNote, playSingleChord],
 *           when audioContext.state === 'suspended', resume() is called
 */

// Mock dependencies before importing the module under test
vi.mock('../audio/sample-library.js', () => ({
  loadSamples: vi.fn(),
  getBuffer: vi.fn()
}));

vi.mock('../audio/scheduler.js', () => ({
  scheduleScale: vi.fn(),
  scheduleChordSequence: vi.fn(),
  scheduleImmediate: vi.fn()
}));

vi.mock('../theory/pitch.js', () => ({
  notesToSampleKeys: vi.fn(),
  staffPositionOctave: vi.fn(() => 3)
}));

vi.mock('../theory/chords.js', () => ({
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
    reset: () => { listeners.clear(); store.clear(); }
  };
});

import {
  initAudioEngine,
  playScale,
  playChordSequence,
  playSingleNote,
  playSingleChord,
  _resetForTesting
} from '../audio/audio-engine.js';

import { loadSamples } from '../audio/sample-library.js';
import { scheduleScale, scheduleChordSequence, scheduleImmediate } from '../audio/scheduler.js';
import { notesToSampleKeys } from '../theory/pitch.js';
import { getChordStaffPositions } from '../theory/chords.js';
import { reset as resetState } from '../state.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createMockAudioContext(state = 'running') {
  return {
    currentTime: 0.1,
    state,
    resume: vi.fn().mockResolvedValue(undefined),
    destination: {}
  };
}

function setupMocks() {
  loadSamples.mockResolvedValue({
    buffers: new Map([['C4', {}], ['D4', {}], ['E4', {}]]),
    loaded: true,
    failedSamples: []
  });

  notesToSampleKeys.mockReturnValue(['C3', 'E3', 'G3']);
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
}

// ─── Playback action definitions ──────────────────────────────────────────────

const PLAYBACK_ACTIONS = [
  {
    name: 'playScale',
    call: () => playScale('test-section', { notes: ['DO', 'RE', 'MI'], staffPositions: [0, 1, 2] }, 500, {})
  },
  {
    name: 'playChordSequence',
    call: () => playChordSequence(
      'test-chords',
      [{ root: 'DO', intervals: [0, 4, 7], noteNames: ['DO', 'MI', 'SOL'] }],
      0, 'major', 1000, {}
    )
  },
  {
    name: 'playSingleNote',
    call: () => playSingleNote('DO')
  },
  {
    name: 'playSingleChord',
    call: () => playSingleChord(
      { root: 'DO', intervals: [0, 4, 7], noteNames: ['DO', 'MI', 'SOL'] },
      0, 'major'
    )
  }
];

// fast-check arbitrary: pick one of the four playback actions
const playbackActionArb = fc.integer({ min: 0, max: 3 }).map(i => PLAYBACK_ACTIONS[i]);

// ─── Test ─────────────────────────────────────────────────────────────────────

describe('iOS Audio Resume - Bug Condition Exploration', () => {
  let mockCtx;

  beforeEach(() => {
    vi.useFakeTimers();
    _resetForTesting();
    resetState();
    vi.clearAllMocks();
    setupMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.AudioContext;
  });

  it('Property 1: Bug Condition - for all playback actions, when audioContext.state === "suspended", resume() is called', () => {
    fc.assert(
      fc.property(playbackActionArb, (action) => {
        // Reset state for each generated example
        _resetForTesting();
        vi.clearAllMocks();
        setupMocks();

        // Create AudioContext that starts running (for init) then becomes suspended
        // Simulates: user inits audio → iOS suspends context in background → user returns
        mockCtx = createMockAudioContext('running');
        globalThis.AudioContext = vi.fn(() => mockCtx);

        // Initialize with running context (this is the normal init path)
        // We need to do this synchronously-enough for the test to work
        // So we'll init, then simulate iOS suspending the context
        let initDone = false;
        initAudioEngine().then(() => { initDone = true; });

        // Flush microtasks to complete init
        vi.runAllTimers();

        // Now simulate iOS suspending the context (user left the page)
        mockCtx.state = 'suspended';
        mockCtx.resume.mockClear(); // Clear the resume from init

        // Call the playback function (user returned and tapped play)
        action.call();

        // Assert: resume() SHOULD be called when context is suspended
        // On UNFIXED code, this will FAIL because the playback functions
        // never check audioContext.state after init
        return mockCtx.resume.mock.calls.length > 0;
      }),
      { numRuns: 100 }
    );
  });
});
