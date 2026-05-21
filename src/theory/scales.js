// Scale generation for the Scale Explorer view.
// Pure functions — no DOM dependencies.
// Uses proper diatonic spelling: each scale degree uses the next letter name.

import { SLICES } from '../circle/keys.js';

/**
 * @typedef {Object} ScaleResult
 * @property {string} name - Scale type name (e.g., 'Major', 'Natural Minor')
 * @property {string} tonic - Tonic note name
 * @property {string[]} notes - Array of 8 note names (tonic to tonic)
 * @property {number[]} intervals - Semitone intervals between consecutive notes
 * @property {number[]} staffPositions - Staff line positions for each note
 */

/** Interval patterns in semitones */
export const SCALE_INTERVALS = {
  major:         [2, 2, 1, 2, 2, 2, 1],
  naturalMinor:  [2, 1, 2, 2, 1, 2, 2],
  harmonicMinor: [2, 1, 2, 2, 1, 3, 1],
  melodicMinor:  [2, 1, 2, 2, 2, 2, 1]  // ascending form
};

/** Display names for scale types */
const SCALE_NAMES = {
  major: 'Majeure',
  naturalMinor: 'Mineure naturelle',
  harmonicMinor: 'Mineure harmonique',
  melodicMinor: 'Mineure mélodique'
};

/** The 7 natural note names in French solfège, in order */
const NOTE_LETTERS = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI'];

/** Chromatic pitch of each natural note (semitones from C) */
const NATURAL_PITCH = { DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11 };

/**
 * Get the base letter index (0-6) for a given chromatic pitch.
 * Returns the natural note that is closest (preferring the note itself or flat side).
 */
function chromaticToLetterIndex(chromatic) {
  // Map: C=0, D=1, E=2, F=3, G=4, A=5, B=6
  const map = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  return map[chromatic % 12];
}

/**
 * Determine the tonic letter index from the key's tonic name.
 * Parses the French note name to find the base letter.
 */
function getTonicLetterIndex(tonicName) {
  // Handle names like "DO", "FA#", "SOL♭/FA#", "ré", "fa#"
  const name = tonicName.split('/')[0].replace(/[#♯♭♮]/g, '').toUpperCase();
  const idx = NOTE_LETTERS.indexOf(name);
  if (idx >= 0) return idx;
  // Try partial match for accented characters (ré → RE)
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  return NOTE_LETTERS.indexOf(normalized);
}

/**
 * Get the chromatic pitch (0-11) for a tonic name.
 */
function getTonicChromatic(tonicName) {
  const name = tonicName.split('/')[0];
  let baseName = name.replace(/[#♯♭♮]/g, '').toUpperCase();
  // Handle accented characters (ré → RE)
  baseName = baseName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  let pitch = NATURAL_PITCH[baseName] || 0;
  if (name.includes('#') || name.includes('♯')) pitch = (pitch + 1) % 12;
  if (name.includes('♭')) pitch = (pitch + 11) % 12;
  return pitch;
}

/**
 * Format a note name given a letter index and the required chromatic pitch.
 * Uses the letter at letterIndex and adds the appropriate accidental.
 * @param {number} letterIndex - Index into NOTE_LETTERS (0-6)
 * @param {number} targetChromatic - Required chromatic pitch (0-11)
 * @returns {string} French note name with accidental (e.g., "DO", "FA#", "SI♭")
 */
function formatNoteName(letterIndex, targetChromatic) {
  const letter = NOTE_LETTERS[letterIndex % 7];
  const naturalPitch = NATURAL_PITCH[letter];
  const diff = ((targetChromatic - naturalPitch) + 12) % 12;

  if (diff === 0) return letter;
  if (diff === 1) return letter + '#';
  if (diff === 2) return letter + '𝄪';
  if (diff === 11) return letter + '♭';
  if (diff === 10) return letter + '♭♭';
  // Shouldn't happen in normal scales, but fallback
  return letter + (diff <= 6 ? '#'.repeat(diff) : '♭'.repeat(12 - diff));
}

/**
 * Convert a circle-of-fifths slice index to a chromatic pitch index.
 */
function sliceToChromaticIndex(sliceIndex) {
  return ((sliceIndex % 12) * 7) % 12;
}

/**
 * Generate a scale with proper diatonic spelling.
 * Each degree uses the next letter name in sequence, with appropriate accidentals.
 * @param {number} keyIndex - Slice index (0-11)
 * @param {'major' | 'minor'} keyType - Key type
 * @param {'major' | 'naturalMinor' | 'harmonicMinor' | 'melodicMinor'} scaleType
 * @returns {ScaleResult}
 */
export function getScale(keyIndex, keyType, scaleType) {
  const safeIndex = ((keyIndex % 12) + 12) % 12;

  // Determine the tonic
  const slice = SLICES[safeIndex];
  const tonic = keyType === 'major' ? slice.major : slice.minor;

  // Get tonic chromatic pitch and letter index
  const tonicChromatic = getTonicChromatic(tonic);
  const tonicLetterIdx = getTonicLetterIndex(tonic);

  // Get the interval pattern
  const intervals = SCALE_INTERVALS[scaleType];

  // Generate 8 notes with proper diatonic spelling
  // Each degree uses the next letter in sequence
  const notes = [];
  let currentChromatic = tonicChromatic;

  for (let i = 0; i < 8; i++) {
    const letterIdx = (tonicLetterIdx + i) % 7;
    notes.push(formatNoteName(letterIdx, currentChromatic));
    if (i < 7) {
      currentChromatic = (currentChromatic + intervals[i]) % 12;
    }
  }

  // Compute staff positions
  // Starting positions: A=-2, B=-1, C=0, D=1, E=2, F=3, G=4
  const letterToStartPos = { DO: 0, RE: 1, MI: 2, FA: 3, SOL: 4, LA: -2, SI: -1 };
  const startLetter = NOTE_LETTERS[tonicLetterIdx];
  const startPos = letterToStartPos[startLetter];
  const staffPositions = [];
  for (let i = 0; i < 8; i++) {
    staffPositions.push(startPos + i);
  }

  // For melodic minor: append descending natural minor (from 7th degree back to tonic)
  if (scaleType === 'melodicMinor') {
    const naturalIntervals = SCALE_INTERVALS.naturalMinor;
    // Generate descending natural minor notes (degrees 7 down to 1)
    let descChromatic = tonicChromatic; // start from tonic, go up with natural intervals to find degree 8
    for (let i = 0; i < 7; i++) {
      descChromatic = (descChromatic + naturalIntervals[i]) % 12;
    }
    // Now descend from degree 7 (one below the octave) back to tonic
    const descendingNotes = [];
    const descendingPositions = [];
    let currentDesc = descChromatic;
    for (let i = 6; i >= 0; i--) {
      currentDesc = (currentDesc - naturalIntervals[i] + 12) % 12;
      const letterIdx = (tonicLetterIdx + i) % 7;
      descendingNotes.push(formatNoteName(letterIdx, currentDesc));
      descendingPositions.push(startPos + i);
    }
    // Remove the last note (tonic) since it duplicates the start
    descendingNotes.pop();
    descendingPositions.pop();
    
    notes.push(...descendingNotes);
    staffPositions.push(...descendingPositions);
  }

  return {
    name: SCALE_NAMES[scaleType],
    tonic,
    notes,
    intervals,
    staffPositions
  };
}

/**
 * Get all scales for a given key.
 * For a major key: major scale + 3 minor variants of relative minor.
 * For a minor key: relative major + 3 minor variants.
 * @param {number} keyIndex - Slice index (0-11)
 * @param {'major' | 'minor'} keyType - Key type
 * @returns {ScaleResult[]} Array of 4 scales
 */
export function getAllScales(keyIndex, keyType) {
  const safeIndex = ((keyIndex % 12) + 12) % 12;

  if (keyType === 'major') {
    return [
      getScale(safeIndex, 'major', 'major'),
      getScale(safeIndex, 'minor', 'naturalMinor'),
      getScale(safeIndex, 'minor', 'harmonicMinor'),
      getScale(safeIndex, 'minor', 'melodicMinor')
    ];
  } else {
    return [
      getScale(safeIndex, 'major', 'major'),
      getScale(safeIndex, 'minor', 'naturalMinor'),
      getScale(safeIndex, 'minor', 'harmonicMinor'),
      getScale(safeIndex, 'minor', 'melodicMinor')
    ];
  }
}
