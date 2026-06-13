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
 * Map a full ScaleResult notes array to sample keys using staff positions for octave assignment.
 * Staff positions encode the absolute pitch direction: ascending positions mean ascending pitch.
 * This avoids heuristic octave guessing by using the definitive staff data.
 * @param {string[]} scaleNotes - Array of French solfège note names (e.g., ["DO", "RE", ..., "DO"])
 * @param {number} [tonicOctave=4] - Starting octave for the tonic
 * @param {number[]} [staffPositions] - Staff positions for each note (from ScaleResult)
 * @returns {string[]} Array of English scientific pitch sample keys
 */
export function mapScaleToSampleKeys(scaleNotes, tonicOctave = 4, staffPositions) {
  if (!scaleNotes || scaleNotes.length === 0) return [];

  // If staff positions are provided, use them for definitive octave assignment
  if (staffPositions && staffPositions.length === scaleNotes.length) {
    return mapScaleUsingStaffPositions(scaleNotes, tonicOctave, staffPositions);
  }

  // Fallback: use chromatic pitch tracking (for cases without staff positions)
  return mapScaleUsingPitchTracking(scaleNotes, tonicOctave);
}

/**
 * Map scale notes using staff positions for definitive pitch assignment.
 * Staff position directly encodes the note's octave:
 *   position 0 = C4, 1 = D4, ..., 6 = B4, 7 = C5, etc.
 *   position -1 = B3, -2 = A3, -7 = C3, etc.
 * We combine the note name (for accidentals) with the octave from staff position.
 */
function mapScaleUsingStaffPositions(scaleNotes, tonicOctave, staffPositions) {
  const result = [];
  const baseOctaveOffset = Math.floor(staffPositions[0] / 7);

  for (let i = 0; i < scaleNotes.length; i++) {
    const noteOctaveOffset = Math.floor(staffPositions[i] / 7);
    const octave = tonicOctave + (noteOctaveOffset - baseOctaveOffset);
    result.push(frenchNoteToSampleKey(scaleNotes[i], octave));
  }

  return result;
}

/**
 * Fallback: map scale notes using chromatic pitch tracking.
 * Used when staff positions are not available.
 */
function mapScaleUsingPitchTracking(scaleNotes, tonicOctave) {
  const result = [];
  let currentOctave = tonicOctave;

  const firstParsed = parseNoteName(scaleNotes[0]);
  let prevPitch = ((SOLFEGE_TO_PITCH[firstParsed.base] + firstParsed.accidentalOffset) % 12 + 12) % 12;

  result.push(frenchNoteToSampleKey(scaleNotes[0], currentOctave));

  // Compute all pitches
  const pitches = [prevPitch];
  for (let i = 1; i < scaleNotes.length; i++) {
    const parsed = parseNoteName(scaleNotes[i]);
    pitches.push(((SOLFEGE_TO_PITCH[parsed.base] + parsed.accidentalOffset) % 12 + 12) % 12);
  }

  let ascending = true;

  for (let i = 1; i < scaleNotes.length; i++) {
    const currPitch = pitches[i];

    if (ascending) {
      if (currPitch <= prevPitch) {
        const rawUp = (currPitch - prevPitch + 12) % 12;
        if (rawUp <= 4) {
          currentOctave++;
        } else {
          ascending = false;
          if (currPitch > prevPitch) {
            currentOctave--;
          }
        }
      }
    } else {
      if (currPitch >= prevPitch) {
        currentOctave--;
      }
    }

    result.push(frenchNoteToSampleKey(scaleNotes[i], currentOctave));
    prevPitch = currPitch;
  }

  return result;
}

/**
 * Map chord notes to sample keys using staff positions as the source of truth for pitch.
 * This mirrors how scales use staff positions: the position directly encodes octave.
 * The note names come from the key signature (handled by the sample library's key-aware lookup),
 * while the octave is derived from the staff position.
 *
 * @param {string[]} noteNames - French solfège note names for each chord tone
 * @param {number[]} staffPositions - Staff positions for each chord tone (from getChordStaffPositions)
 * @param {number} [baseOctave=3] - Octave assigned to staff position 0 (middle C region)
 * @returns {string[]} Array of English scientific pitch sample keys
 */
export function mapChordToSampleKeysFromStaff(noteNames, staffPositions, baseOctave = 3) {
  if (!noteNames || noteNames.length === 0) return [];

  const result = [];
  // Staff position 0 = C at baseOctave. Each +7 positions = +1 octave.
  // The first note's staff position establishes the reference: its octave = baseOctave + floor(pos/7)
  for (let i = 0; i < noteNames.length; i++) {
    const octaveOffset = Math.floor(staffPositions[i] / 7);
    const octave = baseOctave + octaveOffset;
    result.push(frenchNoteToSampleKey(noteNames[i], octave));
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
 * Map an ascending chord sequence to sample keys with correct octave progression.
 * Each chord's root is assigned an octave such that the roots always ascend.
 * When a root's pitch class is lower than or equal to the previous root's,
 * the octave increments (same logic as mapScaleToSampleKeys for single notes).
 * @param {Array<{ root: string, intervals: number[] }>} chords - Array of chord objects
 * @param {number} [startOctave=4] - Starting octave for the first chord's root
 * @returns {string[][]} Array of sample key arrays, one per chord
 */
export function mapChordSequenceToSampleKeys(chords, startOctave = 4) {
  if (!chords || chords.length === 0) return [];

  const result = [];
  let currentOctave = startOctave;

  // Get the chromatic pitch of the first root
  const firstParsed = parseNoteName(chords[0].root);
  let prevPitch = ((SOLFEGE_TO_PITCH[firstParsed.base] + firstParsed.accidentalOffset) % 12 + 12) % 12;

  result.push(mapChordToSampleKeys(chords[0].root, chords[0].intervals, currentOctave));

  for (let i = 1; i < chords.length; i++) {
    const parsed = parseNoteName(chords[i].root);
    const currPitch = ((SOLFEGE_TO_PITCH[parsed.base] + parsed.accidentalOffset) % 12 + 12) % 12;

    // Ascending sequence: if pitch class doesn't go up, we've wrapped past B→C
    if (currPitch <= prevPitch) {
      currentOctave++;
    }

    result.push(mapChordToSampleKeys(chords[i].root, chords[i].intervals, currentOctave));
    prevPitch = currPitch;
  }

  return result;
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
