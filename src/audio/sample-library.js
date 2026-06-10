// Sample Library module: loading, decoding, and caching of guitar audio samples.
// Manages a module-level Map for referential identity on repeated access.
// Falls back to synthesized guitar-like tones when sample files are unavailable.

import { frenchNoteToSampleKey } from './pitch-mapper.js';

/**
 * All chromatic pitch keys from C3 to B5 (37 pitches).
 * Extended range to cover all chord voicings starting at octave 4.
 */
const CHROMATIC_KEYS = [
  'C3', 'Db3', 'D3', 'Eb3', 'E3', 'F3', 'Gb3', 'G3', 'Ab3', 'A3', 'Bb3', 'B3',
  'C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4',
  'C5', 'Db5', 'D5', 'Eb5', 'E5', 'F5', 'Gb5', 'G5', 'Ab5', 'A5', 'Bb5', 'B5'
];

/**
 * MIDI note number for each chromatic key (C3 = 48, ..., B5 = 83).
 */
const KEY_TO_MIDI = {};
CHROMATIC_KEYS.forEach((key, i) => { KEY_TO_MIDI[key] = 48 + i; });

/**
 * Module-level buffer cache — provides referential identity across calls.
 * @type {Map<string, AudioBuffer>}
 */
const bufferCache = new Map();

/**
 * Tracks whether loading has completed.
 */
let loaded = false;

/**
 * List of sample keys that failed to load.
 * @type {string[]}
 */
let failedSamples = [];

/**
 * Synthesize a guitar-like tone as an AudioBuffer.
 * Uses Karplus-Strong algorithm: a plucked string sound created
 * with a filtered noise burst excitation and a tuned delay line,
 * with body resonance simulation for warmth.
 *
 * @param {AudioContext} audioContext
 * @param {number} midiNote - MIDI note number (48–83)
 * @returns {AudioBuffer}
 */
function synthesizeTone(audioContext, midiNote) {
  const sampleRate = audioContext.sampleRate;
  const duration = 2.5; // seconds
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  // Convert MIDI to frequency: A4 = 440Hz, MIDI 69
  const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);

  // Karplus-Strong: tuned delay line length
  const period = Math.round(sampleRate / frequency);
  const wavetable = new Float32Array(period);

  // Initialize with shaped noise (simulate pluck excitation)
  for (let i = 0; i < period; i++) {
    wavetable[i] = Math.random() * 2 - 1;
  }

  // Multiple low-pass passes for warmer, more nylon-like character
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < period; i++) {
      wavetable[i] = 0.6 * wavetable[i] + 0.4 * wavetable[i - 1];
    }
    wavetable[0] = 0.6 * wavetable[0] + 0.4 * wavetable[period - 1];
  }

  // Decay: nylon strings sustain longer in the low range
  const decayFactor = 0.998 - (midiNote - 48) * 0.00025;
  // Blend factor for averaging filter (controls brightness decay)
  const blend = 0.49 + (midiNote - 48) * 0.0005;

  for (let i = 0; i < numSamples; i++) {
    const idx = i % period;

    if (i >= period) {
      // KS averaging filter
      const nextIdx = (idx + 1) % period;
      const averaged = blend * wavetable[idx] + (1 - blend) * wavetable[nextIdx];
      wavetable[idx] = decayFactor * averaged;
    }

    data[i] = wavetable[idx];
  }

  // Gentle attack envelope to avoid click
  const attackSamples = Math.min(Math.floor(sampleRate * 0.003), numSamples);
  for (let i = 0; i < attackSamples; i++) {
    data[i] *= i / attackSamples;
  }

  // Body resonance: subtle low-frequency warmth
  const bodyFreq = 90 + (midiNote - 48) * 0.5;
  const bodyDecay = 8.0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    data[i] += 0.06 * Math.exp(-t * bodyDecay) * Math.sin(2 * Math.PI * bodyFreq * t);
  }

  // Normalize
  let maxAmp = 0;
  for (let i = 0; i < numSamples; i++) {
    const abs = Math.abs(data[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  if (maxAmp > 0) {
    const scale = 0.8 / maxAmp;
    for (let i = 0; i < numSamples; i++) {
      data[i] *= scale;
    }
  }

  return buffer;
}

/**
 * Fetch and decode all 25 guitar samples (C3–C5 chromatic) from public/samples/guitar/.
 * Falls back to synthesized tones for any samples that fail to load.
 * Uses Promise.allSettled so individual failures don't block the batch.
 *
 * @param {AudioContext} audioContext - The Web Audio API AudioContext for decoding
 * @returns {Promise<{ buffers: Map<string, AudioBuffer>, loaded: boolean, failedSamples: string[] }>}
 */
export async function loadSamples(audioContext) {
  const results = await Promise.allSettled(
    CHROMATIC_KEYS.map(async (key) => {
      const url = `/samples/guitar/${key}.mp3`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return { key, audioBuffer };
    })
  );

  failedSamples = [];
  let synthesizedCount = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const key = CHROMATIC_KEYS[i];

    if (result.status === 'fulfilled') {
      bufferCache.set(result.value.key, result.value.audioBuffer);
    } else {
      // Fall back to synthesized tone instead of leaving the sample missing
      try {
        const synth = synthesizeTone(audioContext, KEY_TO_MIDI[key]);
        bufferCache.set(key, synth);
        synthesizedCount++;
      } catch (e) {
        failedSamples.push(key);
        console.error(`Failed to synthesize fallback for "${key}":`, e);
      }
    }
  }

  if (synthesizedCount > 0) {
    console.info(`Audio: ${synthesizedCount} samples synthesized (no .mp3 files found). Drop files in public/samples/guitar/ for real guitar sound.`);
  }

  // Add enharmonic aliases so lookups like "F#4" also find the "Gb4" buffer
  addEnharmonicAliases();

  loaded = true;

  return {
    buffers: bufferCache,
    loaded,
    failedSamples: [...failedSamples]
  };
}

/**
 * Add enharmonic aliases to the buffer cache so that both sharp and flat
 * names resolve to the same AudioBuffer.
 * E.g., if "Gb4" is in the cache, also set "F#4" → same buffer.
 */
function addEnharmonicAliases() {
  const SHARP_TO_FLAT = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
  const FLAT_TO_SHARP = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };

  // For each key in the cache, add the enharmonic equivalent
  const entries = [...bufferCache.entries()];
  for (const [key, buffer] of entries) {
    const match = key.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) continue;
    const [, noteName, octave] = match;

    if (FLAT_TO_SHARP[noteName]) {
      const alias = `${FLAT_TO_SHARP[noteName]}${octave}`;
      if (!bufferCache.has(alias)) {
        bufferCache.set(alias, buffer);
      }
    }
    if (SHARP_TO_FLAT[noteName]) {
      const alias = `${SHARP_TO_FLAT[noteName]}${octave}`;
      if (!bufferCache.has(alias)) {
        bufferCache.set(alias, buffer);
      }
    }
  }
}

/**
 * Enharmonic equivalents: maps sharp-based keys to the flat-based names
 * used in CHROMATIC_KEYS. This resolves lookups like "F#4" → "Gb4".
 */
const ENHARMONIC_MAP = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
  // Double sharps and unusual spellings
  'D##': 'E', 'E#': 'F', 'B#': 'C',
  'Cb': 'B', 'Fb': 'E',
};

/**
 * Normalize a sample key to match the CHROMATIC_KEYS naming convention (flat-based).
 * E.g., "F#4" → "Gb4", "C#3" → "Db3"
 * @param {string} key - Sample key like "F#4", "Gb4", "C4"
 * @returns {string} Normalized key matching CHROMATIC_KEYS
 */
function normalizeKey(key) {
  // Extract note name and octave
  const match = key.match(/^([A-G][#b]*)(\d+)$/);
  if (!match) return key;
  const [, noteName, octave] = match;

  // Check if it needs remapping
  if (ENHARMONIC_MAP[noteName]) {
    const mapped = ENHARMONIC_MAP[noteName];
    // Handle octave shift for B#→C (goes up an octave) and Cb→B (goes down)
    let oct = parseInt(octave);
    if (noteName === 'B#' || noteName === 'E#' && mapped === 'F') {
      // B# is actually C of the next octave
      if (noteName === 'B#') oct += 1;
    }
    if (noteName === 'Cb') {
      oct -= 1;
    }
    return `${mapped}${oct}`;
  }

  return key;
}

/**
 * Get a cached AudioBuffer for the given pitch key.
 * Handles enharmonic equivalents (e.g., "F#4" matches "Gb4" in cache).
 *
 * @param {string} pitchKey - e.g., "C4", "F#4", "Db3"
 * @returns {AudioBuffer|null} The cached buffer, or null if not available
 */
export function getBuffer(pitchKey) {
  // Try direct lookup first
  const direct = bufferCache.get(pitchKey);
  if (direct) return direct;

  // Try normalized (enharmonic) lookup
  const normalized = normalizeKey(pitchKey);
  return bufferCache.get(normalized) || null;
}

/**
 * Convert a French solfège note name + octave to the corresponding sample key.
 * Delegates to pitch-mapper's frenchNoteToSampleKey.
 *
 * @param {string} frenchNoteName - e.g., "DO", "FA#", "SI♭"
 * @param {number} octave - e.g., 4
 * @returns {string} Sample key like "C4", "F#4", "Bb3"
 */
export function mapNoteToSampleKey(frenchNoteName, octave) {
  return frenchNoteToSampleKey(frenchNoteName, octave);
}

/**
 * Reset internal state. For testing purposes only.
 */
export function _resetForTesting() {
  bufferCache.clear();
  loaded = false;
  failedSamples = [];
}
