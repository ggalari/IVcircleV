// Sample Library module: loading, decoding, and caching of audio samples.
// Manages a module-level Map for referential identity on repeated access.
// Supports multiple instruments:
//   - Guitar: falls back to Karplus-Strong synthesized tones when sample files are unavailable.
//   - Piano: no synthesis fallback; missing samples are marked as null (unavailable).

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
 * Buffer map keyed by the flat-based slot names in CHROMATIC_KEYS. Its `get`
 * resolves a spelled sample key (e.g. "F#4", "D##4") to that slot, so callers —
 * including the scheduler, which only sees the raw map — can look up any spelling.
 */
class SampleMap extends Map {
  get(key) {
    if (super.has(key)) return super.get(key);
    const slot = resolveToFileSlot(key);
    return super.has(slot) ? super.get(slot) : undefined;
  }
}

/**
 * Module-level buffer cache — provides referential identity across calls.
 * @type {SampleMap}
 */
const bufferCache = new SampleMap();

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
 * Fetch and decode all chromatic samples (C3–B5) from the appropriate instrument directory.
 * - Guitar: fetches from `/samples/guitar/`, falls back to Karplus-Strong synthesis for missing files.
 * - Piano: fetches from `/samples/piano/`, no synthesis fallback — failed pitches stored as `null`.
 * Uses Promise.allSettled so individual failures don't block the batch.
 *
 * @param {AudioContext} audioContext - The Web Audio API AudioContext for decoding
 * @param {string} instrument - The instrument to load samples for ('guitar' or 'piano')
 * @returns {Promise<{ buffers: Map<string, AudioBuffer|null>, loaded: boolean, failedSamples: string[] }>}
 */
export async function loadSamples(audioContext, instrument = 'guitar') {
  const sampleDir = `samples/${instrument === 'piano' ? 'piano' : 'guitar'}/`;

  const results = await Promise.allSettled(
    CHROMATIC_KEYS.map(async (key) => {
      const url = `${sampleDir}${key}.mp3`;
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
      if (instrument === 'guitar') {
        // Guitar: fall back to synthesized tone
        try {
          const synth = synthesizeTone(audioContext, KEY_TO_MIDI[key]);
          bufferCache.set(key, synth);
          synthesizedCount++;
        } catch (e) {
          failedSamples.push(key);
          console.error(`Failed to synthesize fallback for "${key}":`, e);
        }
      } else {
        // Piano: no synthesis fallback — mark pitch as unavailable
        bufferCache.set(key, null);
        failedSamples.push(key);
      }
    }
  }

  if (synthesizedCount > 0) {
    console.info(`Audio: ${synthesizedCount} samples synthesized (no .mp3 files found). Drop files in public/samples/guitar/ for real guitar sound.`);
  }

  loaded = true;

  return {
    buffers: bufferCache,
    loaded,
    failedSamples: [...failedSamples]
  };
}

/**
 * Enharmonic equivalents: maps non-standard or uncommon note spellings
 * to the flat-based names used in CHROMATIC_KEYS.
 * This resolves lookups like "F#4" → "Gb4", "E#4" → "F4", "Fbb4" → "Eb4".
 */
const ENHARMONIC_MAP = {
  // Simple sharps → flat equivalents
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
  // Enharmonic boundary notes (sharp side)
  'E#': 'F', 'B#': 'C',
  // Enharmonic boundary notes (flat side)
  'Cb': 'B', 'Fb': 'E',
  // Double sharps
  'C##': 'D', 'D##': 'E', 'E##': 'Gb', 'F##': 'G', 'G##': 'A', 'A##': 'B', 'B##': 'Db',
  // Double flats
  'Dbb': 'C', 'Ebb': 'D', 'Fbb': 'Eb', 'Gbb': 'F', 'Abb': 'G', 'Bbb': 'A', 'Cbb': 'Bb',
};

/**
 * Resolve a spelled sample key to the flat-based slot name used in CHROMATIC_KEYS.
 * The single enharmonic resolver for this adapter.
 * E.g., "F#4" → "Gb4", "E#4" → "F4", "B#3" → "C4", "Cb5" → "B4".
 * @param {string} key - Sample key like "F#4", "Gb4", "C4", "E#3", "Fbb4"
 * @returns {string} Slot name, or the key unchanged if it needs no remapping
 */
function resolveToFileSlot(key) {
  // Extract note name (with any accidentals) and octave
  const match = key.match(/^([A-G][#b]*)(\d+)$/);
  if (!match) return key;
  const [, noteName, octave] = match;

  // Check if it needs remapping
  if (ENHARMONIC_MAP[noteName]) {
    const mapped = ENHARMONIC_MAP[noteName];
    let oct = parseInt(octave);

    // Octave shifts for boundary crossings:
    // B# → C (next octave), B## → Db (next octave)
    if (noteName === 'B#' || noteName === 'B##') {
      oct += 1;
    }
    // Cb → B (previous octave), Cbb → Bb (previous octave)
    if (noteName === 'Cb' || noteName === 'Cbb') {
      oct -= 1;
    }

    return `${mapped}${oct}`;
  }

  return key;
}

/**
 * Get a cached AudioBuffer for the given pitch key.
 * Handles enharmonic equivalents (e.g., "F#4" matches "Gb4").
 * Returns null for pitches that are explicitly unavailable (e.g., failed piano samples).
 *
 * @param {string} sampleKey - e.g., "C4", "F#4", "Db3"
 * @returns {AudioBuffer|null} The cached buffer, or null if not available
 */
export function getBuffer(sampleKey) {
  return bufferCache.get(sampleKey) ?? null;
}

/**
 * Clear all cached buffers and reset loading state.
 * Called by the audio engine when switching instruments before loading new samples.
 */
export function clearBuffers() {
  bufferCache.clear();
  loaded = false;
  failedSamples = [];
}

/**
 * Reset internal state. For testing purposes only.
 */
export function _resetForTesting() {
  bufferCache.clear();
  loaded = false;
  failedSamples = [];
}
