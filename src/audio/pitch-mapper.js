// Pitch mapper module: converts French solfège note names to chromatic pitches and sample keys.
// Pure functions — no side effects or DOM dependencies.

/**
 * Mapping of French solfège base names to chromatic pitch (semitones from C).
 */
export const SOLFEGE_TO_PITCH = {
  DO: 0,
  RE: 2,
  MI: 4,
  FA: 5,
  SOL: 7,
  LA: 9,
  SI: 11
};

/**
 * Mapping of French solfège base names to English note letters.
 */
const SOLFEGE_TO_ENGLISH = {
  DO: 'C',
  RE: 'D',
  MI: 'E',
  FA: 'F',
  SOL: 'G',
  LA: 'A',
  SI: 'B'
};

/**
 * Parse a French solfège note name into its base name and accidental offset.
 * Handles: # (+1), ♭ (-1), 𝄪 (+2), ♭♭ (-2)
 * @param {string} noteName - e.g., "DO", "FA#", "SI♭", "RE𝄪", "MI♭♭"
 * @returns {{ base: string, accidentalOffset: number, accidentalStr: string }}
 */
function parseNoteName(noteName) {
  let base = '';
  let remainder = '';

  // Try matching each solfège base (longest first: SOL before SI/SO)
  const bases = ['SOL', 'DO', 'RE', 'MI', 'FA', 'LA', 'SI'];
  for (const b of bases) {
    if (noteName.startsWith(b)) {
      base = b;
      remainder = noteName.slice(b.length);
      break;
    }
  }

  if (!base) {
    throw new Error(`Unknown solfège note: "${noteName}"`);
  }

  let accidentalOffset = 0;
  let accidentalStr = '';

  if (remainder === '𝄪') {
    accidentalOffset = 2;
    accidentalStr = '##';
  } else if (remainder === '♭♭') {
    accidentalOffset = -2;
    accidentalStr = 'bb';
  } else if (remainder === '#') {
    accidentalOffset = 1;
    accidentalStr = '#';
  } else if (remainder === '♭') {
    accidentalOffset = -1;
    accidentalStr = 'b';
  }

  return { base, accidentalOffset, accidentalStr };
}

/**
 * Convert a French solfège note name to a MIDI number.
 * MIDI: C4 = 60, each semitone = +1.
 * @param {string} noteName - e.g., "DO", "FA#", "SI♭"
 * @param {number} [startOctave=4] - The octave to assign
 * @returns {number} MIDI number
 */
export function frenchNoteToMidi(noteName, startOctave = 4) {
  const { base, accidentalOffset } = parseNoteName(noteName);
  const basePitch = SOLFEGE_TO_PITCH[base];
  const chromaticPitch = basePitch + accidentalOffset;
  // MIDI: C4 = 60, so octave N starts at (N + 1) * 12
  return (startOctave + 1) * 12 + chromaticPitch;
}

/**
 * Convert a French solfège note name to an English scientific pitch notation sample key.
 * e.g., "FA#" at octave 4 → "F#4", "SI♭" at octave 3 → "Bb3"
 * @param {string} noteName - e.g., "DO", "FA#", "SI♭"
 * @param {number} [startOctave=4] - The octave to assign
 * @returns {string} English scientific pitch string (e.g., "C4", "F#4", "Bb3")
 */
export function frenchNoteToSampleKey(noteName, startOctave = 4) {
  const { base, accidentalStr } = parseNoteName(noteName);
  const englishLetter = SOLFEGE_TO_ENGLISH[base];
  return `${englishLetter}${accidentalStr}${startOctave}`;
}

/**
 * Map a full ScaleResult notes array to sample keys with octave wrapping.
 * Octave increments when the chromatic pitch wraps past B (SI, pitch 11 → next is lower).
 * For descending portions (melodic minor), octave decrements when pitch wraps downward.
 * @param {string[]} scaleNotes - Array of French solfège note names (e.g., ["DO", "RE", ..., "DO"])
 * @param {number} [tonicOctave=4] - Starting octave for the tonic
 * @returns {string[]} Array of English scientific pitch sample keys
 */
export function mapScaleToSampleKeys(scaleNotes, tonicOctave = 4) {
  if (!scaleNotes || scaleNotes.length === 0) return [];

  const result = [];
  let currentOctave = tonicOctave;

  // Get the chromatic pitch of the first note
  const firstParsed = parseNoteName(scaleNotes[0]);
  let prevPitch = ((SOLFEGE_TO_PITCH[firstParsed.base] + firstParsed.accidentalOffset) % 12 + 12) % 12;

  result.push(frenchNoteToSampleKey(scaleNotes[0], currentOctave));

  for (let i = 1; i < scaleNotes.length; i++) {
    const parsed = parseNoteName(scaleNotes[i]);
    const currPitch = ((SOLFEGE_TO_PITCH[parsed.base] + parsed.accidentalOffset) % 12 + 12) % 12;

    // Calculate the ascending and descending intervals between previous and current
    const upInterval = (currPitch - prevPitch + 12) % 12;
    const downInterval = (prevPitch - currPitch + 12) % 12;

    if (upInterval === 0) {
      // Same pitch class — assume ascending (octave up) since scales repeat the tonic
      currentOctave++;
    } else if (upInterval <= 6) {
      // Small ascending interval — no octave issue unless it wrapped
      // If currPitch < prevPitch numerically, that means we crossed B→C boundary
      if (currPitch < prevPitch) {
        currentOctave++;
      }
    } else {
      // Large ascending interval (>6) means it's actually a small descending interval
      // If currPitch > prevPitch numerically, that means we crossed C→B boundary going down
      if (currPitch > prevPitch) {
        currentOctave--;
      }
    }

    result.push(frenchNoteToSampleKey(scaleNotes[i], currentOctave));
    prevPitch = currPitch;
  }

  return result;
}

/**
 * Map a chord's root note + intervals to sample keys.
 * Each interval offset is added chromatically to the root; octave increments when wrapping past B.
 * @param {string} rootNoteName - French solfège root name (e.g., "DO", "FA#")
 * @param {number[]} intervals - Array of semitone offsets from root (e.g., [0, 4, 7])
 * @param {number} [rootOctave=4] - Octave for the root note
 * @returns {string[]} Array of English scientific pitch sample keys
 */
export function mapChordToSampleKeys(rootNoteName, intervals, rootOctave = 4) {
  if (!intervals || intervals.length === 0) return [];

  const { base, accidentalOffset } = parseNoteName(rootNoteName);
  const rootPitch = SOLFEGE_TO_PITCH[base] + accidentalOffset;

  return intervals.map(interval => {
    const absolutePitch = rootPitch + interval;
    // Calculate octave offset: how many times we've crossed 12 semitones above the root
    const octaveOffset = Math.floor(absolutePitch / 12) - Math.floor(rootPitch / 12);
    const normalizedPitch = ((absolutePitch % 12) + 12) % 12;

    // Find the English note name for this pitch
    const noteOctave = rootOctave + octaveOffset;
    const englishName = chromaticToEnglishName(normalizedPitch, rootNoteName, interval);
    return `${englishName}${noteOctave}`;
  });
}

/**
 * Convert a chromatic pitch to an English note name, preferring sharps/flats
 * consistent with the musical context.
 * @param {number} pitch - Chromatic pitch 0-11
 * @param {string} rootNoteName - The root note (for context)
 * @param {number} interval - The interval from root (for context)
 * @returns {string} English note name (e.g., "C", "F#", "Bb")
 */
function chromaticToEnglishName(pitch, rootNoteName, interval) {
  // Map chromatic pitches to English names (prefer sharps for simple cases)
  const CHROMATIC_TO_ENGLISH = [
    'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'
  ];

  // For the root note (interval 0), use the direct solfège-to-English mapping
  if (interval === 0) {
    const { base, accidentalStr } = parseNoteName(rootNoteName);
    return `${SOLFEGE_TO_ENGLISH[base]}${accidentalStr}`;
  }

  return CHROMATIC_TO_ENGLISH[pitch];
}
