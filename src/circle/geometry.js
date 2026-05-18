// src/circle/geometry.js
// Geometry calculations for the Circle of Fifths SVG layout

/** Degree-to-radian conversion factor */
export const DEG = Math.PI / 180;

/** Default circle dimensions and radii */
export const DEFAULT_CONFIG = {
  width: 980,
  height: 980,
  centerX: 490,
  centerY: 490,
  outerRadius: 320,
  middleRadius: 215,
  innerRadius: 110,
  staffRadius: 380,
  majorRadius: 268,
  minorRadius: 168
};

/**
 * Returns an array of angles in radians for dividing the circle into `count` slices.
 * Each angle starts at -90° (top of circle) and increments by 360/count degrees.
 * @param {number} count - Number of slices (typically 12)
 * @returns {number[]} Array of angles in radians
 */
export function getSliceAngles(count) {
  return Array.from({ length: count }, (_, i) => (-90 + i * (360 / count)) * DEG);
}

/**
 * Computes positions for each slice around the circle.
 * Returns an array of objects with major, minor, and staff coordinates.
 * @param {object} [config] - Circle configuration (defaults to DEFAULT_CONFIG)
 * @returns {Array<{major: {x: number, y: number}, minor: {x: number, y: number}, staff: {x: number, y: number}}>}
 */
export function getPositions(config = DEFAULT_CONFIG) {
  const { centerX, centerY, staffRadius, majorRadius, minorRadius } = config;
  const angles = getSliceAngles(12);
  return angles.map(angle => ({
    major: { x: centerX + majorRadius * Math.cos(angle), y: centerY + majorRadius * Math.sin(angle) },
    minor: { x: centerX + minorRadius * Math.cos(angle), y: centerY + minorRadius * Math.sin(angle) },
    staff: { x: centerX + staffRadius * Math.cos(angle), y: centerY + staffRadius * Math.sin(angle) }
  }));
}

/**
 * Generates an SVG arc path `d` string for a sector (annular wedge).
 * Used by neighbor overlay sectors.
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} innerR - Inner radius of the sector
 * @param {number} outerR - Outer radius of the sector
 * @param {number} startDeg - Start angle in degrees
 * @param {number} endDeg - End angle in degrees
 * @returns {string} SVG path `d` attribute value
 */
export function sectorPath(cx, cy, innerR, outerR, startDeg, endDeg) {
  const startRad = startDeg * DEG;
  const endRad = endDeg * DEG;

  const ox1 = cx + outerR * Math.cos(startRad);
  const oy1 = cy + outerR * Math.sin(startRad);
  const ox2 = cx + outerR * Math.cos(endRad);
  const oy2 = cy + outerR * Math.sin(endRad);
  const ix2 = cx + innerR * Math.cos(endRad);
  const iy2 = cy + innerR * Math.sin(endRad);
  const ix1 = cx + innerR * Math.cos(startRad);
  const iy1 = cy + innerR * Math.sin(startRad);

  return `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 0 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1} Z`;
}
