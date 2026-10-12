// Application-wide configuration constants.
// Centralizes all tunable values so they can be adjusted without touching component code.

// ─── Playback ─────────────────────────────────────────────────────────────────

/** Inter-note spacing for scale playback (ms) */
export const SCALE_TEMPO_MS = 1000;

/** Inter-chord spacing for chord sequence playback (ms) */
export const CHORD_TEMPO_MS = 1000;

// ─── Bouncing Sphere ──────────────────────────────────────────────────────────

/** Sphere diameter in pixels */
export const SPHERE_DIAMETER = 11;

/** Sphere z-index (must sit above staff SVG) */
export const SPHERE_Z_INDEX = 100;

/** Max arc height during bounce animation (px) */
export const SPHERE_ARC_MAX_HEIGHT = 30;

/** Arc height as a ratio of horizontal distance */
export const SPHERE_ARC_RATIO = 0.3;

/** Sphere hide fade-out duration (ms) */
export const SPHERE_HIDE_DURATION_MS = 50;

/** Sphere vertical offset above the note element (px) */
export const SPHERE_NOTE_OFFSET_Y = 20;

// ─── Tap Playback Feedback ────────────────────────────────────────────────────

/** Duration a tap sphere remains visible (ms) */
export const TAP_SPHERE_VISIBLE_MS = 400;

/** Delay before destroying the tap sphere after hide (ms) */
export const TAP_SPHERE_DESTROY_DELAY_MS = 100;

/** Duration the sounding highlight persists (ms) */
export const SOUNDING_HIGHLIGHT_MS = 400;

/** Vertical offset for tap sphere above the note (px) */
export const TAP_SPHERE_OFFSET_Y = 24;
