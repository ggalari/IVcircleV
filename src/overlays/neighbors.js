// src/overlays/neighbors.js
// Neighbor overlay — draws highlight sectors and roman numeral labels

import { sectorPath, DEFAULT_CONFIG } from '../circle/geometry.js';
import { get, set } from '../state.js';
import { getNeighborDegrees } from '../theory/degrees.js';
import { SLICES } from '../circle/keys.js';

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

  // Active key label in the center of the circle
  addCenterLabel(keyInfo);

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

  // Tonic sector: stronger fill + visible border for emphasis
  if (options.isTonic) {
    path.style.opacity = '1';
    path.setAttribute('stroke', type === 'minor' ? 'var(--color-minor, #2E6B2E)' : 'var(--color-major, #8B0000)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-opacity', '0.6');
  } else {
    path.style.opacity = '0.45';
  }

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
  const typeClass = type === 'minor' ? 'roman-numeral--minor' : 'roman-numeral--major';
  const sizeClass = ring === 'outer' ? 'roman-numeral--outer' : 'roman-numeral--inner';
  text.setAttribute('class', `roman-numeral ${typeClass} ${sizeClass} fade-in`);
  text.textContent = numeral;

  overlayGroup.appendChild(text);
}

/**
 * Adds the active key name as a prominent label in the center of the circle.
 * Only renders if the 'showCenterLabel' setting is enabled.
 * @param {{ index: number, type: "major" | "minor" }} keyInfo
 */
function addCenterLabel(keyInfo) {
  if (!overlayGroup) return;
  if (!getCenterLabelSetting()) return;

  const { centerX, centerY } = DEFAULT_CONFIG;
  const slice = SLICES[keyInfo.index];
  const keyName = keyInfo.type === 'major' ? slice.major : slice.minor;
  const typeLabel = keyInfo.type === 'major' ? 'Majeur' : 'mineur';
  const typeClass = keyInfo.type === 'major' ? 'roman-numeral--major' : 'roman-numeral--minor';

  // Key name (large, centered vertically above midpoint)
  const nameText = document.createElementNS(SVG_NS, 'text');
  nameText.setAttribute('x', centerX);
  nameText.setAttribute('y', centerY - 12);
  nameText.setAttribute('class', `center-key-name ${typeClass} fade-in`);
  nameText.textContent = keyName;
  overlayGroup.appendChild(nameText);

  // Type label (below key name)
  const typeText = document.createElementNS(SVG_NS, 'text');
  typeText.setAttribute('x', centerX);
  typeText.setAttribute('y', centerY + 22);
  typeText.setAttribute('class', `center-key-type ${typeClass} fade-in`);
  typeText.textContent = typeLabel;
  overlayGroup.appendChild(typeText);
}

/**
 * Get the center label setting from cookie.
 * @returns {boolean}
 */
export function getCenterLabelSetting() {
  const match = document.cookie.match(/(?:^|;\s*)showCenterLabel=([^;]*)/);
  if (match) return match[1] === 'true';
  return true; // default: on
}

/**
 * Set the center label setting in a persistent cookie (1 year).
 * @param {boolean} enabled
 */
export function setCenterLabelSetting(enabled) {
  const maxAge = 365 * 24 * 60 * 60; // 1 year
  document.cookie = `showCenterLabel=${enabled};max-age=${maxAge};path=/;SameSite=Lax`;
}
