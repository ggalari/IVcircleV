import { describe, it, expect } from 'vitest';
import {
  SOLFEGE_TO_PITCH,
  frenchNoteToMidi,
  frenchNoteToSampleKey,
  mapScaleToSampleKeys,
  mapChordToSampleKeys
} from '../audio/pitch-mapper.js';

describe('pitch-mapper', () => {
  describe('SOLFEGE_TO_PITCH', () => {
    it('maps all 7 solfège names to correct chromatic pitches', () => {
      expect(SOLFEGE_TO_PITCH).toEqual({
        DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11
      });
    });
  });

  describe('frenchNoteToMidi', () => {
    it('converts DO at octave 4 to MIDI 60', () => {
      expect(frenchNoteToMidi('DO', 4)).toBe(60);
    });

    it('converts DO# at octave 4 to MIDI 61', () => {
      expect(frenchNoteToMidi('DO#', 4)).toBe(61);
    });

    it('converts RE at octave 4 to MIDI 62', () => {
      expect(frenchNoteToMidi('RE', 4)).toBe(62);
    });

    it('converts SI at octave 4 to MIDI 71', () => {
      expect(frenchNoteToMidi('SI', 4)).toBe(71);
    });

    it('converts SI♭ at octave 4 to MIDI 70', () => {
      expect(frenchNoteToMidi('SI♭', 4)).toBe(70);
    });

    it('converts SOL at octave 3 to MIDI 55', () => {
      expect(frenchNoteToMidi('SOL', 3)).toBe(55);
    });

    it('handles double sharp (𝄪)', () => {
      expect(frenchNoteToMidi('RE𝄪', 4)).toBe(64); // D + 2 = E = MIDI 64
    });

    it('handles double flat (♭♭)', () => {
      expect(frenchNoteToMidi('MI♭♭', 4)).toBe(62); // E(4) - 2 semitones = D = MIDI 62
    });

    it('defaults to octave 4', () => {
      expect(frenchNoteToMidi('DO')).toBe(60);
    });
  });

  describe('frenchNoteToSampleKey', () => {
    it('converts DO at octave 4 to C4', () => {
      expect(frenchNoteToSampleKey('DO', 4)).toBe('C4');
    });

    it('converts FA# at octave 4 to F#4', () => {
      expect(frenchNoteToSampleKey('FA#', 4)).toBe('F#4');
    });

    it('converts SI♭ at octave 3 to Bb3', () => {
      expect(frenchNoteToSampleKey('SI♭', 3)).toBe('Bb3');
    });

    it('converts SOL at octave 5 to G5', () => {
      expect(frenchNoteToSampleKey('SOL', 5)).toBe('G5');
    });

    it('converts RE𝄪 at octave 4 to D##4', () => {
      expect(frenchNoteToSampleKey('RE𝄪', 4)).toBe('D##4');
    });

    it('converts LA♭♭ at octave 4 to Abb4', () => {
      expect(frenchNoteToSampleKey('LA♭♭', 4)).toBe('Abb4');
    });

    it('defaults to octave 4', () => {
      expect(frenchNoteToSampleKey('MI')).toBe('E4');
    });
  });

  describe('mapScaleToSampleKeys', () => {
    it('maps C major scale with octave wrapping', () => {
      const cMajor = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI', 'DO'];
      const result = mapScaleToSampleKeys(cMajor, 4);
      expect(result).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
    });

    it('maps G major scale starting at octave 4', () => {
      // SOL LA SI DO RE MI FA# SOL
      const gMajor = ['SOL', 'LA', 'SI', 'DO', 'RE', 'MI', 'FA#', 'SOL'];
      const result = mapScaleToSampleKeys(gMajor, 4);
      expect(result).toEqual(['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5']);
    });

    it('maps F major scale starting at octave 4', () => {
      // FA SOL LA SI♭ DO RE MI FA
      const fMajor = ['FA', 'SOL', 'LA', 'SI♭', 'DO', 'RE', 'MI', 'FA'];
      const result = mapScaleToSampleKeys(fMajor, 4);
      expect(result).toEqual(['F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5', 'F5']);
    });

    it('handles empty array', () => {
      expect(mapScaleToSampleKeys([], 4)).toEqual([]);
    });

    it('handles single note', () => {
      expect(mapScaleToSampleKeys(['DO'], 4)).toEqual(['C4']);
    });

    it('handles melodic minor (ascending then descending)', () => {
      // A melodic minor ascending: LA SI DO RE MI FA# SOL# LA
      // Then descending natural: SOL FA MI RE DO SI LA
      const melodicMinor = ['LA', 'SI', 'DO', 'RE', 'MI', 'FA#', 'SOL#', 'LA', 'SOL', 'FA', 'MI', 'RE', 'DO', 'SI'];
      const result = mapScaleToSampleKeys(melodicMinor, 4);
      expect(result).toEqual([
        'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G#5', 'A5',
        'G5', 'F5', 'E5', 'D5', 'C5', 'B4'
      ]);
    });
  });

  describe('mapChordToSampleKeys', () => {
    it('maps C major triad (DO, [0,4,7]) to C4, E4, G4', () => {
      const result = mapChordToSampleKeys('DO', [0, 4, 7], 4);
      expect(result).toEqual(['C4', 'E4', 'G4']);
    });

    it('maps F major triad (FA, [0,4,7]) to F4, A4, C5', () => {
      const result = mapChordToSampleKeys('FA', [0, 4, 7], 4);
      // FA=5, +4=9(A), +7=12(C next octave)
      expect(result).toEqual(['F4', 'A4', 'C5']);
    });

    it('maps A minor triad (LA, [0,3,7]) to A4, C5, E5', () => {
      const result = mapChordToSampleKeys('LA', [0, 3, 7], 4);
      // LA=9, +3=12→0(C5), +7=16→4(E5)
      expect(result).toEqual(['A4', 'C5', 'E5']);
    });

    it('maps C major seventh (DO, [0,4,7,11]) to C4, E4, G4, B4', () => {
      const result = mapChordToSampleKeys('DO', [0, 4, 7, 11], 4);
      expect(result).toEqual(['C4', 'E4', 'G4', 'B4']);
    });

    it('maps B diminished triad (SI, [0,3,6]) to B4, D5, F5', () => {
      const result = mapChordToSampleKeys('SI', [0, 3, 6], 4);
      // SI=11, +3=14→2(D5), +6=17→5(F5)
      expect(result).toEqual(['B4', 'D5', 'F5']);
    });

    it('handles sharp root: FA# minor triad', () => {
      const result = mapChordToSampleKeys('FA#', [0, 3, 7], 4);
      // FA#=6, +3=9(A4), +7=13→1(Db5)
      expect(result).toEqual(['F#4', 'A4', 'Db5']);
    });

    it('handles empty intervals', () => {
      expect(mapChordToSampleKeys('DO', [], 4)).toEqual([]);
    });

    it('defaults to octave 4', () => {
      const result = mapChordToSampleKeys('DO', [0, 4, 7]);
      expect(result).toEqual(['C4', 'E4', 'G4']);
    });
  });
});
