import { describe, it, expect, beforeEach } from 'vitest';
import { get, set, subscribe, reset } from '../state.js';

describe('state module', () => {
  beforeEach(() => {
    reset();
  });

  describe('declared schema', () => {
    it('exposes the initial value of every declared key', () => {
      expect(get('activeKey')).toEqual({ index: 0, type: 'major' });
      expect(get('currentMode')).toBe(0);
      expect(get('isTransitioning')).toBe(false);
      expect(get('instrument')).toBe('guitar');
      expect(get('playbackState')).toEqual({
        isPlaying: false,
        sectionId: null,
        currentIndex: -1,
        type: null,
      });
      expect(get('selectedKeyIndex')).toBe(null);
      expect(get('overlayType')).toBe(null);
      expect(get('overlayActive')).toBe(false);
      expect(get('labelToggle')).toBe(0);
    });

    it('no longer declares the unused samplesLoading key', () => {
      expect(get('samplesLoading')).toBe(undefined);
    });

    it('throws when setting an undeclared key', () => {
      expect(() => set('notARealKey', 1)).toThrow(/notARealKey/);
    });

    it('throws when subscribing to an undeclared key', () => {
      expect(() => subscribe('notARealKey', () => {})).toThrow(/notARealKey/);
    });
  });

  describe('reset', () => {
    it('restores every declared key to its initial value', () => {
      set('activeKey', { index: 7, type: 'minor' });
      set('selectedKeyIndex', 3);
      set('labelToggle', 9);

      reset();

      expect(get('activeKey')).toEqual({ index: 0, type: 'major' });
      expect(get('selectedKeyIndex')).toBe(null);
      expect(get('labelToggle')).toBe(0);
    });

    it('clears subscribers so they no longer fire', () => {
      const values = [];
      subscribe('selectedKeyIndex', (v) => values.push(v));
      set('selectedKeyIndex', 1);
      expect(values).toEqual([1]);

      reset();
      set('selectedKeyIndex', 2);
      expect(values).toEqual([1]);
    });
  });

  describe('get/set', () => {
    it('returns undefined for unset keys', () => {
      expect(get('nonexistent_key_xyz')).toBe(undefined);
    });

    it('returns the value after set', () => {
      set('selectedKeyIndex', 5);
      expect(get('selectedKeyIndex')).toBe(5);
    });

    it('handles all managed state keys', () => {
      set('selectedKeyIndex', 3);
      set('overlayActive', true);
      set('overlayType', 'minor');
      expect(get('selectedKeyIndex')).toBe(3);
      expect(get('overlayActive')).toBe(true);
      expect(get('overlayType')).toBe('minor');
    });

    it('handles null values', () => {
      set('selectedKeyIndex', null);
      expect(get('selectedKeyIndex')).toBe(null);
    });
  });

  describe('subscribe', () => {
    it('notifies subscriber when value changes', () => {
      const values = [];
      subscribe('overlayActive', (v) => values.push(v));
      set('overlayActive', true);
      expect(values).toEqual([true]);
    });

    it('notifies multiple subscribers in registration order', () => {
      const order = [];
      subscribe('selectedKeyIndex', () => order.push('first'));
      subscribe('selectedKeyIndex', () => order.push('second'));
      subscribe('selectedKeyIndex', () => order.push('third'));
      set('selectedKeyIndex', 7);
      expect(order).toEqual(['first', 'second', 'third']);
    });

    it('passes new value to each subscriber', () => {
      const values = [];
      subscribe('overlayType', (v) => values.push(v));
      set('overlayType', 'major');
      set('overlayType', 'minor');
      expect(values).toEqual(['major', 'minor']);
    });

    it('does not notify when value is identical', () => {
      set('overlayActive', true);
      const calls = [];
      subscribe('overlayActive', (v) => calls.push(v));
      set('overlayActive', true);
      expect(calls).toEqual([]);
    });

    it('returns an unsubscribe function that prevents future notifications', () => {
      const values = [];
      const unsub = subscribe('selectedKeyIndex', (v) => values.push(v));
      set('selectedKeyIndex', 1);
      unsub();
      set('selectedKeyIndex', 2);
      expect(values).toEqual([1]);
    });

    it('unsubscribe does not affect other subscribers', () => {
      const valuesA = [];
      const valuesB = [];
      const unsubA = subscribe('overlayType', (v) => valuesA.push(v));
      subscribe('overlayType', (v) => valuesB.push(v));
      set('overlayType', 'major');
      unsubA();
      set('overlayType', 'minor');
      expect(valuesA).toEqual(['major']);
      expect(valuesB).toEqual(['major', 'minor']);
    });
  });
});
