// Diatonic chord generation for the Chord Explorer view.
// Uses SLICES from circle/keys.js for root note names.

import { SLICES } from '../circle/keys.js';

/** Quality patterns for major key triads (I through vii°) */
export const MAJOR_TRIAD_QUALITIES = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];

/** Quality patterns for minor key triads (i through VII) */
export const MINOR_TRIAD_QUALITIES = ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'];

/** Quality patterns for major key seventh chords */
export const MAJOR_SEVENTH_QUALITIES = ['maj7', 'min7', 'min7', 'maj7', 'dom7', 'min7', 'half-dim7'];

/** Quality patterns for minor key seventh chords */
export const MINOR_SEVENTH_QUALITIES = ['min7', 'half-dim7', 'maj7', 'min7', 'min7', 'maj7', 'dom7'];

/**
 * Roman numeral labels for major key triads.
 * Uppercase = major, lowercase = minor, ° = diminished.
 */
const MAJOR_ROMAN_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

/**
 * Roman numeral labels for minor key triads.
 */
const MINOR_ROMAN_NUMERALS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

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
 * Major scale intervals in semitones from root: W W H W W W H
 * Cumulative semitones for each scale degree (0-indexed).
 */
const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

/**
 * Natural minor scale intervals in semitones from root: W H W W H W W
 * Cumulative semitones for each scale degree (0-indexed).
 */
const MINOR_SCALE_SEMITONES = [0, 2, 3, 5, 7, 8, 10];

/**
 * The diatonic notes of a major key form 7 consecutive positions on the
 * circle of fifths, starting from 1 position counter-clockwise of the tonic
 * (the IV degree). The order on the circle gives us: IV, I, V, II, VI, III, VII.
 * We need to reorder these to scale degree order: I, II, III, IV, V, VI, VII.
 *
 * Circle-of-fifths offsets from tonic for each scale degree (major key):
 * I=0, II=+2, III=+4, IV=-1(=+11), V=+1, VI=+3, VII=+5
 */
const MAJOR_FIFTHS_OFFSETS = [0, 2, 4, -1, 1, 3, 5];

/**
 * Circle-of-fifths offsets for minor key scale degrees.
 * The minor tonic at slice N has its note name at slice N+3 on the circle.
 * (Because la minor shares slice 0 with DO major, but LA as a note is at slice 3.)
 * 
 * For natural minor scale degrees (i through VII):
 * i (tonic) = +3 from slice index
 * ii° = +5
 * III = 0 (same as relative major)
 * iv = +2
 * v = +4
 * VI = -1 (= +11)
 * VII = +1
 */
const MINOR_FIFTHS_OFFSETS = [3, 5, 0, 2, 4, -1, 1];

/**
 * Compute staff positions for chord noteheads.
 * Staff positions represent vertical placement on the staff (0 = top line, increasing downward).
 * For a triad/seventh built on scale degree N, noteheads are stacked in thirds.
 * Position is based on the scale degree number (1-7), with each degree being one staff position apart.
 * 
 * @param {number} degree - Scale degree (1-7)
 * @param {number} noteCount - Number of notes in the chord (3 for triads, 4 for sevenths)
 * @returns {number[]} Staff positions for each notehead
 */
function computeStaffPositions(degree, noteCount) {
  // Staff positions: degree 1 starts at position 0, each scale step is 1 position
  // Chord notes are stacked in thirds (every other scale degree)
  const positions = [];
  for (let i = 0; i < noteCount; i++) {
    // Each chord tone is 2 scale steps above the previous (a third)
    // Use 7-based wrapping for staff positions
    const scaleDegree = degree - 1 + (i * 2); // 0-indexed
    positions.push(scaleDegree);
  }
  return positions;
}

/**
 * The 7 natural note names in order, used for diatonic spelling.
 */
const NOTE_LETTERS = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI'];
const NATURAL_PITCH = { DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11 };

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
  // Get the tonic name and determine its letter
  const slice = SLICES[keyIndex];
  const tonicName = keyType === 'major' ? slice.major : slice.minor;
  const tonicBase = tonicName.split('/')[0].replace(/[#♯♭♮]/g, '');
  // Normalize accented chars (ré → RE)
  const tonicUpper = tonicBase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const tonicLetterIdx = NOTE_LETTERS.indexOf(tonicUpper);

  // Get tonic chromatic pitch
  let tonicChromatic = NATURAL_PITCH[tonicUpper] || 0;
  const tonicNameFirst = tonicName.split('/')[0];
  if (tonicNameFirst.includes('#') || tonicNameFirst.includes('♯')) tonicChromatic = (tonicChromatic + 1) % 12;
  if (tonicNameFirst.includes('♭')) tonicChromatic = (tonicChromatic + 11) % 12;

  // Scale intervals for this key type
  const scaleIntervals = keyType === 'major'
    ? [0, 2, 4, 5, 7, 9, 11]  // major scale semitones
    : [0, 2, 3, 5, 7, 8, 10]; // natural minor scale semitones

  // The chord root is at this chromatic pitch
  const rootChromatic = (tonicChromatic + scaleIntervals[degreeIndex]) % 12;

  // The letter for this degree is tonicLetter + degreeIndex steps
  const rootLetterIdx = (tonicLetterIdx + degreeIndex) % 7;
  const rootLetter = NOTE_LETTERS[rootLetterIdx];

  // Compute the accidental needed
  const naturalPitch = NATURAL_PITCH[rootLetter];
  const diff = ((rootChromatic - naturalPitch) + 12) % 12;

  if (diff === 0) return rootLetter;
  if (diff === 1) return rootLetter + '#';
  if (diff === 2) return rootLetter + '𝄪';
  if (diff === 11) return rootLetter + '♭';
  if (diff === 10) return rootLetter + '♭♭';
  return rootLetter;
}

/**
 * Generate the 7 diatonic triads for a given key.
 * @param {number} keyIndex - Slice index (0-11)
 * @param {'major' | 'minor'} keyType - Key type
 * @returns {DiatonicChord[]} Array of 7 triads
 */
export function getDiatonicTriads(keyIndex, keyType) {
  const qualities = keyType === 'major' ? MAJOR_TRIAD_QUALITIES : MINOR_TRIAD_QUALITIES;
  const romanNumerals = keyType === 'major' ? MAJOR_ROMAN_NUMERALS : MINOR_ROMAN_NUMERALS;
  
  return qualities.map((quality, i) => ({
    degree: i + 1,
    roman: romanNumerals[i],
    root: getRootNoteName(keyIndex, keyType, i),
    quality,
    intervals: TRIAD_INTERVALS[quality],
    staffPositions: computeStaffPositions(i + 1, 3)
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
  const romanNumerals = keyType === 'major' ? MAJOR_ROMAN_NUMERALS : MINOR_ROMAN_NUMERALS;
  // For seventh chord root names, use the triad qualities to determine major/minor name
  const triadQualities = keyType === 'major' ? MAJOR_TRIAD_QUALITIES : MINOR_TRIAD_QUALITIES;
  
  return qualities.map((quality, i) => ({
    degree: i + 1,
    roman: romanNumerals[i],
    root: getRootNoteName(keyIndex, keyType, i),
    quality,
    intervals: SEVENTH_INTERVALS[quality],
    staffPositions: computeStaffPositions(i + 1, 4)
  }));
}
