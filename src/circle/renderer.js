// src/circle/renderer.js
// SVG rendering for the Circle of Fifths
// Refactored with a reusable drawSlice() routine.

import { SLICES, SHARPS_ORDER, FLATS_ORDER, getLeadingTone } from './keys.js';
import { DEFAULT_CONFIG, sectorPath } from './geometry.js';

const DEG = Math.PI / 180;

// ─── Shared helpers ───────────────────────────────────────────────────────────

function renderStaffLines() {
  return [
    '<rect class="staff-line" width="64" x="0" y="0"/>',
    '<rect class="staff-line" width="64" x="0" y="5"/>',
    '<rect class="staff-line" width="64" x="0" y="10"/>',
    '<rect class="staff-line" width="64" x="0" y="15"/>',
    '<rect class="staff-line" width="64" x="0" y="20"/>'
  ].join('');
}

function renderAccidentals(acc) {
  if (acc === 0) return '';
  const order = acc > 0 ? SHARPS_ORDER : FLATS_ORDER;
  const count = Math.abs(acc);
  return Array.from({ length: count }, (_, i) => {
    const symbol = order[i];
    const x = 14 + i * 7;
    const y = symbol.y + 3.5;
    return `<text class="accidental" x="${x}" y="${y}">${symbol.name}</text>`;
  }).join('');
}

function renderStaffGroup(cx, cy, content) {
  return `<g transform="translate(${cx - 32}, ${cy - 10})">
    ${renderStaffLines()}
    <text class="clef" x="-11" y="20">𝄞</text>
    ${content}
  </g>`;
}

function renderAccidentalLabel(acc) {
  if (acc === 0) return '';
  return `${Math.abs(acc)}${acc > 0 ? '♯' : '♭'}`;
}

// ─── drawSlice: the reusable slice-drawing routine ────────────────────────────

/**
 * Draw a single slice of the circle of fifths at a given angular position.
 * Includes the ring background sectors, radial lines, key names, staff, etc.
 * 
 * @param {Object} options
 * @param {number} options.sliceIndex - Which SLICES[] entry to use for data (0-11)
 * @param {number} options.position - Angular position on the circle (0 = top/-90°, 1 = +30°, -1 = -30°, etc.)
 * @param {Object} options.config - Circle geometry config (centerX, centerY, radii, etc.)
 * @param {Object} [options.show] - What parts to draw
 * @param {boolean} [options.show.major=true] - Draw major ring content (key name, leading tone)
 * @param {boolean} [options.show.minor=true] - Draw minor ring content (key name, leading tone)
 * @param {boolean} [options.show.staff=true] - Draw the staff with accidentals
 * @param {boolean} [options.show.radialLine=true] - Draw the left radial boundary line
 * @param {boolean} [options.show.leadingTones=true] - Draw leading tone labels
 * @param {boolean} [options.show.background=true] - Draw the ring background sectors
 * @returns {string} SVG markup for this slice
 */
export function drawSlice({
  sliceIndex,
  position,
  config,
  show = {}
}) {
  const {
    centerX, centerY,
    outerRadius, middleRadius, innerRadius,
    staffRadius, majorRadius, minorRadius
  } = config;

  const showMajor = show.major !== false;
  const showMinor = show.minor !== false;
  const showStaff = show.staff !== false;
  const showRadialLine = show.radialLine !== false;
  const showLeadingTones = show.leadingTones !== false;
  const showBackground = show.background !== false;
  // Background can be drawn for a ring even if the text content is hidden
  const showMajorBg = show.majorBg !== undefined ? show.majorBg : showMajor;
  const showMinorBg = show.minorBg !== undefined ? show.minorBg : showMinor;

  const slice = SLICES[sliceIndex];
  const angleDeg = -90 + position * 30;
  const angleRad = angleDeg * DEG;
  const acc = slice.accidentals;

  const startDeg = angleDeg - 15;
  const endDeg = angleDeg + 15;

  const parts = [];

  // Ring background sectors
  if (showBackground) {
    // Outer ring sector
    if (showMajorBg) {
      parts.push(`<path d="${sectorPath(centerX, centerY, middleRadius, outerRadius, startDeg, endDeg)}" class="ring-outer"/>`);
    }
    // Inner ring sector (middle band)
    if (showMinorBg) {
      parts.push(`<path d="${sectorPath(centerX, centerY, innerRadius, middleRadius, startDeg, endDeg)}" class="ring-middle"/>`);
      // Hatching overlay for minor ring (secondary indicator for color-blind users)
      parts.push(`<path d="${sectorPath(centerX, centerY, innerRadius, middleRadius, startDeg, endDeg)}" fill="url(#minor-hatch)" stroke="none"/>`);
    }
    // Center area (no stroke — just fill to avoid white gaps)
    parts.push(`<path d="${sectorPath(centerX, centerY, 0, innerRadius, startDeg, endDeg)}" class="ring-inner"/>`);
  }

  // Left radial boundary line
  if (showRadialLine) {
    const bRad = startDeg * DEG;
    const x1 = centerX + innerRadius * Math.cos(bRad);
    const y1 = centerY + innerRadius * Math.sin(bRad);
    const x2 = centerX + outerRadius * Math.cos(bRad);
    const y2 = centerY + outerRadius * Math.sin(bRad);
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="radial-line"/>`);
  }

  // Staff with accidentals (outside the outer ring)
  if (showStaff) {
    const staffCx = centerX + staffRadius * Math.cos(angleRad);
    const staffCy = centerY + staffRadius * Math.sin(angleRad);

    if (slice.enharmonic) {
      const leftAcc = renderAccidentals(acc);
      const absAcc = Math.abs(acc);
      const rightCount = absAcc === 6 ? -acc : (acc > 0 ? -(12 - absAcc) : (12 - absAcc));
      const rightAcc = renderAccidentals(rightCount);
      const label = acc === 5 ? '5♯/7♭' : acc === -5 ? '5♭/7♯' : acc === 6 ? '6♯/6♭' : `${Math.abs(acc)}♯/${Math.abs(acc)}♭`;
      parts.push(renderStaffGroup(staffCx - 45, staffCy, leftAcc));
      parts.push(renderStaffGroup(staffCx + 45, staffCy, rightAcc));
      parts.push(`<text x="${staffCx}" y="${staffCy - 35}" class="accidental-count">${label}</text>`);
    } else {
      const accidentals = renderAccidentals(acc);
      parts.push(renderStaffGroup(staffCx, staffCy, accidentals));
      parts.push(`<text x="${staffCx}" y="${staffCy - 30}" class="accidental-count">${renderAccidentalLabel(acc)}</text>`);
    }
  }

  // Major ring content (outer ring)
  if (showMajor) {
    const majX = centerX + majorRadius * Math.cos(angleRad);
    const majY = centerY + majorRadius * Math.sin(angleRad);
    parts.push(`<text x="${majX}" y="${majY + 5}" class="major-key">${slice.major}</text>`);
    if (showLeadingTones) {
      const firstMajor = slice.enharmonic ? slice.major.split('/')[0] : slice.major;
      const leadingMajor = getLeadingTone(firstMajor, true);
      parts.push(`<text x="${majX}" y="${majY + 24}" class="leading-tone">(${leadingMajor})</text>`);
    }
  }

  // Minor ring content (inner ring)
  if (showMinor) {
    const minX = centerX + minorRadius * Math.cos(angleRad);
    const minY = centerY + minorRadius * Math.sin(angleRad);
    parts.push(`<text x="${minX}" y="${minY + 5}" class="minor-key">${slice.minor}</text>`);
    if (showLeadingTones) {
      const leadingMinor = getLeadingTone(slice.minor, false);
      parts.push(`<text x="${minX}" y="${minY + 24}" class="leading-tone">(${leadingMinor})</text>`);
    }
  }

  return parts.join('');
}

// ─── Full circle build ────────────────────────────────────────────────────────

export function buildStyleBlock() {
  return `<style>
    .major-key { fill: var(--color-major, #8B0000); font-family: Georgia, serif; font-size: 23px; font-weight: 700; text-anchor: middle; }
    .minor-key { fill: var(--color-minor, #2E6B2E); font-family: Georgia, serif; font-size: 19px; text-anchor: middle; }
    .leading-tone { fill: var(--color-text-muted, #666); font-family: Georgia, serif; font-size: 11px; text-anchor: middle; }
    .accidental-count { fill: var(--color-text-faint, #444); font-family: Georgia, serif; font-size: 13px; text-anchor: middle; }
    .clef { fill: var(--color-text-secondary, #555); font-family: serif; font-size: 40px; text-anchor: start; }
    .accidental { fill: var(--color-text-primary, #000); font-family: Georgia, serif; font-size: 10px; font-weight: 700; text-anchor: middle; }
    .staff-line { fill: var(--color-border-dark, #888); height: 0.8px; }
    .ring-outer { fill: var(--color-surface-parchment, #f4f2ec); stroke: var(--color-border-medium, #bbb); stroke-width: 1.2; }
    .ring-middle { fill: var(--color-surface-parchment-dark, #dedad0); stroke: var(--color-border-dark, #aaa); stroke-width: 1.5; }
    .ring-inner { fill: var(--color-surface-card, #fff); stroke: none; }
    .ring-border { fill: none; stroke: var(--color-border-ring, #999); stroke-width: 1; }
    .radial-line { stroke: var(--color-border-dark, #aaa); stroke-width: 1.2; }
    .label-majeur { fill: var(--color-major, #8B0000); font-family: Georgia, serif; font-size: 15px; font-weight: 700; font-style: italic; text-anchor: middle; }
    .label-mineur { fill: var(--color-minor, #2E6B2E); font-family: Georgia, serif; font-size: 15px; font-weight: 700; font-style: italic; text-anchor: middle; }
    .label-naturel { fill: var(--color-text-muted, #4d4b4b); font-family: Georgia, serif; font-size: 18px; text-anchor: middle; dominant-baseline: central; }
    .arrow-path { fill: none; stroke: var(--color-text-muted, #4d4b4b); stroke-width: 1.6; stroke-dasharray: 4 4; }
    .arrow-label { fill: var(--color-text-muted, #4d4b4b); font-family: Georgia, serif; font-size: 14px; font-style: italic; letter-spacing: 0.3px; text-anchor: middle; }
    #arrowRed path { fill: none; stroke: var(--color-text-muted, #4d4b4b); stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.2; }
    .highlight-neighbor { fill: var(--color-highlight-major, rgba(139, 0, 0, 0.14)); transition: opacity 180ms ease-in-out; }
    .highlight-major { fill: var(--color-highlight-major, rgba(139, 0, 0, 0.25)); }
    .highlight-minor { fill: var(--color-highlight-minor, rgba(46, 107, 46, 0.22)); }
    .roman-numeral { font-family: Georgia, serif; font-weight: 700; text-anchor: middle; dominant-baseline: central; pointer-events: none; }
    .roman-numeral--major { fill: var(--color-major, #8B0000); }
    .roman-numeral--minor { fill: var(--color-minor, #2E6B2E); }
    .roman-numeral--outer { font-size: 15px; }
    .roman-numeral--inner { font-size: 13px; }
    .center-key-name { font-family: Georgia, serif; font-size: 32px; font-weight: 700; text-anchor: middle; dominant-baseline: central; pointer-events: none; }
    .center-key-type { font-family: Georgia, serif; font-size: 16px; font-style: italic; text-anchor: middle; dominant-baseline: central; pointer-events: none; }
    .fade-in { animation: fadeIn 220ms ease forwards; }
    @keyframes fadeIn { from { opacity: 0; } }
  </style>`;
}

export function buildSVG(options = {}) {
  const config = Object.assign({}, DEFAULT_CONFIG, options);
  const { width, height, centerX, centerY, outerRadius, middleRadius, innerRadius } = config;

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="circle-title circle-desc">`);
  parts.push(`<title id="circle-title">Cercle des quintes</title>`);
  parts.push(`<desc id="circle-desc">Diagramme interactif du cercle des quintes montrant 12 tonalités majeures et 12 tonalités mineures avec leurs armures</desc>`);
  parts.push(buildStyleBlock());
  parts.push(`<defs>
    <marker id="arrowRed" markerHeight="7" markerWidth="7" orient="auto" refX="8" refY="5" viewBox="0 0 10 10">
      <path d="m2,1l6,4l-6,4"/>
    </marker>
    <pattern id="minor-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--color-border-dark, #aaa)" stroke-width="0.8" stroke-opacity="0.4"/>
    </pattern>
  </defs>`);

  // Ring backgrounds are now drawn by each slice as sectors
  // (For the full circle, 12 sectors = complete rings)
  // Add inner circle border (the center area boundary)
  parts.push(`<circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" fill="none" class="ring-border"/>`);

  // Center labels (ring type indicators)
  parts.push(`<text x="${centerX}" y="${centerY - 302}" class="label-majeur">Majeur</text>`);
  parts.push(`<text x="${centerX}" y="${centerY + 65}" class="label-mineur">Mineur</text>`);
  parts.push(`<text x="${centerX}" y="${centerY - 198}" class="label-naturel">♮</text>`);

  // Draw all 12 slices (each draws its own background sector)
  for (let i = 0; i < 12; i++) {
    parts.push(drawSlice({ sliceIndex: i, position: i, config }));
  }

  // Arrow decoration
  parts.push(`<path d="M 475 235 C 465 268, 465 292, 480 310" class="arrow-path" marker-end="url(#arrowRed)"/>`);
  parts.push(`<text class="arrow-label" transform="translate(460,269) rotate(-95)">tierce mineure</text>`);

  parts.push('</svg>');
  return parts.join('');
}

export function renderCircle(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found.`);
    return;
  }
  container.innerHTML = buildSVG(options);
}

export function getCircleLayout(options = {}) {
  const config = Object.assign({}, DEFAULT_CONFIG, options);
  const { centerX, centerY, outerRadius, middleRadius, innerRadius, staffRadius, majorRadius, minorRadius } = config;
  const anglesDeg = Array.from({ length: SLICES.length }, (_, i) => -90 + i * 30);
  const angles = anglesDeg.map(d => d * DEG);
  const positions = angles.map(angle => ({
    angleRad: angle,
    angleDeg: angle / DEG,
    major: { x: centerX + majorRadius * Math.cos(angle), y: centerY + majorRadius * Math.sin(angle) },
    minor: { x: centerX + minorRadius * Math.cos(angle), y: centerY + minorRadius * Math.sin(angle) },
    staff: { x: centerX + staffRadius * Math.cos(angle), y: centerY + staffRadius * Math.sin(angle) }
  }));
  return { config: { centerX, centerY, outerRadius, middleRadius, innerRadius, staffRadius, majorRadius, minorRadius }, anglesDeg, positions };
}
