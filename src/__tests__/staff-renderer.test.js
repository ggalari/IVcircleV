/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { getSingleNoteName, formatChordQuality } from '../modes/staff-renderer.js';

describe('staff-renderer utilities', () => {
  describe('getSingleNoteName', () => {
    it('returns the first name when there is no alternative', () => {
      expect(getSingleNoteName('DO')).toBe('DO');
      expect(getSingleNoteName('RE')).toBe('RE');
    });

    it('returns only the first name when there is an alternative', () => {
      expect(getSingleNoteName('FA#/SOL♭')).toBe('FA#');
      expect(getSingleNoteName('DO#/RE♭')).toBe('DO#');
      expect(getSingleNoteName('SOL#/LA♭')).toBe('SOL#');
    });

    it('handles notes with accidentals', () => {
      expect(getSingleNoteName('SI♭')).toBe('SI♭');
      expect(getSingleNoteName('MI♭')).toBe('MI♭');
    });
  });

  describe('formatChordQuality', () => {
    it('returns empty string for major', () => {
      expect(formatChordQuality('major')).toBe('');
    });

    it('returns m for minor', () => {
      expect(formatChordQuality('minor')).toBe('m');
    });

    it('returns ° for diminished', () => {
      expect(formatChordQuality('diminished')).toBe('°');
    });

    it('returns + for augmented', () => {
      expect(formatChordQuality('augmented')).toBe('+');
    });

    it('returns Δ7 for maj7', () => {
      expect(formatChordQuality('maj7')).toBe('Δ7');
    });

    it('returns m7 for min7', () => {
      expect(formatChordQuality('min7')).toBe('m7');
    });

    it('returns 7 for dom7', () => {
      expect(formatChordQuality('dom7')).toBe('7');
    });

    it('returns ø7 for half-dim7', () => {
      expect(formatChordQuality('half-dim7')).toBe('ø7');
    });
  });
});
