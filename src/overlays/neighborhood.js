// src/overlays/neighborhood.js
// The diatonic neighbourhood: one description of the highlight sectors, roman
// numerals and centre label that both the full-circle overlay and the neighbour
// arc draw. Renderers map these entries onto their own target — DOM elements or
// SVG markup — so the geometry and labelling live here once.
//
// An entry's `sliceIndex` is its absolute position (0-11) around the circle; its
// `position` is the offset from the tonic. The full-circle overlay angles by the
// absolute slice, the neighbour arc by the relative position.

import { DEFAULT_CONFIG, sectorPath } from '../circle/geometry.js';
import { getNeighborDegrees } from '../theory/degrees.js';
import { SLICES } from '../circle/keys.js';

const DEG = Math.PI / 180;
const CIRCLE_TOP_DEG = -90;
const SLICE_DEG = 30;
const HALF_SLICE_DEG = 15;
const LABEL_CLOCKWISE_DEG = 12;
const LABEL_INSET = 12;

/** The three immediate slices, with the degree key each position uses. */
const IMMEDIATE_POSITIONS = [
  [-1, 'ccw'],
  [0, 'self'],
  [1, 'cw']
];

/** The key type each ring carries. */
const RING_TYPE = { outer: 'major', inner: 'minor' };

function mod12(n) {
  return ((n % 12) + 12) % 12;
}

/**
 * The centre label content for a key.
 * @param {{ index: number, type: 'major' | 'minor' }} keyInfo
 */
function centerLabel({ index, type }) {
  const slice = SLICES[index];
  return {
    keyName: type === 'major' ? slice.major : slice.minor,
    typeLabel: type === 'major' ? 'Majeur' : 'mineur',
    typeClass: type === 'major' ? 'roman-numeral--major' : 'roman-numeral--minor'
  };
}

/**
 * Describe the diatonic neighbourhood of a key: seven entries (three immediate
 * slices on both rings, plus the diminished sector), each carrying its sector,
 * roman numeral and tonic flag, and the centre label content.
 *
 * The tonic's ring is drawn first per position, so a renderer that paints in
 * entry order matches the neighbour arc's original order.
 *
 * @param {{ index: number, type: 'major' | 'minor' }} keyInfo
 * @returns {{
 *   entries: Array<{
 *     sliceIndex: number,
 *     position: number,
 *     ring: 'outer' | 'inner',
 *     type: 'major' | 'minor',
 *     isTonic: boolean,
 *     label: string
 *   }>,
 *   center: { keyName: string, typeLabel: string, typeClass: string }
 * }}
 */
export function getNeighborhood(keyInfo) {
  const { index, type } = keyInfo;
  const degrees = getNeighborDegrees(type);
  const tonicRing = type === 'major' ? 'outer' : 'inner';
  const relativeRing = type === 'major' ? 'inner' : 'outer';

  const entries = [];
  for (const [position, degreeKey] of IMMEDIATE_POSITIONS) {
    for (const ring of [tonicRing, relativeRing]) {
      entries.push({
        sliceIndex: mod12(index + position),
        position,
        ring,
        type: RING_TYPE[ring],
        isTonic: position === 0 && ring === tonicRing,
        label: degrees[ring][degreeKey]
      });
    }
  }

  entries.push({
    sliceIndex: mod12(index + degrees.dim.offset),
    position: degrees.dim.offset,
    ring: 'inner',
    type: 'minor',
    isTonic: false,
    label: degrees.dim.label
  });

  return { entries, center: centerLabel(keyInfo) };
}

/**
 * The SVG path for a neighbourhood sector, at the given angle index and ring.
 * The full-circle overlay passes the absolute slice; the neighbour arc passes
 * the relative position.
 * @param {number} angleIndex
 * @param {'outer' | 'inner'} ring
 * @returns {string}
 */
export function neighborhoodSector(angleIndex, ring) {
  const { centerX, centerY, outerRadius, middleRadius, innerRadius } = DEFAULT_CONFIG;
  const [innerR, outerR] =
    ring === 'outer' ? [middleRadius, outerRadius] : [innerRadius, middleRadius];
  const startDeg = CIRCLE_TOP_DEG + angleIndex * SLICE_DEG - HALF_SLICE_DEG;
  return sectorPath(centerX, centerY, innerR, outerR, startDeg, startDeg + SLICE_DEG);
}

/**
 * The point for a roman numeral, inset from the ring's rim and nudged clockwise.
 * @param {number} angleIndex
 * @param {'outer' | 'inner'} ring
 * @returns {{ x: number, y: number }}
 */
export function neighborhoodLabelPoint(angleIndex, ring) {
  const { centerX, centerY, outerRadius, middleRadius } = DEFAULT_CONFIG;
  const radius = (ring === 'outer' ? outerRadius : middleRadius) - LABEL_INSET;
  const angle = (CIRCLE_TOP_DEG + angleIndex * SLICE_DEG + LABEL_CLOCKWISE_DEG) * DEG;
  return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
}
