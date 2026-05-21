// Staff rendering using abcjs for proper music engraving.
// Converts staff positions directly to ABC notation — simple and correct.

import abcjs from 'abcjs';
import { SLICES } from '../circle/keys.js';

/**
 * Map a circle-of-fifths slice index to an ABC key signature string.
 */
function getAbcKey(sliceIndex, keyType) {
  const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  const minorKeys = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Ebm', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];
  return keyType === 'major' ? majorKeys[sliceIndex] : minorKeys[sliceIndex];
}

/**
 * The 7 note letters in ABC, indexed by staff position mod 7.
 * Staff position 0 = C (middle C), 1 = D, 2 = E, 3 = F, 4 = G, 5 = A, 6 = B
 * Staff position -2 = A (below middle C), -1 = B (below middle C)
 */
const STAFF_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/**
 * Convert a staff position to an ABC note letter with correct octave.
 * 
 * Staff positions (from scales.js):
 *   -2 = A below middle C (A,)
 *   -1 = B below middle C (B,)
 *    0 = middle C (C)
 *    1 = D (D)
 *    2 = E (E) — bottom staff line
 *    3 = F (F)
 *    4 = G (G)
 *    5 = A (A)
 *    6 = B (B)
 *    7 = C above (c)
 *    8 = D above (d)
 *   etc.
 * 
 * ABC octave rules:
 *   C, D, E, F, G, A, B, = C3 to B3 (comma = one octave below)
 *   C D E F G A B = C4 to B4 (default = middle C octave)
 *   c d e f g a b = C5 to B5 (lowercase = one octave above)
 */
function staffPositionToAbc(staffPos) {
  // Normalize to get letter index (0-6) and octave offset
  // Position 0 = C4, position 7 = C5, position -7 = C3
  let letterIdx = ((staffPos % 7) + 7) % 7;
  let octave = Math.floor(staffPos / 7); // 0 = C4 octave, -1 = C3 octave, 1 = C5 octave

  // Handle negative positions: -2 = A3, -1 = B3
  // staffPos -2: letterIdx = ((-2 % 7) + 7) % 7 = 5 (A), octave = floor(-2/7) = -1
  // staffPos -1: letterIdx = ((-1 % 7) + 7) % 7 = 6 (B), octave = floor(-1/7) = -1

  const letter = STAFF_LETTERS[letterIdx];

  if (octave === -1) {
    // Below middle C: uppercase with comma
    return letter + ',';
  } else if (octave === 0) {
    // Middle C octave: uppercase
    return letter;
  } else if (octave === 1) {
    // Above middle C: lowercase
    return letter.toLowerCase();
  } else if (octave >= 2) {
    // Two octaves above: lowercase with apostrophe
    return letter.toLowerCase() + "'".repeat(octave - 1);
  } else {
    // Two+ octaves below: uppercase with multiple commas
    return letter + ','.repeat(-octave);
  }
}

/**
 * Determine if a note needs an explicit accidental in ABC.
 * Notes that are altered from the key signature need ^ (sharp), _ (flat), or = (natural).
 * For harmonic/melodic minor, the raised 6th/7th degrees need explicit accidentals.
 */
function needsExplicitAccidental(scaleName, noteIndex) {
  if (scaleName === 'Harmonic Minor' && noteIndex === 6) return true;
  if (scaleName === 'Melodic Minor') {
    // Ascending: raised 6th (index 5) and 7th (index 6)
    if (noteIndex === 5 || noteIndex === 6) return true;
    // Descending: natural 6th and 7th need explicit naturals to cancel the raised versions
    // Index 8 = descending 7th degree (was raised in ascending), index 9 = descending 6th degree
    if (noteIndex === 8 || noteIndex === 9) return true;
  }
  return false;
}

/**
 * Parse a French note name to determine what ABC accidental prefix to use.
 * Returns '^' for sharp, '^^' for double sharp, '_' for flat, '__' for double flat, '' for natural.
 */
function getAbcAccidentalPrefix(frenchNote) {
  const note = frenchNote.split('/')[0];
  if (note.includes('𝄪')) return '^^';
  if (note.includes('##')) return '^^';
  if (note.includes('#') || note.includes('♯')) return '^';
  if (note.includes('♭♭')) return '__';
  if (note.includes('♭')) return '_';
  return '='; // natural (override key signature)
}

/**
 * Build an ABC string for a scale using staff positions directly.
 */
function buildScaleAbc(sliceIndex, keyType, scale, noteLabels) {
  const key = getAbcKey(sliceIndex, keyType);

  const abcNotes = scale.staffPositions.map((pos, i) => {
    const baseNote = staffPositionToAbc(pos);

    if (needsExplicitAccidental(scale.name, i)) {
      // Add explicit accidental from the note name
      const accPrefix = getAbcAccidentalPrefix(scale.notes[i]);
      return accPrefix + baseNote;
    }

    return baseNote;
  });

  const wLine = noteLabels ? `w: ${noteLabels.join(' ')}` : '';
  return `X:1\nM:none\nL:1/4\nK:${key}\n${abcNotes.join(' ')} |\n${wLine}\n`;
}

/**
 * Build an ABC string for diatonic chords using staff positions.
 * Chord I is always the lowest, ascending by thirds.
 */
function buildChordAbc(sliceIndex, keyType, chords, labels) {
  const key = getAbcKey(sliceIndex, keyType);

  // Map slice index directly to the tonic's diatonic staff position.
  // Staff positions: C=0, D=1, E=2, F=3, G=4, A=5(or -2), B=6(or -1)
  // For chords we want the tonic near middle C, so use positions relative to C=0.
  // Circle of fifths order for major: C G D A E B F#/Gb Db Ab Eb Bb F
  const majorTonicStaffPos = [0, 4, 1, 5, 2, 6, 3, 1, 5, 2, 6, 3];
  // Circle of fifths order for minor: Am Em Bm F#m C#m G#m Ebm Bbm Fm Cm Gm Dm
  const minorTonicStaffPos = [5, 2, 6, 3, 0, 4, 2, 6, 3, 0, 4, 1];

  // Normalize to keep chords in a readable range (near middle C)
  // We want the tonic between staff positions -2 and 4 (A below middle C to G above)
  let tonicStaffPos = keyType === 'major' ? majorTonicStaffPos[sliceIndex] : minorTonicStaffPos[sliceIndex];
  // Bring into range: if >= 5, subtract 7 to put it below middle C
  if (tonicStaffPos >= 5) tonicStaffPos -= 7;

  const abcChords = chords.map(chord => {
    const rootDegreeIdx = chord.degree - 1;
    const noteCount = chord.intervals.length; // 3 for triads, 4 for sevenths
    const notes = [];

    for (let i = 0; i < noteCount; i++) {
      // Each chord tone is 2 diatonic steps above the previous (stacked thirds)
      const staffPos = tonicStaffPos + rootDegreeIdx + (i * 2);
      notes.push(staffPositionToAbc(staffPos));
    }

    return `[${notes.join('')}]`;
  });

  // Two w: lines — roman numerals on first, chord names on second
  const romanLine = labels ? `w: ${labels.map(l => l.split('|')[0]).join(' ')}` : '';
  const nameLine = labels ? `w: ${labels.map(l => l.split('|')[1] || '').join(' ')}` : '';

  return `X:1\nM:none\nL:1/4\nK:${key}\n${abcChords.join(' ')} |\n${romanLine}\n${nameLine}\n`;
}

function getTonicChromaticFromSlice(sliceIndex, keyType) {
  const majorChromatic = (sliceIndex * 7) % 12;
  if (keyType === 'major') return majorChromatic;
  return (majorChromatic + 9) % 12;
}

/**
 * Render a chord staff into a container element using abcjs.
 */
export function renderChordStaff(container, { sliceIndex, keyType, chords, labels }) {
  const abcString = buildChordAbc(sliceIndex, keyType, chords, labels);

  const staffDiv = document.createElement('div');
  staffDiv.className = 'abcjs-staff';
  container.appendChild(staffDiv);

  abcjs.renderAbc(staffDiv, abcString, {
    staffwidth: 280,
    paddingtop: 0,
    paddingbottom: 0,
    paddingleft: 0,
    paddingright: 0,
    add_classes: true
  });
}

/**
 * Render a scale staff into a container element using abcjs.
 */
export function renderScaleStaff(container, { sliceIndex, keyType, scale, noteLabels }) {
  const abcString = buildScaleAbc(sliceIndex, keyType, scale, noteLabels);

  const titleDiv = document.createElement('div');
  titleDiv.className = 'scale-staff-title';
  titleDiv.textContent = `${scale.tonic} ${scale.name}`;
  container.appendChild(titleDiv);

  const staffDiv = document.createElement('div');
  staffDiv.className = 'abcjs-staff';
  container.appendChild(staffDiv);

  abcjs.renderAbc(staffDiv, abcString, {
    staffwidth: 280,
    paddingtop: 0,
    paddingbottom: 0,
    paddingleft: 0,
    paddingright: 0,
    add_classes: true
  });
}

/**
 * Get a single French note name (no alternatives) with proper accidental.
 */
export function getSingleNoteName(frenchNote) {
  return frenchNote.split('/')[0];
}

/**
 * Format chord quality as a compact symbol for display.
 */
export function formatChordQuality(quality) {
  switch (quality) {
    case 'major': return '';
    case 'minor': return 'm';
    case 'diminished': return '°';
    case 'augmented': return '+';
    case 'maj7': return 'Δ7';
    case 'min7': return 'm7';
    case 'dom7': return '7';
    case 'half-dim7': return 'ø7';
    default: return '';
  }
}
