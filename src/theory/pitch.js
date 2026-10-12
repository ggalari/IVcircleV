// theory/pitch.js
// Spelled-pitch identity: French solfège spelling -> canonical sample key.
// Pure functions. A note's octave is derived from its staff position, so the
// spelling (letter + accidental) is preserved and only the octave moves.

/** Solfège bases, longest first so SOL is matched before SI. */
const SOLFEGE_BASES = ['SOL', 'DO', 'RE', 'MI', 'FA', 'LA', 'SI'];

/** The seven note letters in diatonic order. */
export const NOTE_LETTERS = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI'];

/** Chromatic pitch of each natural note, in semitones from DO. */
export const NATURAL_PITCH = { DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11 };

/** Scale step intervals, in semitones, for each scale type. */
export const SCALE_STEP_INTERVALS = {
  major: [2, 2, 1, 2, 2, 2, 1],
  naturalMinor: [2, 1, 2, 2, 1, 2, 2],
  harmonicMinor: [2, 1, 2, 2, 1, 3, 1],
  melodicMinor: [2, 1, 2, 2, 2, 2, 1]
};

/** Roman-numeral labels for the seven diatonic degrees, by key type. */
const DEGREE_LABELS = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  minor: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']
};

/** Staff position of each natural note letter. */
const LETTER_STAFF_POSITION = { DO: 0, RE: 1, MI: 2, FA: 3, SOL: 4, LA: -2, SI: -1 };

/** Solfège base -> English note letter. */
const SOLFEGE_TO_ENGLISH = {
  DO: 'C',
  RE: 'D',
  MI: 'E',
  FA: 'F',
  SOL: 'G',
  LA: 'A',
  SI: 'B'
};

/** Accidental spelling -> its semitone offset and ASCII form used in sample keys. */
const ACCIDENTALS = {
  '': { offset: 0, ascii: '' },
  '#': { offset: 1, ascii: '#' },
  '♯': { offset: 1, ascii: '#' },
  '𝄪': { offset: 2, ascii: '##' },
  '##': { offset: 2, ascii: '##' },
  'b': { offset: -1, ascii: 'b' },
  '♭': { offset: -1, ascii: 'b' },
  '♭♭': { offset: -2, ascii: 'bb' },
  'bb': { offset: -2, ascii: 'bb' }
};

/**
 * Parse a French note name into its base letter and accidental. The one parser
 * for solfège spelling; the spelling is preserved, never normalised.
 * @param {string} frenchNote - e.g. "DO", "FA#", "SI♭", "RE𝄪", "LA♭♭"
 * @returns {{ base: string, letter: string, accidentalOffset: number, accidental: string }}
 */
export function parseNote(frenchNote) {
  const name = frenchNote
    .split('/')[0]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const base = SOLFEGE_BASES.find((b) => name.startsWith(b));
  if (!base) {
    throw new Error(`Unknown solfège note: "${frenchNote}"`);
  }

  const remainder = name.slice(base.length);
  const { offset, ascii } = ACCIDENTALS[remainder] ?? { offset: 0, ascii: remainder };

  return { base, letter: SOLFEGE_TO_ENGLISH[base], accidentalOffset: offset, accidental: ascii };
}

/**
 * Spell a note from its letter index and target chromatic pitch, keeping proper
 * diatonic spelling (one letter per degree). The one formatter.
 * @param {number} letterIndex - Index into NOTE_LETTERS (0-6)
 * @param {number} targetChromatic - Required chromatic pitch (0-11)
 * @returns {string} French name with accidentals, e.g. "DO", "FA#", "SI♭", "RE𝄪"
 */
export function spellNote(letterIndex, targetChromatic) {
  const letter = NOTE_LETTERS[((letterIndex % 7) + 7) % 7];
  const diff = ((targetChromatic - NATURAL_PITCH[letter]) + 12) % 12;

  if (diff === 0) return letter;
  if (diff === 1) return letter + '#';
  if (diff === 2) return letter + '𝄪';
  if (diff === 10) return letter + '♭♭';
  if (diff === 11) return letter + '♭';
  return letter + (diff <= 6 ? '#'.repeat(diff) : '♭'.repeat(12 - diff));
}

/**
 * Derive the cumulative semitone offset of each degree from step intervals.
 * @param {number[]} stepIntervals - Semitone steps between consecutive degrees
 * @returns {number[]} One offset per degree (omits the closing octave)
 */
export function cumulativeSemitones(stepIntervals) {
  const offsets = [0];
  let acc = 0;
  for (let i = 0; i < stepIntervals.length - 1; i++) {
    acc += stepIntervals[i];
    offsets.push(acc);
  }
  return offsets;
}

/**
 * The seven roman-numeral degree labels for a key type.
 * @param {'major' | 'minor'} keyType
 * @returns {string[]}
 */
export function degreeLabels(keyType) {
  return [...DEGREE_LABELS[keyType]];
}

/**
 * The staff position of a natural note letter.
 * @param {string} base - A solfège base, e.g. "DO"
 * @returns {number}
 */
export function staffLetterPosition(base) {
  return LETTER_STAFF_POSITION[base];
}

/**
 * Spelled pitch -> canonical sample key.
 * @param {string} frenchNote - e.g. "DO", "FA#", "SI♭"
 * @param {number} octave - The octave the note sits in
 * @returns {string} e.g. "C4", "F#4", "Bb3"
 */
export function noteToSampleKey(frenchNote, octave) {
  const { letter, accidental } = parseNote(frenchNote);
  return `${letter}${accidental}${octave}`;
}

/**
 * Map a run of spelled notes to sample keys, taking each octave from its staff
 * position. The first note is pinned to `baseOctave`; every later note's octave
 * follows the staff position's octave steps relative to the first. This is the
 * one octave rule shared by scale and chord playback.
 * @param {string[]} notes - French note names
 * @param {number[]} staffPositions - One staff position per note
 * @param {number} baseOctave - Octave assigned to the first note
 * @returns {string[]} Sample keys
 */
export function notesToSampleKeys(notes, staffPositions, baseOctave) {
  if (!notes || notes.length === 0) return [];

  const baseFloor = Math.floor(staffPositions[0] / 7);

  return notes.map((note, i) => {
    const octaveStep = Math.floor(staffPositions[i] / 7) - baseFloor;
    return noteToSampleKey(note, baseOctave + octaveStep);
  });
}

/**
 * The octave a note at `position` sits in, where staff position 0 is in the
 * `zeroOctave` octave. Chord playback uses this to pin a chord's base octave to
 * its root's staff height, so each voicing keeps its register.
 * @param {number} position - Staff position
 * @param {number} [zeroOctave=3] - Octave that staff position 0 belongs to
 * @returns {number} The octave
 */
export function staffPositionOctave(position, zeroOctave = 3) {
  return zeroOctave + Math.floor(position / 7);
}
