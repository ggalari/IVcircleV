// Diatonic chord degrees for circle-of-fifths relationships.
// For a major key: selected = I, clockwise neighbor = V, counter-clockwise = IV
// Relative minors: same index = vi, cw = iii, ccw = ii
// Diminished: 2 positions clockwise on inner ring = vii°
// For a minor key: selected = i, cw = v, ccw = iv
// Relative majors: same index = III, cw = VII, ccw = VI
// Diminished: 2 positions clockwise on inner ring = ii°

/**
 * Degree mappings for diatonic chords on the circle of fifths.
 * Each key type maps outer/inner ring positions (self, clockwise, counter-clockwise)
 * to their roman numeral scale degree labels.
 * The `dim` property identifies the diminished chord (always 2 positions CW on inner ring).
 */
export const NEIGHBOR_DEGREES = {
  major: {
    outer: { self: 'I', cw: 'V', ccw: 'IV' },
    inner: { self: 'vi', cw: 'iii', ccw: 'ii' },
    dim: { label: 'vii°', ring: 'inner', offset: 2 }
  },
  minor: {
    outer: { self: 'III', cw: 'VII', ccw: 'VI' },
    inner: { self: 'i', cw: 'v', ccw: 'iv' },
    dim: { label: 'ii°', ring: 'inner', offset: 2 }
  }
};

/**
 * Returns the degree mapping for the given key type.
 * @param {"major" | "minor"} type - The key type
 * @returns {{ outer: {self: string, cw: string, ccw: string}, inner: {self: string, cw: string, ccw: string}, dim: {label: string, ring: string, offset: number} }}
 */
export function getNeighborDegrees(type) {
  return NEIGHBOR_DEGREES[type];
}
