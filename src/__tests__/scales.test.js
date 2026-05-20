import { describe, it, expect } from 'vitest';
import { SCALE_INTERVALS, getScale, getAllScales } from '../theory/scales.js';

describe('SCALE_INTERVALS', () => {
  it('has all four scale types', () => {
    expect(Object.keys(SCALE_INTERVALS)).toEqual([
      'major', 'naturalMinor', 'harmonicMinor', 'melodicMinor'
    ]);
  });

  it('each interval array has 7 elements summing to 12', () => {
    for (const [type, intervals] of Object.entries(SCALE_INTERVALS)) {
      expect(intervals).toHaveLength(7);
      expect(intervals.reduce((a, b) => a + b, 0)).toBe(12);
    }
  });

  it('major intervals are [2,2,1,2,2,2,1]', () => {
    expect(SCALE_INTERVALS.major).toEqual([2, 2, 1, 2, 2, 2, 1]);
  });

  it('naturalMinor intervals are [2,1,2,2,1,2,2]', () => {
    expect(SCALE_INTERVALS.naturalMinor).toEqual([2, 1, 2, 2, 1, 2, 2]);
  });

  it('harmonicMinor intervals are [2,1,2,2,1,3,1]', () => {
    expect(SCALE_INTERVALS.harmonicMinor).toEqual([2, 1, 2, 2, 1, 3, 1]);
  });

  it('melodicMinor intervals are [2,1,2,2,2,2,1]', () => {
    expect(SCALE_INTERVALS.melodicMinor).toEqual([2, 1, 2, 2, 2, 2, 1]);
  });
});

describe('getScale', () => {
  it('returns C major scale for keyIndex 0, major', () => {
    const result = getScale(0, 'major', 'major');
    expect(result.name).toBe('Major');
    expect(result.tonic).toBe('DO');
    expect(result.notes).toHaveLength(8);
    expect(result.notes[0]).toBe('DO');
    expect(result.notes[7]).toBe('DO'); // octave
    expect(result.intervals).toEqual([2, 2, 1, 2, 2, 2, 1]);
    expect(result.staffPositions).toHaveLength(8);
  });

  it('C major scale has correct note sequence', () => {
    const result = getScale(0, 'major', 'major');
    // C D E F G A B C
    expect(result.notes).toEqual([
      'DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI', 'DO'
    ]);
  });

  it('returns A natural minor scale for keyIndex 0, minor', () => {
    // SLICES[0] minor = 'la', relative minor of C major
    const result = getScale(0, 'minor', 'naturalMinor');
    expect(result.name).toBe('Natural Minor');
    expect(result.tonic).toBe('la');
    expect(result.notes).toHaveLength(8);
    expect(result.notes[0]).toBe('LA');
    expect(result.notes[7]).toBe('LA'); // octave
    expect(result.intervals).toEqual([2, 1, 2, 2, 1, 2, 2]);
  });

  it('A natural minor has correct note sequence', () => {
    const result = getScale(0, 'minor', 'naturalMinor');
    // A B C D E F G A
    expect(result.notes).toEqual([
      'LA', 'SI', 'DO', 'RE', 'MI', 'FA', 'SOL', 'LA'
    ]);
  });

  it('returns G major scale for keyIndex 1, major', () => {
    const result = getScale(1, 'major', 'major');
    expect(result.tonic).toBe('SOL');
    expect(result.notes[0]).toBe('SOL');
    expect(result.notes[7]).toBe('SOL');
    // G A B C D E F# G
    expect(result.notes).toEqual([
      'SOL', 'LA', 'SI', 'DO', 'RE', 'MI', 'FA#', 'SOL'
    ]);
  });

  it('returns A harmonic minor scale', () => {
    const result = getScale(0, 'minor', 'harmonicMinor');
    expect(result.name).toBe('Harmonic Minor');
    expect(result.notes[0]).toBe('LA');
    expect(result.notes[7]).toBe('LA');
    // A B C D E F G# A
    expect(result.notes).toEqual([
      'LA', 'SI', 'DO', 'RE', 'MI', 'FA', 'SOL#', 'LA'
    ]);
  });

  it('returns A melodic minor ascending scale', () => {
    const result = getScale(0, 'minor', 'melodicMinor');
    expect(result.name).toBe('Melodic Minor');
    expect(result.notes[0]).toBe('LA');
    expect(result.notes[7]).toBe('LA');
    // A B C D E F# G# A
    expect(result.notes).toEqual([
      'LA', 'SI', 'DO', 'RE', 'MI', 'FA#', 'SOL#', 'LA'
    ]);
  });

  it('clamps invalid keyIndex using modulo', () => {
    const result = getScale(12, 'major', 'major');
    expect(result.tonic).toBe('DO'); // wraps to index 0
  });

  it('handles negative keyIndex', () => {
    const result = getScale(-1, 'major', 'major');
    // -1 mod 12 = 11 → FA
    expect(result.tonic).toBe('FA');
  });

  it('staffPositions has 8 entries', () => {
    const result = getScale(0, 'major', 'major');
    expect(result.staffPositions).toHaveLength(8);
  });
});

describe('getAllScales', () => {
  it('returns 4 ScaleResult objects for a major key', () => {
    const results = getAllScales(0, 'major');
    expect(results).toHaveLength(4);
    expect(results[0].name).toBe('Major');
    expect(results[1].name).toBe('Natural Minor');
    expect(results[2].name).toBe('Harmonic Minor');
    expect(results[3].name).toBe('Melodic Minor');
  });

  it('returns 4 ScaleResult objects for a minor key', () => {
    const results = getAllScales(0, 'minor');
    expect(results).toHaveLength(4);
    expect(results[0].name).toBe('Major');
    expect(results[1].name).toBe('Natural Minor');
    expect(results[2].name).toBe('Harmonic Minor');
    expect(results[3].name).toBe('Melodic Minor');
  });

  it('major key: first scale is the major scale of that key', () => {
    const results = getAllScales(0, 'major');
    expect(results[0].tonic).toBe('DO');
    expect(results[0].notes[0]).toBe('DO');
  });

  it('major key: minor scales use the relative minor tonic', () => {
    const results = getAllScales(0, 'major');
    // Relative minor of C major is A minor (same slice, minor ring)
    expect(results[1].tonic).toBe('la');
    expect(results[2].tonic).toBe('la');
    expect(results[3].tonic).toBe('la');
  });

  it('minor key: first scale is the relative major', () => {
    const results = getAllScales(0, 'minor');
    // Same slice major ring = DO
    expect(results[0].tonic).toBe('DO');
  });

  it('minor key: minor scales use the minor key tonic', () => {
    const results = getAllScales(0, 'minor');
    expect(results[1].tonic).toBe('la');
    expect(results[2].tonic).toBe('la');
    expect(results[3].tonic).toBe('la');
  });

  it('each result has 8 notes', () => {
    const results = getAllScales(3, 'major');
    for (const scale of results) {
      expect(scale.notes).toHaveLength(8);
    }
  });
});
