import { describe, it, expect, beforeEach } from 'vitest';
import { get, set, subscribe } from '../state.js';

describe('state module', () => {
  beforeEach(() => {
    // Reset state by setting keys to undefined
    set('selectedKeyIndex', undefined);
    set('overlayActive', undefined);
    set('overlayType', undefined);
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
