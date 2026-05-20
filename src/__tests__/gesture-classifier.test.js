import { describe, it, expect } from 'vitest';
import {
  classifyGesture,
  SWIPE_MIN_DX,
  SWIPE_MAX_DURATION,
  TAP_MAX_DISPLACEMENT,
  TAP_MAX_DURATION
} from '../modes/gesture-classifier.js';

describe('modes/gesture-classifier', () => {
  describe('exported constants', () => {
    it('exports correct threshold values', () => {
      expect(SWIPE_MIN_DX).toBe(30);
      expect(SWIPE_MAX_DURATION).toBe(300);
      expect(TAP_MAX_DISPLACEMENT).toBe(10);
      expect(TAP_MAX_DURATION).toBe(300);
    });
  });

  describe('swipe classification', () => {
    it('classifies left swipe when dx < -30 and duration < 300ms', () => {
      expect(classifyGesture(-50, 0, 200)).toBe('swipe-left');
    });

    it('classifies right swipe when dx > 30 and duration < 300ms', () => {
      expect(classifyGesture(50, 0, 200)).toBe('swipe-right');
    });

    it('requires |dx| strictly greater than 30', () => {
      // Exactly 30 should NOT be a swipe
      expect(classifyGesture(30, 0, 100)).not.toBe('swipe-right');
      expect(classifyGesture(-30, 0, 100)).not.toBe('swipe-left');
    });

    it('requires duration strictly less than 300ms', () => {
      // Exactly 300ms should NOT be a swipe
      expect(classifyGesture(50, 0, 300)).not.toBe('swipe-right');
    });

    it('swipe takes priority over tap even if displacement is small', () => {
      // dx=31 means total displacement could be ≤10 if dy is small enough... 
      // but actually sqrt(31²+0²) = 31 > 10, so this wouldn't be a tap anyway.
      // Better test: large dx with small total displacement isn't possible,
      // but the priority rule means swipe check runs first.
      expect(classifyGesture(35, 0, 100)).toBe('swipe-right');
    });
  });

  describe('tap classification', () => {
    it('classifies tap when displacement ≤ 10 and duration ≤ 300ms', () => {
      expect(classifyGesture(0, 0, 100)).toBe('tap');
    });

    it('classifies tap at boundary displacement (exactly 10)', () => {
      // sqrt(6² + 8²) = sqrt(36+64) = sqrt(100) = 10
      expect(classifyGesture(6, 8, 200)).toBe('tap');
    });

    it('classifies tap at boundary duration (exactly 300ms)', () => {
      expect(classifyGesture(0, 0, 300)).toBe('tap');
    });

    it('classifies tap with small non-zero displacement', () => {
      expect(classifyGesture(3, 4, 150)).toBe('tap');
    });
  });

  describe('discard classification', () => {
    it('discards when displacement > 10 but not a swipe (slow horizontal)', () => {
      // dx=20 (not > 30), displacement = 20 > 10, duration = 200
      expect(classifyGesture(20, 0, 200)).toBe('discard');
    });

    it('discards when duration > 300ms and displacement > 10', () => {
      expect(classifyGesture(15, 15, 500)).toBe('discard');
    });

    it('discards long-duration large-displacement gesture', () => {
      // dx > 30 but duration >= 300 → not a swipe; displacement > 10 → not a tap
      expect(classifyGesture(50, 0, 300)).toBe('discard');
    });

    it('discards vertical drag (large dy, small dx)', () => {
      // displacement = sqrt(5² + 50²) ≈ 50.2 > 10, dx=5 not > 30
      expect(classifyGesture(5, 50, 200)).toBe('discard');
    });

    it('discards when duration exceeds tap max and not a swipe', () => {
      expect(classifyGesture(0, 0, 301)).toBe('discard');
    });
  });

  describe('mutual exclusivity', () => {
    it('never returns both swipe and tap for same input', () => {
      // A swipe requires |dx| > 30, which means displacement > 30 > 10,
      // so it can never also satisfy the tap condition
      const result = classifyGesture(50, 0, 100);
      expect(result).toBe('swipe-right');
      expect(result).not.toBe('tap');
    });
  });
});
