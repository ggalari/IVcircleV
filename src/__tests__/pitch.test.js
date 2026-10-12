// theory/pitch.js — spelled pitch -> canonical sample key, and the shared
// notes+staff-positions mapping used by both scale and chord playback.
//
// Expected values are independent music-theory facts, not recomputed from the
// implementation.
import { describe, it, expect } from 'vitest';
import {
  noteToSampleKey,
  notesToSampleKeys,
  staffPositionOctave,
  parseNote,
  spellNote,
  cumulativeSemitones,
  degreeLabels,
  staffLetterPosition,
} from '../theory/pitch.js';

describe('parseNote', () => {
  it('parses a natural note', () => {
    expect(parseNote('DO')).toEqual({ base: 'DO', letter: 'C', accidentalOffset: 0, accidental: '' });
  });

  it('parses a sharp', () => {
    expect(parseNote('FA#')).toEqual({ base: 'FA', letter: 'F', accidentalOffset: 1, accidental: '#' });
  });

  it('parses a flat', () => {
    expect(parseNote('SI♭')).toEqual({ base: 'SI', letter: 'B', accidentalOffset: -1, accidental: 'b' });
  });

  it('parses a double sharp', () => {
    expect(parseNote('RE𝄪')).toEqual({ base: 'RE', letter: 'D', accidentalOffset: 2, accidental: '##' });
  });

  it('parses a double flat', () => {
    expect(parseNote('LA♭♭')).toEqual({ base: 'LA', letter: 'A', accidentalOffset: -2, accidental: 'bb' });
  });

  it('throws on an unknown note', () => {
    expect(() => parseNote('XX')).toThrow();
  });

  it('normalises lowercase and accents (key names)', () => {
    expect(parseNote('ré')).toEqual({ base: 'RE', letter: 'D', accidentalOffset: 0, accidental: '' });
  });

  it('takes the primary spelling of an enharmonic key name', () => {
    expect(parseNote('SOL♭/FA#')).toEqual({ base: 'SOL', letter: 'G', accidentalOffset: -1, accidental: 'b' });
  });
});

describe('noteToSampleKey', () => {
  it('maps a natural solfège note to its sample key', () => {
    expect(noteToSampleKey('DO', 4)).toBe('C4');
    expect(noteToSampleKey('SOL', 5)).toBe('G5');
  });

  it('preserves sharps and flats as spelled', () => {
    expect(noteToSampleKey('FA#', 4)).toBe('F#4');
    expect(noteToSampleKey('SI♭', 3)).toBe('Bb3');
  });

  it('preserves double accidentals as spelled', () => {
    expect(noteToSampleKey('RE𝄪', 4)).toBe('D##4');
    expect(noteToSampleKey('LA♭♭', 4)).toBe('Abb4');
  });
});

describe('notesToSampleKeys', () => {
  it('pins the first note to the base octave and steps the rest by staff position', () => {
    const notes = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI', 'DO'];
    const positions = [0, 1, 2, 3, 4, 5, 6, 7];
    expect(notesToSampleKeys(notes, positions, 3)).toEqual([
      'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4',
    ]);
  });

  it('keeps a tonic below middle C in the base octave (A natural minor)', () => {
    const notes = ['LA', 'SI', 'DO', 'RE', 'MI', 'FA', 'SOL', 'LA'];
    const positions = [-2, -1, 0, 1, 2, 3, 4, 5];
    expect(notesToSampleKeys(notes, positions, 3)).toEqual([
      'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4',
    ]);
  });

  it('maps a chord stacked in thirds on the same rule', () => {
    expect(notesToSampleKeys(['DO', 'MI', 'SOL'], [0, 2, 4], 3)).toEqual([
      'C3', 'E3', 'G3',
    ]);
  });

  it('returns an empty array for no notes', () => {
    expect(notesToSampleKeys([], [], 3)).toEqual([]);
  });
});

describe('staffPositionOctave', () => {
  it('maps staff position 0 to the zero octave and steps one octave per 7 positions', () => {
    expect(staffPositionOctave(0)).toBe(3);
    expect(staffPositionOctave(6)).toBe(3);
    expect(staffPositionOctave(7)).toBe(4);
    expect(staffPositionOctave(-2)).toBe(2);
  });

  it('honours a custom zero octave', () => {
    expect(staffPositionOctave(7, 2)).toBe(3);
  });
});

describe('spellNote', () => {
  it('spells a natural note', () => {
    expect(spellNote(0, 0)).toBe('DO');
  });

  it('spells a sharp', () => {
    expect(spellNote(3, 6)).toBe('FA#');
  });

  it('spells a flat', () => {
    expect(spellNote(6, 10)).toBe('SI♭');
  });

  it('spells a double sharp', () => {
    expect(spellNote(1, 4)).toBe('RE𝄪');
  });

  it('spells a double flat', () => {
    expect(spellNote(5, 7)).toBe('LA♭♭');
  });
});

describe('cumulativeSemitones', () => {
  it('derives the major scale semitone offsets from its step intervals', () => {
    expect(cumulativeSemitones([2, 2, 1, 2, 2, 2, 1])).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('derives the natural minor semitone offsets', () => {
    expect(cumulativeSemitones([2, 1, 2, 2, 1, 2, 2])).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });
});

describe('degreeLabels', () => {
  it('labels major key degrees', () => {
    expect(degreeLabels('major')).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  });

  it('labels minor key degrees', () => {
    expect(degreeLabels('minor')).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  });
});

describe('staffLetterPosition', () => {
  it('maps each letter to its staff position', () => {
    expect(staffLetterPosition('DO')).toBe(0);
    expect(staffLetterPosition('SOL')).toBe(4);
    expect(staffLetterPosition('LA')).toBe(-2);
    expect(staffLetterPosition('SI')).toBe(-1);
  });
});
