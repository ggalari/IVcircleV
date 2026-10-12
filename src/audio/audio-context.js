// src/audio/audio-context.js
// The AudioContext + sample-buffer seam: the context lifecycle, one-shot sample
// loading, buffer ownership, readiness, and iOS resume handling. Playback
// orchestration (audio-engine.js) reads this seam and never touches the Web Audio
// lifecycle directly.

import { loadSamples, clearBuffers } from './sample-library.js';
import { get } from '../state.js';

/** @type {AudioContext|null} */
let audioContext = null;

/** Whether sample loading has been triggered (loads at most once) */
let loadingTriggered = false;

/** Whether samples have finished loading */
let samplesLoaded = false;

/** @type {Map<string, AudioBuffer>} */
let buffers = new Map();

/** @type {Function|null} */
let visibilityHandler = null;

/**
 * Ensure the AudioContext is running. On iOS the context may be suspended after
 * returning from background; resuming an already-running context is harmless.
 */
export function ensureContextRunning() {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

/** Proactively resume the context when the page becomes visible again. */
function attachVisibilityHandler() {
  if (visibilityHandler) return;
  visibilityHandler = () => {
    if (document.visibilityState === 'visible' && audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
}

/**
 * Create the AudioContext (lazy, on a user gesture) and load samples exactly once.
 * @returns {Promise<boolean>} true if the context was created
 */
export async function initAudioContext() {
  if (audioContext) return true;

  try {
    audioContext = new AudioContext();
  } catch (e) {
    console.error('Failed to initialize AudioContext:', e);
    return false;
  }

  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch (e) {
      // Non-fatal: some browsers may resume later on a user gesture
    }
  }

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

  attachVisibilityHandler();
  return true;
}

/**
 * Reload samples for a new instrument, discarding the old buffers.
 * @param {string} instrument
 */
export async function loadInstrument(instrument) {
  samplesLoaded = false;
  clearBuffers();

  try {
    const result = await loadSamples(audioContext, instrument);
    buffers = result.buffers;
    samplesLoaded = true;
  } catch (e) {
    console.error('Failed to load samples for instrument:', instrument, e);
    samplesLoaded = false;
  }
}

/**
 * True once the context exists and its samples have loaded.
 * @returns {boolean}
 */
export function isAudioReady() {
  return audioContext !== null && samplesLoaded;
}

/** @returns {AudioContext|null} */
export function getAudioContext() {
  return audioContext;
}

/** @returns {Map<string, AudioBuffer>} */
export function getAudioBuffers() {
  return buffers;
}

/** Remove the visibility listener, leaving the context alive. */
export function detachVisibility() {
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
}

/** Tear the seam down to its initial state. */
export function resetAudioContext() {
  detachVisibility();
  audioContext = null;
  loadingTriggered = false;
  samplesLoaded = false;
  buffers = new Map();
}
