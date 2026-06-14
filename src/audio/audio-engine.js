// Audio Engine: central module managing audio lifecycle and playback.
// Lazy AudioContext creation, sample loading, playback scheduling, and state coordination.

import { mapScaleToSampleKeys, mapChordToSampleKeysFromStaff } from './pitch-mapper.js';
import { loadSamples, getBuffer, clearBuffers } from './sample-library.js';
import { scheduleScale, scheduleChordSequence, scheduleImmediate } from './scheduler.js';
import { get, set, subscribe } from '../state.js';
import { getChordStaffPositions } from '../modes/staff-renderer.js';

// ─── Module-level state ───────────────────────────────────────────────────────

/** @type {AudioContext|null} */
let audioContext = null;

/** Whether sample loading has been triggered */
let loadingTriggered = false;

/** Whether samples have finished loading */
let samplesLoaded = false;

/** @type {Map<string, AudioBuffer>} */
let buffers = new Map();

/** Current playback state */
let playbackState = {
  isPlaying: false,
  sectionId: null,
  currentIndex: -1,
  type: null
};

/** Stop function for the currently active playback */
let currentStopFn = null;

/** Immediate stop function for the currently active playback (no fade-out) */
let currentImmediateStopFn = null;

/** Timeout ID for the completion callback */
let completionTimeout = null;

/** Unsubscribe functions for state subscriptions */
let unsubscribeActiveKey = null;
let unsubscribeCurrentMode = null;
let unsubscribeInstrument = null;

/** Handler reference for visibilitychange listener (for cleanup) */
let visibilityHandler = null;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Update playback state both internally and in the state store.
 */
function updatePlaybackState(updates) {
  playbackState = { ...playbackState, ...updates };
  set('playbackState', { ...playbackState });
}

/**
 * Clear the completion timeout if one is pending.
 */
function clearCompletionTimeout() {
  if (completionTimeout !== null) {
    clearTimeout(completionTimeout);
    completionTimeout = null;
  }
}

/**
 * Ensure the AudioContext is in 'running' state.
 * On iOS, the context may be suspended after returning from background.
 * Calling resume() on an already-running context is harmless (resolves immediately).
 */
function ensureContextRunning() {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

/**
 * Handle instrument state changes: stop playback, clear old buffers, load new samples.
 * Follows the same abrupt stop pattern as activeKey changes.
 * @param {string} newInstrument - The new instrument value ('guitar' or 'piano')
 */
async function onInstrumentChange(newInstrument) {
  stopPlaybackImmediate();
  samplesLoaded = false;
  clearBuffers();

  try {
    const result = await loadSamples(audioContext, newInstrument);
    buffers = result.buffers;
    samplesLoaded = true;
  } catch (e) {
    console.error('Failed to load samples for instrument:', newInstrument, e);
    samplesLoaded = false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize the AudioContext (lazy, on user gesture) and begin loading samples.
 * Multiple calls return the same AudioContext; sample loading is triggered only once.
 * @returns {Promise<boolean>} true if initialization succeeded
 */
export async function initAudioEngine() {
  // Reuse existing AudioContext if already created
  if (audioContext) {
    // Wait for samples if loading is in progress but not yet done
    if (loadingTriggered && !samplesLoaded) {
      // Already loading — just return true since context exists
      return true;
    }
    return true;
  }

  try {
    audioContext = new AudioContext();
  } catch (e) {
    console.error('Failed to initialize AudioContext:', e);
    return false;
  }

  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch (e) {
      // Non-fatal: some browsers may resume later on user gesture
    }
  }

  // Trigger sample loading exactly once
  if (!loadingTriggered) {
    loadingTriggered = true;
    try {
      const result = await loadSamples(audioContext, get('instrument'));
      buffers = result.buffers;
      samplesLoaded = true;
    } catch (e) {
      console.error('Failed to load samples:', e);
      samplesLoaded = false;
    }
  }

  // Subscribe to state changes for automatic stop
  if (!unsubscribeActiveKey) {
    unsubscribeActiveKey = subscribe('activeKey', () => {
      stopPlaybackImmediate();
    });
  }
  if (!unsubscribeCurrentMode) {
    unsubscribeCurrentMode = subscribe('currentMode', () => {
      stopPlaybackImmediate();
    });
  }
  if (!unsubscribeInstrument) {
    unsubscribeInstrument = subscribe('instrument', onInstrumentChange);
  }

  // Proactively resume AudioContext when page becomes visible again (iOS suspends it on background)
  if (!visibilityHandler) {
    visibilityHandler = () => {
      if (document.visibilityState === 'visible' && audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  }

  return true;
}

/**
 * Play a scale sequentially.
 * @param {string} sectionId - Unique identifier for the playing section
 * @param {{ notes: string[] }} scaleResult - Scale data with French solfège note names
 * @param {number} tempo - Inter-note spacing in ms
 * @param {{ onNoteStart?: function, onComplete?: function }} callbacks
 */
export function playScale(sectionId, scaleResult, tempo, callbacks = {}) {
  ensureContextRunning();
  if (!audioContext || !samplesLoaded) return;

  // Stop any current playback first
  stopPlaybackImmediate();

  const sampleKeys = mapScaleToSampleKeys(scaleResult.notes, 3, scaleResult.staffPositions);

  const startTime = audioContext.currentTime + 0.05; // Small offset for scheduling
  const { stopFn, immediateStopFn, scheduledEndTime } = scheduleScale(
    audioContext,
    buffers,
    sampleKeys,
    startTime,
    tempo,
    0.8,
    (index, time) => {
      updatePlaybackState({ currentIndex: index });
      if (callbacks.onNoteStart) {
        callbacks.onNoteStart(index, time);
      }
    }
  );

  currentStopFn = stopFn;
  currentImmediateStopFn = immediateStopFn;
  updatePlaybackState({
    isPlaying: true,
    sectionId,
    currentIndex: 0,
    type: 'scale'
  });

  // Schedule completion callback
  const durationMs = (scheduledEndTime - audioContext.currentTime) * 1000;
  clearCompletionTimeout();
  completionTimeout = setTimeout(() => {
    updatePlaybackState({
      isPlaying: false,
      sectionId: null,
      currentIndex: -1,
      type: null
    });
    currentStopFn = null;
    completionTimeout = null;
    if (callbacks.onComplete) {
      callbacks.onComplete();
    }
  }, Math.max(0, durationMs));
}

/**
 * Play a chord sequence (7 diatonic chords).
 * Uses staff positions as the source of truth for pitch — same approach as scales.
 * @param {string} sectionId - Unique identifier for the playing section
 * @param {Array<{ root: string, intervals: number[], noteNames?: string[] }>} chords - Array of chord objects
 * @param {number} keyIndex - Key index (0-11)
 * @param {string} keyType - 'major' or 'minor'
 * @param {number} tempo - Inter-chord spacing in ms
 * @param {{ onChordStart?: function, onComplete?: function }} callbacks
 */
export function playChordSequence(sectionId, chords, keyIndex, keyType, tempo, callbacks = {}) {
  ensureContextRunning();
  if (!audioContext || !samplesLoaded) return;

  // Stop any current playback first
  stopPlaybackImmediate();

  // Map each chord using staff positions (same as visual rendering)
  const chordSampleKeys = chords.map(chord => {
    const staffPositions = getChordStaffPositions(keyIndex, keyType, chord);
    const noteNames = chord.noteNames || [chord.root];
    return mapChordToSampleKeysFromStaff(noteNames, staffPositions, 3);
  });

  const startTime = audioContext.currentTime + 0.05;
  const { stopFn, immediateStopFn, scheduledEndTime } = scheduleChordSequence(
    audioContext,
    buffers,
    chordSampleKeys,
    startTime,
    tempo,
    (index, time) => {
      updatePlaybackState({ currentIndex: index });
      if (callbacks.onChordStart) {
        callbacks.onChordStart(index, time);
      }
    }
  );

  currentStopFn = stopFn;
  currentImmediateStopFn = immediateStopFn;
  updatePlaybackState({
    isPlaying: true,
    sectionId,
    currentIndex: 0,
    type: 'chord'
  });

  // Schedule completion callback
  const durationMs = (scheduledEndTime - audioContext.currentTime) * 1000;
  clearCompletionTimeout();
  completionTimeout = setTimeout(() => {
    updatePlaybackState({
      isPlaying: false,
      sectionId: null,
      currentIndex: -1,
      type: null
    });
    currentStopFn = null;
    completionTimeout = null;
    if (callbacks.onComplete) {
      callbacks.onComplete();
    }
  }, Math.max(0, durationMs));
}

/**
 * Play a single note immediately (tap playback).
 * @param {string} noteName - French solfège name (e.g., "DO", "FA#")
 * @param {string} [sampleKey] - Optional pre-computed sample key (e.g., "C4"). If provided, bypasses pitch mapping.
 */
export function playSingleNote(noteName, sampleKey) {
  ensureContextRunning();
  if (!audioContext || !samplesLoaded) return;

  // Stop any current playback first
  stopPlaybackImmediate();

  const sampleKeys = sampleKey ? [sampleKey] : mapScaleToSampleKeys([noteName], 3);
  const { stopFn, immediateStopFn } = scheduleImmediate(audioContext, buffers, sampleKeys, 1.0);
  currentStopFn = stopFn;
  currentImmediateStopFn = immediateStopFn;

  updatePlaybackState({
    isPlaying: true,
    sectionId: null,
    currentIndex: 0,
    type: 'scale'
  });
}

/**
 * Play a single chord immediately (tap playback).
 * Uses staff positions as the source of truth for pitch — same approach as scales.
 * @param {{ root: string, intervals: number[], noteNames?: string[] }} chord - Chord object
 * @param {number} keyIndex - Key index (0-11)
 * @param {string} keyType - 'major' or 'minor'
 */
export function playSingleChord(chord, keyIndex, keyType) {
  ensureContextRunning();
  if (!audioContext || !samplesLoaded) return;

  // Stop any current playback first
  stopPlaybackImmediate();

  // Use staff positions (same as visual rendering) to determine pitch
  const staffPositions = getChordStaffPositions(keyIndex, keyType, chord);
  const noteNames = chord.noteNames || [chord.root];
  const sampleKeys = mapChordToSampleKeysFromStaff(noteNames, staffPositions, 3);

  const gainPerTone = sampleKeys.length > 0 ? 1 / sampleKeys.length : 1;
  const { stopFn, immediateStopFn } = scheduleImmediate(audioContext, buffers, sampleKeys, gainPerTone);
  currentStopFn = stopFn;
  currentImmediateStopFn = immediateStopFn;

  updatePlaybackState({
    isPlaying: true,
    sectionId: null,
    currentIndex: 0,
    type: 'chord'
  });
}

/**
 * Stop all current playback with fade-out envelope (user-initiated stop).
 */
export function stopPlayback() {
  clearCompletionTimeout();
  if (currentStopFn) {
    currentStopFn(); // Scheduler's stopFn applies release envelope
    currentStopFn = null;
  }
  currentImmediateStopFn = null;
  updatePlaybackState({
    isPlaying: false,
    sectionId: null,
    currentIndex: -1,
    type: null
  });
}

/**
 * Stop all playback abruptly (for state changes, no fade-out).
 * Per Requirement 7.4: cancels all scheduled notes without applying
 * the normal fade-out envelope, stopping sound output abruptly.
 */
export function stopPlaybackImmediate() {
  clearCompletionTimeout();
  if (currentImmediateStopFn) {
    // Use immediate stop — disconnects nodes without gain ramp
    currentImmediateStopFn();
    currentImmediateStopFn = null;
    currentStopFn = null;
  } else if (currentStopFn) {
    // Fallback: if no immediateStopFn available, call regular stopFn
    currentStopFn();
    currentStopFn = null;
  }
  if (playbackState.isPlaying) {
    updatePlaybackState({
      isPlaying: false,
      sectionId: null,
      currentIndex: -1,
      type: null
    });
  }
}

/**
 * Returns true if AudioContext is initialized and samples are loaded.
 * @returns {boolean}
 */
export function isReady() {
  return audioContext !== null && samplesLoaded;
}

/**
 * Returns the current playback state.
 * @returns {{ isPlaying: boolean, sectionId: string|null, currentIndex: number, type: string|null }}
 */
export function getPlaybackState() {
  return { ...playbackState };
}

/**
 * Reset all internal state. For testing purposes only.
 */
export function _resetForTesting() {
  stopPlaybackImmediate();
  if (unsubscribeActiveKey) {
    unsubscribeActiveKey();
    unsubscribeActiveKey = null;
  }
  if (unsubscribeCurrentMode) {
    unsubscribeCurrentMode();
    unsubscribeCurrentMode = null;
  }
  if (unsubscribeInstrument) {
    unsubscribeInstrument();
    unsubscribeInstrument = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  audioContext = null;
  loadingTriggered = false;
  samplesLoaded = false;
  buffers = new Map();
  playbackState = {
    isPlaying: false,
    sectionId: null,
    currentIndex: -1,
    type: null
  };
  currentStopFn = null;
  currentImmediateStopFn = null;
  completionTimeout = null;
}

/**
 * Clean up the audio engine: stop playback, unsubscribe from state changes,
 * and reset module state. Call this on view teardown to release resources.
 */
export function cleanupAudioEngine() {
  stopPlaybackImmediate();
  if (unsubscribeActiveKey) {
    unsubscribeActiveKey();
    unsubscribeActiveKey = null;
  }
  if (unsubscribeCurrentMode) {
    unsubscribeCurrentMode();
    unsubscribeCurrentMode = null;
  }
  if (unsubscribeInstrument) {
    unsubscribeInstrument();
    unsubscribeInstrument = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
}
