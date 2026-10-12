// src/overlays/neighbors.js
// Neighbor overlay — draws highlight sectors and roman numeral labels

import { DEFAULT_CONFIG } from '../circle/geometry.js';
import { set } from '../state.js';
import { getNeighborhood, neighborhoodSector, neighborhoodLabelPoint } from './neighborhood.js';

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
 * Draws the diatonic neighbourhood — 6 highlight sectors (3 outer, 3 inner),
 * the diminished sector, their roman numerals, and the centre label — from the
 * one neighbourhood model.
 * @param {{ index: number, type: "major" | "minor" }} keyInfo
 */
export function showNeighbors(keyInfo) {
  // Clear any existing overlay content first
  if (overlayGroup) {
    overlayGroup.innerHTML = '';
  }

  const { entries, center } = getNeighborhood(keyInfo);

  for (const entry of entries) {
    addSector(entry);
    addLabel(entry);
  }

  addCenterLabel(center);

  // Update state
  set('overlayActive', true);
  set('selectedKeyIndex', keyInfo.index);
  set('overlayType', keyInfo.type);
}

// --- Internal helpers ---

/**
 * Adds a highlight sector path for one neighbourhood entry to the overlay group.
 * @param {{ sliceIndex: number, ring: 'outer' | 'inner', type: string, isTonic: boolean }} entry
 */
function addSector(entry) {
  if (!overlayGroup) return;

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', neighborhoodSector(entry.sliceIndex, entry.ring));
  path.setAttribute('class', `highlight-${entry.type} fade-in`);

  // Tonic sector: stronger fill + visible border for emphasis
  if (entry.isTonic) {
    path.style.opacity = '1';
    path.setAttribute('stroke', entry.type === 'minor' ? 'var(--color-minor, #2E6B2E)' : 'var(--color-major, #8B0000)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-opacity', '0.6');
  } else {
    path.style.opacity = '0.45';
  }

  overlayGroup.appendChild(path);
}

/**
 * Adds the roman numeral for one neighbourhood entry to the overlay group.
 * @param {{ sliceIndex: number, ring: 'outer' | 'inner', type: string, label: string }} entry
 */
function addLabel(entry) {
  if (!overlayGroup) return;

  const { x, y } = neighborhoodLabelPoint(entry.sliceIndex, entry.ring);

  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', x);
  text.setAttribute('y', y);
  text.setAttribute('class', `roman-numeral roman-numeral--${entry.type} roman-numeral--${entry.ring} fade-in`);
  text.textContent = entry.label;

  overlayGroup.appendChild(text);
}

/**
 * Adds the active key name as a prominent label in the center of the circle.
 * Only renders if the 'showCenterLabel' setting is enabled.
 * @param {{ keyName: string, typeLabel: string, typeClass: string }} center
 */
function addCenterLabel(center) {
  if (!overlayGroup) return;
  if (!getCenterLabelSetting()) return;

  const { centerX, centerY } = DEFAULT_CONFIG;

  // Key name (large, centered vertically above midpoint)
  const nameText = document.createElementNS(SVG_NS, 'text');
  nameText.setAttribute('x', centerX);
  nameText.setAttribute('y', centerY - 12);
  nameText.setAttribute('class', `center-key-name ${center.typeClass} fade-in`);
  nameText.textContent = center.keyName;
  overlayGroup.appendChild(nameText);

  // Type label (below key name)
  const typeText = document.createElementNS(SVG_NS, 'text');
  typeText.setAttribute('x', centerX);
  typeText.setAttribute('y', centerY + 22);
  typeText.setAttribute('class', `center-key-type ${center.typeClass} fade-in`);
  typeText.textContent = center.typeLabel;
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
