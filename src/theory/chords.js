// Diatonic chord generation for the Chord Explorer view.
// Uses SLICES from circle/keys.js for root note names.

import { SLICES } from '../circle/keys.js';
import {
  NOTE_LETTERS,
  NATURAL_PITCH,
  SCALE_STEP_INTERVALS,
  parseNote,
  spellNote,
  cumulativeSemitones,
  degreeLabels
} from './pitch.js';

/** Quality patterns for major key triads (I through vii°) */
export const MAJOR_TRIAD_QUALITIES = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];

/** Quality patterns for minor key triads (i through VII) */
export const MINOR_TRIAD_QUALITIES = ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'];

/** Quality patterns for major key seventh chords */
export const MAJOR_SEVENTH_QUALITIES = ['maj7', 'min7', 'min7', 'maj7', 'dom7', 'min7', 'half-dim7'];

/** Quality patterns for minor key seventh chords */
export const MINOR_SEVENTH_QUALITIES = ['min7', 'half-dim7', 'maj7', 'min7', 'min7', 'maj7', 'dom7'];

/**
 * Semitone intervals for triad qualities.
 */
const TRIAD_INTERVALS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8]
};

/**
 * Semitone intervals for seventh chord qualities.
 */
const SEVENTH_INTERVALS = {
  'maj7': [0, 4, 7, 11],
  'min7': [0, 3, 7, 10],
  'dom7': [0, 4, 7, 10],
  'half-dim7': [0, 3, 6, 10]
};

/**
 * Get the root note name for a given scale degree in a key.
 * Uses proper diatonic spelling: each degree uses the next letter name from the tonic,
 * with the appropriate accidental to match the chromatic pitch.
 *
 * @param {number} keyIndex - Slice index (0-11) on the circle of fifths
 * @param {'major' | 'minor'} keyType - Key type
 * @param {number} degreeIndex - Scale degree index (0-6)
 * @returns {string} Root note name with proper spelling
 */
function getRootNoteName(keyIndex, keyType, degreeIndex) {
  const slice = SLICES[keyIndex];
  const tonicName = keyType === 'major' ? slice.major : slice.minor;

  const { base, accidentalOffset } = parseNote(tonicName);
  const tonicLetterIdx = NOTE_LETTERS.indexOf(base);
  const tonicChromatic = ((NATURAL_PITCH[base] + accidentalOffset) % 12 + 12) % 12;

  const scaleIntervals = cumulativeSemitones(
    keyType === 'major' ? SCALE_STEP_INTERVALS.major : SCALE_STEP_INTERVALS.naturalMinor
  );

  const rootChromatic = (tonicChromatic + scaleIntervals[degreeIndex]) % 12;
  const rootLetterIdx = (tonicLetterIdx + degreeIndex) % 7;

  return spellNote(rootLetterIdx, rootChromatic);
}

/**
 * Generate the 7 diatonic triads for a given key.
 * @param {number} keyIndex - Slice index (0-11)
 * @param {'major' | 'minor'} keyType - Key type
 * @returns {DiatonicChord[]} Array of 7 triads
 */
export function getDiatonicTriads(keyIndex, keyType) {
  const qualities = keyType === 'major' ? MAJOR_TRIAD_QUALITIES : MINOR_TRIAD_QUALITIES;
  const romanNumerals = degreeLabels(keyType);

  return qualities.map((quality, i) => ({
    degree: i + 1,
    roman: romanNumerals[i],
    root: getRootNoteName(keyIndex, keyType, i),
    quality,
    intervals: TRIAD_INTERVALS[quality],
    noteNames: getChordToneNames(keyIndex, keyType, i, 3)
  }));
}

/**
 * Generate the 7 diatonic seventh chords for a given key.
 * @param {number} keyIndex - Slice index (0-11)
 * @param {'major' | 'minor'} keyType - Key type
 * @returns {DiatonicChord[]} Array of 7 seventh chords
 */
export function getDiatonicSevenths(keyIndex, keyType) {
  const qualities = keyType === 'major' ? MAJOR_SEVENTH_QUALITIES : MINOR_SEVENTH_QUALITIES;
  const romanNumerals = degreeLabels(keyType);

  return qualities.map((quality, i) => ({
    degree: i + 1,
    roman: romanNumerals[i],
    root: getRootNoteName(keyIndex, keyType, i),
    quality,
    intervals: SEVENTH_INTERVALS[quality],
    noteNames: getChordToneNames(keyIndex, keyType, i, 4)
  }));
}

/**
 * Get the French solfège note names for each tone in a chord.
 * A chord built on degree `degreeIndex` uses every other scale degree (stacked thirds).
 * @param {number} keyIndex - Slice index (0-11)
 * @param {'major' | 'minor'} keyType - Key type
 * @param {number} degreeIndex - Root scale degree (0-6)
 * @param {number} noteCount - Number of notes (3 for triads, 4 for sevenths)
 * @returns {string[]} Array of French note names for each chord tone
 */
function getChordToneNames(keyIndex, keyType, degreeIndex, noteCount) {
  const names = [];
  for (let i = 0; i < noteCount; i++) {
    // Each chord tone is 2 scale degrees above the previous (stacked thirds)
    const scaleDegree = (degreeIndex + i * 2) % 7;
    names.push(getRootNoteName(keyIndex, keyType, scaleDegree));
  }
  return names;
}

/**
 * Staff positions for each note of a diatonic chord, relative to the key's tonic.
 * This is the single source of truth shared by staff rendering (buildChordAbc)
 * and audio playback, so the two can no longer diverge.
 * @param {number} keyIndex - Circle-of-fifths slice (0-11)
 * @param {'major' | 'minor'} keyType
 * @param {{ degree: number, intervals: number[] }} chord
 * @returns {number[]} Staff positions, one per chord tone
 */
export function getChordStaffPositions(keyIndex, keyType, chord) {
  const majorTonicStaffPos = [0, 4, 1, 5, 2, 6, 3, 1, 5, 2, 6, 3];
  const minorTonicStaffPos = [5, 2, 6, 3, 0, 4, 2, 6, 3, 0, 4, 1];

  let tonicStaffPos = keyType === 'major' ? majorTonicStaffPos[keyIndex] : minorTonicStaffPos[keyIndex];
  if (tonicStaffPos >= 5) tonicStaffPos -= 7;

  const rootDegreeIdx = chord.degree - 1;
  const noteCount = chord.intervals.length;
  const positions = [];

  for (let i = 0; i < noteCount; i++) {
    positions.push(tonicStaffPos + rootDegreeIdx + (i * 2));
  }

  return positions;
}
