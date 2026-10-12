// Diatonic chord degrees for circle-of-fifths relationships.
// Degree labels come from the notation core (pitch.js); this module only maps
// circle positions onto them.
//
// For a major key: selected = I, clockwise neighbor = V, counter-clockwise = IV
// Relative minors: same index = vi, cw = iii, ccw = ii
// Diminished: 2 positions clockwise on inner ring = vii°
// For a minor key: selected = i, cw = v, ccw = iv
// Relative majors: same index = III, cw = VII, ccw = VI
// Diminished: 2 positions clockwise on inner ring = ii°

import { degreeLabels } from './pitch.js';

/**
 * Index into the seven degree labels for each circle position, by key type.
 */
const DEGREE_INDEXES = {
  major: {
    outer: { self: 0, cw: 4, ccw: 3 },
    inner: { self: 5, cw: 2, ccw: 1 },
    dim: 6
  },
  minor: {
    outer: { self: 2, cw: 6, ccw: 5 },
    inner: { self: 0, cw: 4, ccw: 3 },
    dim: 1
  }
};

/**
 * Map a key type's circle positions onto its degree labels.
 * The `dim` entry identifies the diminished chord (always 2 positions CW on the inner ring).
 */
function buildNeighborDegrees(keyType) {
  const labels = degreeLabels(keyType);
  const idx = DEGREE_INDEXES[keyType];

  return {
    outer: { self: labels[idx.outer.self], cw: labels[idx.outer.cw], ccw: labels[idx.outer.ccw] },
    inner: { self: labels[idx.inner.self], cw: labels[idx.inner.cw], ccw: labels[idx.inner.ccw] },
    dim: { label: labels[idx.dim], ring: 'inner', offset: 2 }
  };
}

/**
 * Degree mappings for diatonic chords on the circle of fifths.
 * Each key type maps outer/inner ring positions (self, clockwise, counter-clockwise)
 * to their roman numeral scale degree labels.
 */
export const NEIGHBOR_DEGREES = {
  major: buildNeighborDegrees('major'),
  minor: buildNeighborDegrees('minor')
};

/**
 * Returns the degree mapping for the given key type.
 * @param {"major" | "minor"} type - The key type
 * @returns {{ outer: {self: string, cw: string, ccw: string}, inner: {self: string, cw: string, ccw: string}, dim: {label: string, ring: string, offset: number} }}
 */
export function getNeighborDegrees(type) {
  return NEIGHBOR_DEGREES[type];
}
