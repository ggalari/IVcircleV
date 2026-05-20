// src/overlays/neighbors.js
// Neighbor overlay — draws highlight sectors and roman numeral labels

import { sectorPath, DEFAULT_CONFIG } from '../circle/geometry.js';
import { get, set } from '../state.js';
import { getNeighborDegrees } from '../theory/degrees.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** @type {SVGGElement | null} */
let overlayGroup = null;

/**
 * Creates the SVG group element for the neighbor overlay and appends it to the given SVG.
 * @param {SVGSVGElement} svg - The root SVG element
 * @returns {SVGGElement} The overlay group element
 */
export function createOverlay(svg) {
  if (!svg) return null;
  let existing = svg.querySelector('.neighbor-overlay');
  if (existing) {
    overlayGroup = existing;
    return existing;
  }
  const g = document.createElementNS(SVG_NS, 'g');
  g.classList.add('neighbor-overlay');
  svg.appendChild(g);
  overlayGroup = g;
  return g;
}

/**
 * Removes all overlay children and resets state.
 */
export function clearNeighbors() {
  if (overlayGroup) {
    overlayGroup.innerHTML = '';
  }
  set('overlayActive', false);
  set('selectedKeyIndex', null);
  set('overlayType', null);
}

/**
 * Draws 6 highlight sectors (3 outer, 3 inner) with roman numeral labels
 * for the given key info.
 * @param {{ index: number, type: "major" | "minor" }} keyInfo
 */
export function showNeighbors(keyInfo) {
  // Clear any existing overlay content first
  if (overlayGroup) {
    overlayGroup.innerHTML = '';
  }

  const degrees = getNeighborDegrees(keyInfo.type);
  const idx = keyInfo.index;
  const cwIdx = (idx + 1) % 12;
  const ccwIdx = (idx + 11) % 12;

  // Determine which ring the selected key is on
  const tonicRing = keyInfo.type === 'major' ? 'outer' : 'inner';
  const relativeRing = keyInfo.type === 'major' ? 'inner' : 'outer';

  // Draw sectors on the tonic's ring (3 sectors: self + 2 neighbors)
  // Color is based on the RING (outer=major/red, inner=minor/green) to match legend
  addSector(idx, { type: 'major', ring: 'outer', isTonic: keyInfo.type === 'major' });
  addSector(cwIdx, { type: 'major', ring: 'outer' });
  addSector(ccwIdx, { type: 'major', ring: 'outer' });

  // Draw sectors on the inner ring (3 sectors at same indices)
  addSector(idx, { type: 'minor', ring: 'inner', isTonic: keyInfo.type === 'minor' });
  addSector(cwIdx, { type: 'minor', ring: 'inner' });
  addSector(ccwIdx, { type: 'minor', ring: 'inner' });

  // Add roman numeral labels on the tonic's ring
  const tonicDegrees = keyInfo.type === 'major' ? degrees.outer : degrees.inner;
  addLabel(idx, tonicDegrees.self, tonicRing === 'outer' ? 'major' : 'minor', tonicRing);
  addLabel(cwIdx, tonicDegrees.cw, tonicRing === 'outer' ? 'major' : 'minor', tonicRing);
  addLabel(ccwIdx, tonicDegrees.ccw, tonicRing === 'outer' ? 'major' : 'minor', tonicRing);

  // Add roman numeral labels on the relative ring
  const relativeDegrees = keyInfo.type === 'major' ? degrees.inner : degrees.outer;
  addLabel(idx, relativeDegrees.self, relativeRing === 'outer' ? 'major' : 'minor', relativeRing);
  addLabel(cwIdx, relativeDegrees.cw, relativeRing === 'outer' ? 'major' : 'minor', relativeRing);
  addLabel(ccwIdx, relativeDegrees.ccw, relativeRing === 'outer' ? 'major' : 'minor', relativeRing);

  // Draw the diminished chord sector (7th degree)
  if (degrees.dim) {
    const dimIdx = (idx + degrees.dim.offset) % 12;
    // Color based on which ring it's on
    const dimType = degrees.dim.ring === 'inner' ? 'minor' : 'major';
    addSector(dimIdx, { type: dimType, ring: degrees.dim.ring });
    addLabel(dimIdx, degrees.dim.label, dimType, degrees.dim.ring);
  }

  // Update state
  set('overlayActive', true);
  set('selectedKeyIndex', keyInfo.index);
  set('overlayType', keyInfo.type);
}

// --- Internal helpers ---

/**
 * Adds a highlight sector path to the overlay group.
 * @param {number} index - Slice index (0–11)
 * @param {{ type: string, ring: string, isTonic?: boolean }} options
 */
function addSector(index, options = {}) {
  if (!overlayGroup) return;

  const { centerX, centerY, outerRadius, middleRadius, innerRadius } = DEFAULT_CONFIG;

  let outerR, innerR;
  if (options.ring === 'inner') {
    outerR = middleRadius;
    innerR = innerRadius;
  } else {
    outerR = outerRadius;
    innerR = middleRadius;
  }

  const startDeg = -90 + index * 30 - 15;
  const endDeg = startDeg + 30;

  const d = sectorPath(centerX, centerY, innerR, outerR, startDeg, endDeg);

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);

  const type = options.type || 'major';
  const cls = type === 'minor' ? 'highlight-minor fade-in' : 'highlight-major fade-in';
  path.setAttribute('class', cls);

  // Tonic sector at full opacity, neighbors at reduced
  path.style.opacity = options.isTonic ? '1' : '0.45';

  overlayGroup.appendChild(path);
}

/**
 * Adds a roman numeral label text element to the overlay group.
 * @param {number} index - Slice index (0–11)
 * @param {string} numeral - Roman numeral text
 * @param {string} type - "major" or "minor"
 * @param {string} ring - "outer" or "inner"
 */
function addLabel(index, numeral, type, ring) {
  if (!overlayGroup) return;

  const { centerX, centerY, outerRadius, middleRadius } = DEFAULT_CONFIG;

  // Position near the outer edge of the ring, offset clockwise by ~12°
  const labelRadius = ring === 'outer' ? outerRadius - 12 : middleRadius - 12;
  const angle = (-90 + index * 30 + 12) * Math.PI / 180;
  const x = centerX + labelRadius * Math.cos(angle);
  const y = centerY + labelRadius * Math.sin(angle);

  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', x);
  text.setAttribute('y', y);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('font-size', ring === 'outer' ? '15px' : '13px');
  text.setAttribute('font-family', 'Georgia, serif');
  text.setAttribute('font-weight', '700');
  text.setAttribute('fill', type === 'minor' ? '#2E6B2E' : '#8B0000');
  text.setAttribute('class', 'roman-numeral fade-in');
  text.setAttribute('pointer-events', 'none');
  text.textContent = numeral;

  overlayGroup.appendChild(text);
}
