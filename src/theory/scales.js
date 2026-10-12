// Scale generation for the Scale Explorer view.
// Pure functions — no DOM dependencies.
// Uses proper diatonic spelling: each scale degree uses the next letter name.

import { SLICES } from '../circle/keys.js';
import {
  NOTE_LETTERS,
  NATURAL_PITCH,
  SCALE_STEP_INTERVALS,
  parseNote,
  spellNote,
  staffLetterPosition
} from './pitch.js';

/**
 * @typedef {Object} ScaleResult
 * @property {string} name - Scale type name (e.g., 'Major', 'Natural Minor')
 * @property {string} tonic - Tonic note name
 * @property {string[]} notes - Array of 8 note names (tonic to tonic)
 * @property {number[]} intervals - Semitone intervals between consecutive notes
 * @property {number[]} staffPositions - Staff line positions for each note
 */

/** Display names for scale types */
const SCALE_NAMES = {
  major: 'Majeure',
  naturalMinor: 'Mineure naturelle',
  harmonicMinor: 'Mineure harmonique',
  melodicMinor: 'Mineure mélodique'
};

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

  const { base, accidentalOffset } = parseNote(tonic);
  const tonicLetterIdx = NOTE_LETTERS.indexOf(base);
  const tonicChromatic = ((NATURAL_PITCH[base] + accidentalOffset) % 12 + 12) % 12;

  const intervals = SCALE_STEP_INTERVALS[scaleType];

  // Generate 8 notes with proper diatonic spelling
  // Each degree uses the next letter in sequence
  const notes = [];
  let currentChromatic = tonicChromatic;

  for (let i = 0; i < 8; i++) {
    const letterIdx = (tonicLetterIdx + i) % 7;
    notes.push(spellNote(letterIdx, currentChromatic));
    if (i < 7) {
      currentChromatic = (currentChromatic + intervals[i]) % 12;
    }
  }

  // Compute staff positions
  const startPos = staffLetterPosition(base);
  const staffPositions = [];
  for (let i = 0; i < 8; i++) {
    staffPositions.push(startPos + i);
  }

  // For melodic minor: append descending natural minor (from 7th degree back to tonic)
  if (scaleType === 'melodicMinor') {
    const naturalIntervals = SCALE_STEP_INTERVALS.naturalMinor;
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
      descendingNotes.push(spellNote(letterIdx, currentDesc));
      descendingPositions.push(startPos + i);
    }
    // Keep the tonic at the end — the scale should resolve back to the starting note

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
 * Get all scales for a given key: the major scale plus the three minor variants
 * of the relative minor.
 * @param {number} keyIndex - Slice index (0-11)
 * @param {'major' | 'minor'} keyType - Key type
 * @returns {ScaleResult[]} Array of 4 scales
 */
export function getAllScales(keyIndex, keyType) {
  const safeIndex = ((keyIndex % 12) + 12) % 12;

  return [
    getScale(safeIndex, 'major', 'major'),
    getScale(safeIndex, 'minor', 'naturalMinor'),
    getScale(safeIndex, 'minor', 'harmonicMinor'),
    getScale(safeIndex, 'minor', 'melodicMinor')
  ];
}
