// Scheduler module: precise Web Audio timing for sequential and simultaneous playback.
// Uses AudioBufferSourceNode.start(time) offsets for sample-accurate scheduling.

/**
 * Release envelope duration in seconds (30-50ms range, using 40ms).
 */
const RELEASE_TIME = 0.04;

/**
 * Apply a gain envelope release (linear ramp to zero) before stopping a source.
 * @param {GainNode} gainNode
 * @param {AudioContext} audioContext
 * @param {number} [atTime] - Time to start the release. Defaults to audioContext.currentTime.
 */
function applyRelease(gainNode, audioContext, atTime) {
  const releaseStart = atTime != null ? atTime : audioContext.currentTime;
  gainNode.gain.cancelScheduledValues(releaseStart);
  gainNode.gain.setValueAtTime(gainNode.gain.value, releaseStart);
  gainNode.gain.linearRampToValueAtTime(0, releaseStart + RELEASE_TIME);
}

/**
 * Schedule a single note playback: create source → gain → destination.
 * Returns the source and gain nodes for later control.
 * @param {AudioContext} audioContext
 * @param {AudioBuffer} buffer
 * @param {number} startTime - Absolute AudioContext time to start playback
 * @param {number} gainValue - Gain level for this note
 * @returns {{ source: AudioBufferSourceNode, gain: GainNode }}
 */
function scheduleNote(audioContext, buffer, startTime, gainValue) {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(gainValue, startTime);

  source.connect(gain);
  gain.connect(audioContext.destination);

  // Schedule release envelope at the end of the buffer's natural duration
  const endTime = startTime + buffer.duration;
  gain.gain.setValueAtTime(gainValue, endTime - RELEASE_TIME);
  gain.gain.linearRampToValueAtTime(0, endTime);

  source.start(startTime);
  source.stop(endTime + 0.01); // Stop slightly after release completes

  return { source, gain };
}

/**
 * Schedule sequential note playback for a scale.
 * Notes are spaced at uniform intervals. Missing samples (null buffers) are skipped
 * but their timing slot is preserved.
 *
 * @param {AudioContext} audioContext - The Web Audio AudioContext
 * @param {Map<string, AudioBuffer>} buffers - Map of sample key → AudioBuffer
 * @param {string[]} notes - Array of sample key strings (e.g., ["C4", "D4", "E4"])
 * @param {number} startTime - AudioContext time to begin the sequence
 * @param {number} intervalMs - Inter-note onset spacing in milliseconds
 * @param {number} gainValue - Gain level for each note (typically 1.0)
 * @param {function} [onNoteStart] - Callback(index, time) for each scheduled note
 * @returns {{ stopFn: function, scheduledEndTime: number }}
 */
export function scheduleScale(audioContext, buffers, notes, startTime, intervalMs, gainValue, onNoteStart) {
  const intervalSec = intervalMs / 1000;
  const activeSources = [];
  const activeGains = [];
  const timers = [];

  for (let i = 0; i < notes.length; i++) {
    const noteTime = startTime + i * intervalSec;
    const buffer = buffers.get(notes[i]) || null;

    if (onNoteStart) {
      // Schedule callback to fire when this note actually plays
      const delayMs = (noteTime - audioContext.currentTime) * 1000;
      const timer = setTimeout(() => onNoteStart(i, noteTime), Math.max(0, delayMs));
      timers.push(timer);
    }

    if (buffer) {
      const { source, gain } = scheduleNote(audioContext, buffer, noteTime, gainValue);
      activeSources.push(source);
      activeGains.push(gain);
    }
    // If buffer is null, skip playback but maintain timing slot
  }

  const scheduledEndTime = startTime + notes.length * intervalSec;

  const stopFn = () => {
    timers.forEach(t => clearTimeout(t));
    for (let i = 0; i < activeSources.length; i++) {
      try {
        applyRelease(activeGains[i], audioContext);
        activeSources[i].stop(audioContext.currentTime + RELEASE_TIME);
      } catch (e) {
        // Source may have already stopped naturally
      }
    }
  };

  const immediateStopFn = createImmediateStopFn(activeSources, activeGains, timers);

  return { stopFn, immediateStopFn, scheduledEndTime };
}

/**
 * Schedule sequential chord playback. Each chord is an array of simultaneous notes.
 * Chords are spaced at uniform intervals. Gain per tone = 1/N where N = number of tones.
 *
 * @param {AudioContext} audioContext - The Web Audio AudioContext
 * @param {Map<string, AudioBuffer>} buffers - Map of sample key → AudioBuffer
 * @param {string[][]} chords - Array of chord arrays, each chord = array of sample key strings
 * @param {number} startTime - AudioContext time to begin the sequence
 * @param {number} intervalMs - Inter-chord onset spacing in milliseconds
 * @param {function} [onChordStart] - Callback(index, time) for each scheduled chord
 * @returns {{ stopFn: function, scheduledEndTime: number }}
 */
export function scheduleChordSequence(audioContext, buffers, chords, startTime, intervalMs, onChordStart) {
  const intervalSec = intervalMs / 1000;
  const activeSources = [];
  const activeGains = [];
  const timers = [];

  for (let i = 0; i < chords.length; i++) {
    const chordTime = startTime + i * intervalSec;
    const chordNotes = chords[i];
    const toneCount = chordNotes.length;
    // Use 0.7/sqrt(N) for perceptually balanced volume (louder than 1/N but still safe)
    const gainPerTone = toneCount > 0 ? 0.7 / Math.sqrt(toneCount) : 1;

    if (onChordStart) {
      // Schedule callback to fire at the real-world time when this chord plays
      const delayMs = (chordTime - audioContext.currentTime) * 1000;
      const timer = setTimeout(() => onChordStart(i, chordTime), Math.max(0, delayMs));
      timers.push(timer);
    }

    // Strum effect: stagger each note by ~25ms (like a guitar pick sweep)
    const strumDelay = 0.025; // 25ms between strings
    let noteIndex = 0;
    for (const noteKey of chordNotes) {
      const buffer = buffers.get(noteKey) || null;
      if (buffer) {
        const noteTime = chordTime + noteIndex * strumDelay;
        const { source, gain } = scheduleNote(audioContext, buffer, noteTime, gainPerTone);
        activeSources.push(source);
        activeGains.push(gain);
      }
      noteIndex++;
      // Skip missing samples, maintain timing for the chord
    }
  }

  const scheduledEndTime = startTime + chords.length * intervalSec;

  const stopFn = () => {
    timers.forEach(t => clearTimeout(t));
    for (let i = 0; i < activeSources.length; i++) {
      try {
        applyRelease(activeGains[i], audioContext);
        activeSources[i].stop(audioContext.currentTime + RELEASE_TIME);
      } catch (e) {
        // Source may have already stopped naturally
      }
    }
  };

  const immediateStopFn = createImmediateStopFn(activeSources, activeGains, timers);

  return { stopFn, immediateStopFn, scheduledEndTime };
}

/**
 * Play notes immediately (for tap playback). All notes start at audioContext.currentTime.
 *
 * @param {AudioContext} audioContext - The Web Audio AudioContext
 * @param {Map<string, AudioBuffer>} buffers - Map of sample key → AudioBuffer
 * @param {string[]} notes - Array of sample key strings to play simultaneously
 * @param {number} gainValue - Gain level per note
 * @returns {{ stopFn: function }}
 */
export function scheduleImmediate(audioContext, buffers, notes, gainValue) {
  const now = audioContext.currentTime;
  const activeSources = [];
  const activeGains = [];

  // Strum effect for multi-note playback (chords): stagger by 25ms
  const strumDelay = notes.length > 1 ? 0.025 : 0;
  let noteIndex = 0;
  for (const noteKey of notes) {
    const buffer = buffers.get(noteKey) || null;
    if (buffer) {
      const noteTime = now + noteIndex * strumDelay;
      const { source, gain } = scheduleNote(audioContext, buffer, noteTime, gainValue);
      activeSources.push(source);
      activeGains.push(gain);
    }
    noteIndex++;
  }

  const stopFn = () => {
    for (let i = 0; i < activeSources.length; i++) {
      try {
        applyRelease(activeGains[i], audioContext);
        activeSources[i].stop(audioContext.currentTime + RELEASE_TIME);
      } catch (e) {
        // Source may have already stopped naturally
      }
    }
  };

  const immediateStopFn = createImmediateStopFn(activeSources, activeGains);

  return { stopFn, immediateStopFn };
}

/**
 * Create an immediate (abrupt) stop function for a set of sources and gains.
 * Unlike the normal stopFn, this disconnects nodes immediately without applying
 * a fade-out envelope. Used for state-change stops per Requirement 7.4.
 *
 * @param {AudioBufferSourceNode[]} sources - Active source nodes
 * @param {GainNode[]} gains - Active gain nodes
 * @param {number[]} [timers] - setTimeout IDs to clear
 * @returns {function} Immediate stop function
 */
export function createImmediateStopFn(sources, gains, timers = []) {
  return () => {
    timers.forEach(t => clearTimeout(t));
    for (let i = 0; i < sources.length; i++) {
      try {
        sources[i].stop(0);
        sources[i].disconnect();
      } catch (e) {
        // Source may have already stopped
      }
      try {
        gains[i].disconnect();
      } catch (e) {
        // Gain node may already be disconnected
      }
    }
  };
}
