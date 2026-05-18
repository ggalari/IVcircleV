// src/circle/renderer.js
// SVG rendering for the Circle of Fifths

import { SLICES, SHARPS_ORDER, FLATS_ORDER, getLeadingTone } from './keys.js';
import { DEFAULT_CONFIG } from './geometry.js';

const DEG = Math.PI / 180;

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
  const accidentalLeftOffset = 14;
  const accidentalSpacing = 7;
  if (acc === 0) {
    return '';
  }

  const order = acc > 0 ? SHARPS_ORDER : FLATS_ORDER;
  const count = Math.abs(acc);
  return Array.from({ length: count }, (_, index) => {
    const symbol = order[index];
    const x = accidentalLeftOffset + index * accidentalSpacing;
    const y = symbol.y + 3.5;
    return `<text class="accidental" x="${x}" y="${y}">${symbol.name}</text>`;
  }).join('');
}

function renderStaffGroup(cx, cy, content) {
  return `
      <g transform="translate(${cx - 32}, ${cy - 10})">
        ${renderStaffLines()}
        <text class="clef" x="-11" y="20">𝄞</text>
        ${content}
      </g>
    `;
}

function renderAccidentalLabel(acc) {
  if (acc === 0) {
    return '';
  }
  return `${Math.abs(acc)}${acc > 0 ? '♯' : '♭'}`;
}

function buildStyleBlock() {
  return `
      <style>
        .major-key { fill: #8B0000; font-family: Georgia, serif; font-size: 23px; font-weight: 700; text-anchor: middle; }
        .minor-key { fill: #2E6B2E; font-family: Georgia, serif; font-size: 19px; text-anchor: middle; }
        .leading-tone { fill: #666; font-family: Georgia, serif; font-size: 11px; text-anchor: middle; }
        .accidental-count { fill: #444; font-family: Georgia, serif; font-size: 13px; text-anchor: middle; }
        .clef { fill: #555; font-family: serif; font-size: 40px; text-anchor: start; }
        .accidental { fill: #000; font-family: Georgia, serif; font-size: 10px; font-weight: 700; text-anchor: middle; }
        .staff-line { fill: #888; height: 0.8px; }
        .ring-outer { fill: #f4f2ec; stroke: #bbb; stroke-width: 1.2; }
        .ring-middle { fill: #dedad0; stroke: #aaa; stroke-width: 1.5; }
        .ring-inner { fill: #f4f2ec; stroke: #999; stroke-width: 1; }
        .radial-line { stroke: #aaa; stroke-width: 1.2; }
        .label-majeur { fill: #8B0000; font-family: Georgia, serif; font-size: 15px; font-weight: 700; font-style: italic; text-anchor: middle; }
        .label-mineur { fill: #2E6B2E; font-family: Georgia, serif; font-size: 15px; font-weight: 700; font-style: italic; text-anchor: middle; }
        .label-naturel { fill: #4d4b4b; font-family: Georgia, serif; font-size: 18px; text-anchor: middle; dominant-baseline: central; }
        .arrow-path { fill: none; stroke: #4d4b4b; stroke-width: 1.6; stroke-dasharray: 4 4; }
        .arrow-label { fill: #4d4b4b; font-family: Georgia, serif; font-size: 14px; font-style: italic; letter-spacing: 0.3px; text-anchor: middle; }
        #arrowRed path { fill: none; stroke: #4d4b4b; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.2; }
      </style>
    `;
}

function buildArrow() {
  return `
      <path d="M 475 235 C 465 268, 465 292, 480 310" class="arrow-path" marker-end="url(#arrowRed)"/>
      <text class="arrow-label" transform="translate(460,269) rotate(-95)">tierce mineure</text>
    `;
}

export function buildSVG(options = {}) {
  const config = Object.assign({}, DEFAULT_CONFIG, options);
  const {
    width,
    height,
    centerX,
    centerY,
    outerRadius,
    middleRadius,
    innerRadius,
    staffRadius,
    majorRadius,
    minorRadius
  } = config;

  const angles = Array.from({ length: SLICES.length }, (_, index) => (-90 + index * 30) * DEG);
  const positions = angles.map(angle => ({
    cx: centerX + staffRadius * Math.cos(angle),
    cy: centerY + staffRadius * Math.sin(angle)
  }));

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`);
  parts.push(buildStyleBlock());
  parts.push(`
      <defs>
        <marker id="arrowRed" markerHeight="7" markerWidth="7" orient="auto" refX="8" refY="5" viewBox="0 0 10 10">
          <path d="m2,1l6,4l-6,4"/>
        </marker>
      </defs>
      <circle cx="${centerX}" cy="${centerY}" r="${outerRadius}" class="ring-outer"/>
      <circle cx="${centerX}" cy="${centerY}" r="${middleRadius}" class="ring-middle"/>
      <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" class="ring-inner"/>
    `);

  angles.forEach((_, index) => {
    const boundaryDeg = -90 + 15 + index * 30;
    const angleRad = boundaryDeg * DEG;
    const x1 = centerX + innerRadius * Math.cos(angleRad);
    const y1 = centerY + innerRadius * Math.sin(angleRad);
    const x2 = centerX + outerRadius * Math.cos(angleRad);
    const y2 = centerY + outerRadius * Math.sin(angleRad);
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="radial-line" />`);
  });

  parts.push(`
      <text x="${centerX}" y="${centerY - 302}" class="label-majeur">Majeur</text>
      <text x="${centerX}" y="${centerY}" class="label-mineur">Mineur</text>
      <text x="${centerX}" y="${centerY - 198}" class="label-naturel">♮</text>
    `);

  SLICES.forEach((slice, index) => {
    const pos = positions[index];
    const angleRad = angles[index];
    const acc = slice.accidentals;

    if (slice.enharmonic) {
      const leftAccidentals = renderAccidentals(acc);
      const rightAccidentals = renderAccidentals(-acc);
      const label = acc === 5 ? '5♯/7♭' : acc === -5 ? '5♭/7♯' : acc === 6 ? '6♯/6♭' : `${Math.abs(acc)}♯/${Math.abs(acc)}♭`;
      const leftCx = pos.cx - 45;
      const rightCx = pos.cx + 45;
      parts.push(renderStaffGroup(leftCx, pos.cy, leftAccidentals));
      parts.push(renderStaffGroup(rightCx, pos.cy, rightAccidentals));
      parts.push(`<text x="${pos.cx}" y="${pos.cy - 35}" class="accidental-count">${label}</text>`);
    } else {
      const accidentals = renderAccidentals(acc);
      parts.push(renderStaffGroup(pos.cx, pos.cy, accidentals));
      parts.push(`<text x="${pos.cx}" y="${pos.cy - 30}" class="accidental-count">${renderAccidentalLabel(acc)}</text>`);
    }

    const majX = centerX + majorRadius * Math.cos(angleRad);
    const majY = centerY + majorRadius * Math.sin(angleRad);
    const minX = centerX + minorRadius * Math.cos(angleRad);
    const minY = centerY + minorRadius * Math.sin(angleRad);

    parts.push(`<text x="${majX}" y="${majY + 5}" class="major-key">${slice.major}</text>`);
    parts.push(`<text x="${minX}" y="${minY + 5}" class="minor-key">${slice.minor}</text>`);

    const firstMajor = slice.enharmonic ? slice.major.split('/')[0] : slice.major;
    const leadingMajor = getLeadingTone(firstMajor, true);
    const leadingMinor = getLeadingTone(slice.minor, false);
    parts.push(`<text x="${majX}" y="${majY + 24}" class="leading-tone">(${leadingMajor})</text>`);
    parts.push(`<text x="${minX}" y="${minY + 24}" class="leading-tone">(${leadingMinor})</text>`);
  });

  parts.push(buildArrow());
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
  const {
    centerX,
    centerY,
    outerRadius,
    middleRadius,
    innerRadius,
    staffRadius,
    majorRadius,
    minorRadius
  } = config;
  const anglesDeg = Array.from({ length: SLICES.length }, (_, index) => -90 + index * 30);
  const angles = anglesDeg.map(d => d * DEG);
  const positions = angles.map(angle => ({
    angleRad: angle,
    angleDeg: angle / DEG,
    major: { x: centerX + majorRadius * Math.cos(angle), y: centerY + majorRadius * Math.sin(angle) },
    minor: { x: centerX + minorRadius * Math.cos(angle), y: centerY + minorRadius * Math.sin(angle) },
    staff: { x: centerX + staffRadius * Math.cos(angle), y: centerY + staffRadius * Math.sin(angle) }
  }));
  return {
    config: {
      centerX,
      centerY,
      outerRadius,
      middleRadius,
      innerRadius,
      staffRadius,
      majorRadius,
      minorRadius
    },
    anglesDeg,
    positions
  };
}
