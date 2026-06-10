import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scheduleScale, scheduleChordSequence, scheduleImmediate } from '../audio/scheduler.js';

/**
 * Create a mock AudioBuffer.
 */
function createMockBuffer(duration = 1.5) {
  return { duration, length: 66150, numberOfChannels: 1, sampleRate: 44100 };
}

/**
 * Create a mock GainNode with an AudioParam-like gain property.
 */
function createMockGainNode() {
  const gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn()
  };
  return {
    gain,
    connect: vi.fn(),
    disconnect: vi.fn()
  };
}

/**
 * Create a mock AudioBufferSourceNode.
 */
function createMockSourceNode() {
  return {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn()
  };
}

/**
 * Create a mock AudioContext that tracks all created nodes.
 */
function createMockAudioContext(currentTime = 0) {
  const sources = [];
  const gains = [];

  const ctx = {
    currentTime,
    destination: { type: 'destination' },
    createBufferSource: vi.fn(() => {
      const source = createMockSourceNode();
      sources.push(source);
      return source;
    }),
    createGain: vi.fn(() => {
      const gainNode = createMockGainNode();
      gains.push(gainNode);
      return gainNode;
    }),
    _sources: sources,
    _gains: gains
  };

  return ctx;
}

/**
 * Create a buffers Map from an array of keys.
 */
function createBuffersMap(keys) {
  const map = new Map();
  for (const key of keys) {
    map.set(key, createMockBuffer());
  }
  return map;
}

describe('scheduler', () => {
  describe('scheduleScale', () => {
    it('creates one source node per note with available buffers', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'D4', 'E4', 'F4', 'G4']);
      const notes = ['C4', 'D4', 'E4', 'F4', 'G4'];

      scheduleScale(ctx, buffers, notes, 1.0, 500, 1.0);

      expect(ctx.createBufferSource).toHaveBeenCalledTimes(5);
      expect(ctx.createGain).toHaveBeenCalledTimes(5);
    });

    it('schedules notes at correct arithmetic timing progression', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'D4', 'E4']);
      const notes = ['C4', 'D4', 'E4'];
      const startTime = 2.0;
      const intervalMs = 500;

      scheduleScale(ctx, buffers, notes, startTime, intervalMs, 1.0);

      // Each source should start at startTime + i * (intervalMs/1000)
      expect(ctx._sources[0].start).toHaveBeenCalledWith(2.0);   // 2.0 + 0 * 0.5
      expect(ctx._sources[1].start).toHaveBeenCalledWith(2.5);   // 2.0 + 1 * 0.5
      expect(ctx._sources[2].start).toHaveBeenCalledWith(3.0);   // 2.0 + 2 * 0.5
    });

    it('sets gain values correctly for each note', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'D4']);
      const notes = ['C4', 'D4'];
      const gainValue = 0.8;

      scheduleScale(ctx, buffers, notes, 1.0, 500, gainValue);

      // Gain should be set for each note
      expect(ctx._gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.8, 1.0);
      expect(ctx._gains[1].gain.setValueAtTime).toHaveBeenCalledWith(0.8, 1.5);
    });

    it('skips missing samples while maintaining timing progression', () => {
      const ctx = createMockAudioContext(1.0);
      // Only C4 and E4 have buffers; D4 is missing
      const buffers = createBuffersMap(['C4', 'E4']);
      const notes = ['C4', 'D4', 'E4'];
      const startTime = 1.0;

      scheduleScale(ctx, buffers, notes, startTime, 500, 1.0);

      // Only 2 sources created (D4 skipped)
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);

      // C4 starts at 1.0, E4 starts at 2.0 (skipping D4's slot at 1.5)
      expect(ctx._sources[0].start).toHaveBeenCalledWith(1.0);
      expect(ctx._sources[1].start).toHaveBeenCalledWith(2.0);
    });

    it('calls onNoteStart callback for each note including skipped ones', () => {
      vi.useFakeTimers();
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'E4']);
      const notes = ['C4', 'D4', 'E4'];
      const onNoteStart = vi.fn();

      scheduleScale(ctx, buffers, notes, 1.0, 500, 1.0, onNoteStart);

      // Advance timers to fire all scheduled callbacks
      vi.advanceTimersByTime(2000);

      expect(onNoteStart).toHaveBeenCalledTimes(3);
      expect(onNoteStart).toHaveBeenCalledWith(0, 1.0);
      expect(onNoteStart).toHaveBeenCalledWith(1, 1.5);
      expect(onNoteStart).toHaveBeenCalledWith(2, 2.0);
      vi.useRealTimers();
    });

    it('returns a stopFn that stops all active sources', () => {
      const ctx = createMockAudioContext(5.0);
      const buffers = createBuffersMap(['C4', 'D4', 'E4']);
      const notes = ['C4', 'D4', 'E4'];

      const { stopFn } = scheduleScale(ctx, buffers, notes, 5.0, 500, 1.0);
      stopFn();

      // All 3 sources should have stop() called
      for (const source of ctx._sources) {
        expect(source.stop).toHaveBeenCalled();
      }
    });

    it('returns correct scheduledEndTime', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'D4', 'E4', 'F4']);
      const notes = ['C4', 'D4', 'E4', 'F4'];

      const { scheduledEndTime } = scheduleScale(ctx, buffers, notes, 2.0, 500, 1.0);

      // scheduledEndTime = startTime + notes.length * intervalSec = 2.0 + 4 * 0.5 = 4.0
      expect(scheduledEndTime).toBe(4.0);
    });

    it('applies gain envelope release at end of each note', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4']);
      const notes = ['C4'];
      const bufferDuration = 1.5;

      scheduleScale(ctx, buffers, notes, 1.0, 500, 1.0);

      const gainNode = ctx._gains[0];
      // Release should ramp to 0 at startTime + buffer.duration
      const endTime = 1.0 + bufferDuration;
      expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, endTime);
    });

    it('handles empty notes array gracefully', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4']);

      const { stopFn, scheduledEndTime } = scheduleScale(ctx, buffers, [], 1.0, 500, 1.0);

      expect(ctx.createBufferSource).not.toHaveBeenCalled();
      expect(scheduledEndTime).toBe(1.0);
      expect(stopFn).toBeTypeOf('function');
    });
  });

  describe('scheduleChordSequence', () => {
    it('creates source nodes for all tones across all chords', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'E4', 'G4', 'D4', 'F4', 'A4']);
      const chords = [
        ['C4', 'E4', 'G4'],  // triad 1
        ['D4', 'F4', 'A4']   // triad 2
      ];

      scheduleChordSequence(ctx, buffers, chords, 1.0, 1000);

      // 3 + 3 = 6 source nodes
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(6);
    });

    it('schedules all tones of a chord with strum effect (slight stagger)', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'E4', 'G4']);
      const chords = [['C4', 'E4', 'G4']];

      scheduleChordSequence(ctx, buffers, chords, 2.0, 1000);

      // Strum effect: each tone offset by 25ms (0.025s)
      expect(ctx._sources[0].start).toHaveBeenCalledWith(2.0);
      expect(ctx._sources[1].start).toHaveBeenCalledWith(2.025);
      expect(ctx._sources[2].start).toHaveBeenCalledWith(2.05);
    });

    it('spaces consecutive chords at uniform intervals with strum on each', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'E4', 'G4', 'D4', 'F4', 'A4']);
      const chords = [
        ['C4', 'E4', 'G4'],
        ['D4', 'F4', 'A4']
      ];

      scheduleChordSequence(ctx, buffers, chords, 1.0, 1000);

      // First chord: sources 0-2 start at 1.0, 1.025, 1.05 (strum)
      expect(ctx._sources[0].start).toHaveBeenCalledWith(1.0);
      expect(ctx._sources[1].start).toHaveBeenCalledWith(1.025);
      expect(ctx._sources[2].start).toHaveBeenCalledWith(1.05);
      // Second chord: sources 3-5 start at 2.0, 2.025, 2.05
      expect(ctx._sources[3].start).toHaveBeenCalledWith(2.0);
      expect(ctx._sources[4].start).toHaveBeenCalledWith(2.025);
      expect(ctx._sources[5].start).toHaveBeenCalledWith(2.05);
    });

    it('sets gain to 0.7/sqrt(N) for each tone in a chord (triads)', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'E4', 'G4']);
      const chords = [['C4', 'E4', 'G4']]; // 3 tones

      scheduleChordSequence(ctx, buffers, chords, 1.0, 1000);

      // Each gain should be 0.7/sqrt(3)
      const expectedGain = 0.7 / Math.sqrt(3);
      for (const gainNode of ctx._gains) {
        expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(expect.closeTo(expectedGain, 4), expect.any(Number));
      }
    });

    it('sets gain to 0.7/sqrt(N) for seventh chords (4 tones)', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'E4', 'G4', 'B4']);
      const chords = [['C4', 'E4', 'G4', 'B4']]; // 4 tones

      scheduleChordSequence(ctx, buffers, chords, 1.0, 1000);

      const expectedGain = 0.7 / Math.sqrt(4);
      for (const gainNode of ctx._gains) {
        expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(expect.closeTo(expectedGain, 4), expect.any(Number));
      }
    });

    it('skips missing samples within a chord while others play', () => {
      const ctx = createMockAudioContext(1.0);
      // Only C4 and G4 available; E4 is missing
      const buffers = createBuffersMap(['C4', 'G4']);
      const chords = [['C4', 'E4', 'G4']];

      scheduleChordSequence(ctx, buffers, chords, 1.0, 1000);

      // Only 2 sources created (E4 skipped)
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);
      // Gain is calculated based on total chord tones (0.7/sqrt(3))
      const expectedGain = 0.7 / Math.sqrt(3);
      for (const gainNode of ctx._gains) {
        expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(expect.closeTo(expectedGain, 4), expect.any(Number));
      }
    });

    it('calls onChordStart callback for each chord', () => {
      vi.useFakeTimers();
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'E4', 'G4', 'D4', 'F4', 'A4']);
      const chords = [
        ['C4', 'E4', 'G4'],
        ['D4', 'F4', 'A4']
      ];
      const onChordStart = vi.fn();

      scheduleChordSequence(ctx, buffers, chords, 1.0, 1000, onChordStart);

      // Advance timers to fire all scheduled callbacks
      vi.advanceTimersByTime(2000);

      expect(onChordStart).toHaveBeenCalledTimes(2);
      expect(onChordStart).toHaveBeenCalledWith(0, 1.0);
      expect(onChordStart).toHaveBeenCalledWith(1, 2.0);
      vi.useRealTimers();
    });

    it('returns stopFn that stops all active sources', () => {
      const ctx = createMockAudioContext(5.0);
      const buffers = createBuffersMap(['C4', 'E4', 'G4']);
      const chords = [['C4', 'E4', 'G4']];

      const { stopFn } = scheduleChordSequence(ctx, buffers, chords, 5.0, 1000);
      stopFn();

      for (const source of ctx._sources) {
        expect(source.stop).toHaveBeenCalled();
      }
    });

    it('returns correct scheduledEndTime', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'E4', 'G4', 'D4', 'F4', 'A4', 'E4', 'G4', 'B4']);
      const chords = [
        ['C4', 'E4', 'G4'],
        ['D4', 'F4', 'A4'],
        ['E4', 'G4', 'B4']
      ];

      const { scheduledEndTime } = scheduleChordSequence(ctx, buffers, chords, 1.0, 1000);

      // scheduledEndTime = 1.0 + 3 * 1.0 = 4.0
      expect(scheduledEndTime).toBe(4.0);
    });
  });

  describe('scheduleImmediate', () => {
    it('plays notes with strum effect for multi-note (chord) playback', () => {
      const ctx = createMockAudioContext(3.5);
      const buffers = createBuffersMap(['C4', 'E4', 'G4']);
      const notes = ['C4', 'E4', 'G4'];

      scheduleImmediate(ctx, buffers, notes, 1.0);

      // Strum: each note offset by 25ms
      expect(ctx._sources[0].start).toHaveBeenCalledWith(3.5);
      expect(ctx._sources[1].start).toHaveBeenCalledWith(3.525);
      expect(ctx._sources[2].start).toHaveBeenCalledWith(3.55);
    });

    it('creates correct number of source nodes', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4', 'D4']);
      const notes = ['C4', 'D4'];

      scheduleImmediate(ctx, buffers, notes, 1.0);

      expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);
    });

    it('sets gain value for each note', () => {
      const ctx = createMockAudioContext(2.0);
      const buffers = createBuffersMap(['C4', 'E4']);
      const notes = ['C4', 'E4'];
      const gainValue = 0.5;

      scheduleImmediate(ctx, buffers, notes, gainValue);

      for (const gainNode of ctx._gains) {
        expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.5, expect.any(Number));
      }
    });

    it('skips notes with missing buffers', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4']); // Only C4 available
      const notes = ['C4', 'D4', 'E4'];

      scheduleImmediate(ctx, buffers, notes, 1.0);

      // Only 1 source created
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
    });

    it('returns stopFn that stops all playing sources', () => {
      const ctx = createMockAudioContext(4.0);
      const buffers = createBuffersMap(['C4', 'E4', 'G4']);
      const notes = ['C4', 'E4', 'G4'];

      const { stopFn } = scheduleImmediate(ctx, buffers, notes, 1.0);
      stopFn();

      for (const source of ctx._sources) {
        expect(source.stop).toHaveBeenCalled();
      }
    });

    it('applies release envelope when stopFn is called', () => {
      const ctx = createMockAudioContext(4.0);
      const buffers = createBuffersMap(['C4']);
      const notes = ['C4'];

      const { stopFn } = scheduleImmediate(ctx, buffers, notes, 1.0);
      stopFn();

      const gainNode = ctx._gains[0];
      // cancelScheduledValues should be called as part of release
      expect(gainNode.gain.cancelScheduledValues).toHaveBeenCalled();
      // linearRampToValueAtTime should ramp to 0
      expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        0,
        expect.closeTo(4.04, 2) // currentTime + RELEASE_TIME (0.04)
      );
    });

    it('handles empty notes array gracefully', () => {
      const ctx = createMockAudioContext(1.0);
      const buffers = createBuffersMap(['C4']);

      const { stopFn } = scheduleImmediate(ctx, buffers, [], 1.0);

      expect(ctx.createBufferSource).not.toHaveBeenCalled();
      expect(stopFn).toBeTypeOf('function');
    });
  });
});
