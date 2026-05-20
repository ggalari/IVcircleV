import { describe, it, expect } from 'vitest';
import {
  MAJOR_TRIAD_QUALITIES,
  MINOR_TRIAD_QUALITIES,
  MAJOR_SEVENTH_QUALITIES,
  MINOR_SEVENTH_QUALITIES,
  getDiatonicTriads,
  getDiatonicSevenths
} from '../theory/chords.js';

describe('chords.js - quality arrays', () => {
  it('MAJOR_TRIAD_QUALITIES has 7 entries', () => {
    expect(MAJOR_TRIAD_QUALITIES).toHaveLength(7);
  });

  it('MINOR_TRIAD_QUALITIES has 7 entries', () => {
    expect(MINOR_TRIAD_QUALITIES).toHaveLength(7);
  });

  it('MAJOR_SEVENTH_QUALITIES has 7 entries', () => {
    expect(MAJOR_SEVENTH_QUALITIES).toHaveLength(7);
  });

  it('MINOR_SEVENTH_QUALITIES has 7 entries', () => {
    expect(MINOR_SEVENTH_QUALITIES).toHaveLength(7);
  });

  it('MAJOR_TRIAD_QUALITIES matches expected pattern', () => {
    expect(MAJOR_TRIAD_QUALITIES).toEqual(
      ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished']
    );
  });

  it('MINOR_TRIAD_QUALITIES matches expected pattern', () => {
    expect(MINOR_TRIAD_QUALITIES).toEqual(
      ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major']
    );
  });

  it('MAJOR_SEVENTH_QUALITIES matches expected pattern', () => {
    expect(MAJOR_SEVENTH_QUALITIES).toEqual(
      ['maj7', 'min7', 'min7', 'maj7', 'dom7', 'min7', 'half-dim7']
    );
  });

  it('MINOR_SEVENTH_QUALITIES matches expected pattern', () => {
    expect(MINOR_SEVENTH_QUALITIES).toEqual(
      ['min7', 'half-dim7', 'maj7', 'min7', 'min7', 'maj7', 'dom7']
    );
  });
});

describe('getDiatonicTriads', () => {
  it('returns 7 triads for C major (keyIndex 0)', () => {
    const triads = getDiatonicTriads(0, 'major');
    expect(triads).toHaveLength(7);
  });

  it('each triad has required properties', () => {
    const triads = getDiatonicTriads(0, 'major');
    triads.forEach(chord => {
      expect(chord).toHaveProperty('degree');
      expect(chord).toHaveProperty('roman');
      expect(chord).toHaveProperty('root');
      expect(chord).toHaveProperty('quality');
      expect(chord).toHaveProperty('intervals');
      expect(chord).toHaveProperty('staffPositions');
    });
  });

  it('degrees are 1 through 7', () => {
    const triads = getDiatonicTriads(0, 'major');
    expect(triads.map(t => t.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('C major triads have correct roman numerals', () => {
    const triads = getDiatonicTriads(0, 'major');
    expect(triads.map(t => t.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  });

  it('C major triads have correct qualities', () => {
    const triads = getDiatonicTriads(0, 'major');
    expect(triads.map(t => t.quality)).toEqual(MAJOR_TRIAD_QUALITIES);
  });

  it('C major triad roots are correct note names', () => {
    const triads = getDiatonicTriads(0, 'major');
    // C major scale: DO, RE, MI, FA, SOL, LA, SI
    // Major chords (I, IV, V) use major names: DO, FA, SOL
    // Minor chords (ii, iii, vi) use minor names: ré, mi, la  (from SLICES minor field)
    // Diminished (vii°) uses minor name: si
    expect(triads[0].root).toBe('DO');   // I - major
    expect(triads[3].root).toBe('FA');   // IV - major
    expect(triads[4].root).toBe('SOL');  // V - major
  });

  it('triad intervals match quality', () => {
    const triads = getDiatonicTriads(0, 'major');
    expect(triads[0].intervals).toEqual([0, 4, 7]);  // major
    expect(triads[1].intervals).toEqual([0, 3, 7]);  // minor
    expect(triads[6].intervals).toEqual([0, 3, 6]);  // diminished
  });

  it('staffPositions has 3 entries for each triad', () => {
    const triads = getDiatonicTriads(0, 'major');
    triads.forEach(chord => {
      expect(chord.staffPositions).toHaveLength(3);
    });
  });

  it('returns 7 triads for A minor (keyIndex 0)', () => {
    const triads = getDiatonicTriads(0, 'minor');
    expect(triads).toHaveLength(7);
  });

  it('A minor triads have correct roman numerals', () => {
    const triads = getDiatonicTriads(0, 'minor');
    expect(triads.map(t => t.roman)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  });

  it('A minor triads have correct qualities', () => {
    const triads = getDiatonicTriads(0, 'minor');
    expect(triads.map(t => t.quality)).toEqual(MINOR_TRIAD_QUALITIES);
  });

  it('works for all 12 key indices', () => {
    for (let i = 0; i < 12; i++) {
      const majorTriads = getDiatonicTriads(i, 'major');
      const minorTriads = getDiatonicTriads(i, 'minor');
      expect(majorTriads).toHaveLength(7);
      expect(minorTriads).toHaveLength(7);
    }
  });
});

describe('getDiatonicSevenths', () => {
  it('returns 7 seventh chords for C major (keyIndex 0)', () => {
    const sevenths = getDiatonicSevenths(0, 'major');
    expect(sevenths).toHaveLength(7);
  });

  it('each seventh chord has required properties', () => {
    const sevenths = getDiatonicSevenths(0, 'major');
    sevenths.forEach(chord => {
      expect(chord).toHaveProperty('degree');
      expect(chord).toHaveProperty('roman');
      expect(chord).toHaveProperty('root');
      expect(chord).toHaveProperty('quality');
      expect(chord).toHaveProperty('intervals');
      expect(chord).toHaveProperty('staffPositions');
    });
  });

  it('C major seventh chords have correct qualities', () => {
    const sevenths = getDiatonicSevenths(0, 'major');
    expect(sevenths.map(s => s.quality)).toEqual(MAJOR_SEVENTH_QUALITIES);
  });

  it('seventh chord intervals have 4 notes', () => {
    const sevenths = getDiatonicSevenths(0, 'major');
    sevenths.forEach(chord => {
      expect(chord.intervals).toHaveLength(4);
      expect(chord.intervals[0]).toBe(0); // root is always 0
    });
  });

  it('staffPositions has 4 entries for each seventh chord', () => {
    const sevenths = getDiatonicSevenths(0, 'major');
    sevenths.forEach(chord => {
      expect(chord.staffPositions).toHaveLength(4);
    });
  });

  it('A minor seventh chords have correct qualities', () => {
    const sevenths = getDiatonicSevenths(0, 'minor');
    expect(sevenths.map(s => s.quality)).toEqual(MINOR_SEVENTH_QUALITIES);
  });

  it('seventh chord roman numerals match triad roman numerals', () => {
    const triads = getDiatonicTriads(0, 'major');
    const sevenths = getDiatonicSevenths(0, 'major');
    expect(sevenths.map(s => s.roman)).toEqual(triads.map(t => t.roman));
  });

  it('seventh chord roots match triad roots', () => {
    const triads = getDiatonicTriads(0, 'major');
    const sevenths = getDiatonicSevenths(0, 'major');
    expect(sevenths.map(s => s.root)).toEqual(triads.map(t => t.root));
  });

  it('works for all 12 key indices', () => {
    for (let i = 0; i < 12; i++) {
      const majorSevenths = getDiatonicSevenths(i, 'major');
      const minorSevenths = getDiatonicSevenths(i, 'minor');
      expect(majorSevenths).toHaveLength(7);
      expect(minorSevenths).toHaveLength(7);
    }
  });
});
