// Audio Engine: playback orchestration over the AudioContext + buffer seam.
// The context lifecycle, sample loading and readiness live in audio-context.js;
// this module schedules playback, owns stop bookkeeping, and publishes playback
// state to the store.

import { notesToSampleKeys, staffPositionOctave } from '../theory/pitch.js';
import {
  initAudioContext,
  loadInstrument,
  isAudioReady,
  ensureContextRunning,
  getAudioContext,
  getAudioBuffers,
  detachVisibility,
  resetAudioContext
} from './audio-context.js';
import { scheduleScale, scheduleChordSequence, scheduleImmediate } from './scheduler.js';
import { set, subscribe } from '../state.js';
import { getChordStaffPositions } from '../theory/chords.js';

// ─── Module-level state ───────────────────────────────────────────────────────

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
 * Handle instrument state changes: stop playback, then reload the seam's samples.
 * The stop belongs here (orchestration); the reload belongs to the audio seam.
 * @param {string} newInstrument - The new instrument value ('guitar' or 'piano')
 */
async function onInstrumentChange(newInstrument) {
  stopPlaybackImmediate();
  await loadInstrument(newInstrument);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize the AudioContext (lazy, on user gesture), begin loading samples,
 * and subscribe to the state changes that stop playback.
 * @returns {Promise<boolean>} true if initialization succeeded
 */
export async function initAudioEngine() {
  const ready = await initAudioContext();
  if (!ready) return false;

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
  const audioContext = getAudioContext();
  if (!audioContext || !isAudioReady()) return;

  // Stop any current playback first
  stopPlaybackImmediate();

  const sampleKeys = notesToSampleKeys(scaleResult.notes, scaleResult.staffPositions, 3);

  const startTime = audioContext.currentTime + 0.05; // Small offset for scheduling
  const { stopFn, immediateStopFn, scheduledEndTime } = scheduleScale(
    audioContext,
    getAudioBuffers(),
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
  const audioContext = getAudioContext();
  if (!audioContext || !isAudioReady()) return;

  // Stop any current playback first
  stopPlaybackImmediate();

  // Map each chord using staff positions (same as visual rendering)
  const chordSampleKeys = chords.map(chord => {
    const staffPositions = getChordStaffPositions(keyIndex, keyType, chord);
    const noteNames = chord.noteNames || [chord.root];
    return notesToSampleKeys(noteNames, staffPositions, staffPositionOctave(staffPositions[0]));
  });

  const startTime = audioContext.currentTime + 0.05;
  const { stopFn, immediateStopFn, scheduledEndTime } = scheduleChordSequence(
    audioContext,
    getAudioBuffers(),
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
  const audioContext = getAudioContext();
  if (!audioContext || !isAudioReady()) return;

  // Stop any current playback first
  stopPlaybackImmediate();

  const sampleKeys = sampleKey ? [sampleKey] : notesToSampleKeys([noteName], [0], 3);
  const { stopFn, immediateStopFn } = scheduleImmediate(audioContext, getAudioBuffers(), sampleKeys, 1.0);
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
  const audioContext = getAudioContext();
  if (!audioContext || !isAudioReady()) return;

  // Stop any current playback first
  stopPlaybackImmediate();

  // Use staff positions (same as visual rendering) to determine pitch
  const staffPositions = getChordStaffPositions(keyIndex, keyType, chord);
  const noteNames = chord.noteNames || [chord.root];
  const sampleKeys = notesToSampleKeys(noteNames, staffPositions, staffPositionOctave(staffPositions[0]));

  const gainPerTone = sampleKeys.length > 0 ? 1 / sampleKeys.length : 1;
  const { stopFn, immediateStopFn } = scheduleImmediate(audioContext, getAudioBuffers(), sampleKeys, gainPerTone);
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
 * Cancels all scheduled notes without applying the normal fade-out envelope.
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
  return isAudioReady();
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
  resetAudioContext();
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
 * and detach the visibility listener. The AudioContext stays alive.
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
  detachVisibility();
}
