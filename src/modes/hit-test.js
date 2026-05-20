// src/modes/hit-test.js
// Hit-testing logic for key selection from tap coordinates on the circle of fifths.

import { DEFAULT_CONFIG } from '../circle/geometry.js';

const SLICE_COUNT = 12;
const SLICE_ANGLE_DEG = 360 / SLICE_COUNT; // 30°

/**
 * Determine which key (slice index and ring type) was tapped based on
 * client coordinates and the SVG element's position/size.
 *
 * @param {{ x: number, y: number }} point - Client/viewport coordinates of the tap
 * @param {SVGElement} svgElement - The SVG element containing the circle
 * @returns {{ index: number, type: 'major' | 'minor' } | null} The tapped key, or null if outside rings
 */
export function hitTestKey(point, svgElement) {
  if (!svgElement) return null;

  const { centerX, centerY, outerRadius, middleRadius, innerRadius } = DEFAULT_CONFIG;

  // Get the SVG's bounding rect in viewport coordinates
  const rect = svgElement.getBoundingClientRect();

  // Convert client coordinates to SVG coordinate space
  // The SVG viewBox is "0 0 980 980", so we scale from pixel size to viewBox size
  const viewBoxWidth = DEFAULT_CONFIG.width;
  const viewBoxHeight = DEFAULT_CONFIG.height;

  const scaleX = viewBoxWidth / rect.width;
  const scaleY = viewBoxHeight / rect.height;

  const svgX = (point.x - rect.left) * scaleX;
  const svgY = (point.y - rect.top) * scaleY;

  // Compute distance and angle from center
  const dx = svgX - centerX;
  const dy = svgY - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Determine which ring was tapped
  let ringType = null;
  if (distance >= middleRadius && distance <= outerRadius) {
    ringType = 'major';
  } else if (distance >= innerRadius && distance <= middleRadius) {
    ringType = 'minor';
  }

  // If outside both rings, ignore
  if (!ringType) return null;

  // Compute angle in degrees from the positive x-axis (standard math convention)
  // atan2 returns radians in [-π, π]
  let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  // The first slice (index 0) is centered at -90° (top of circle).
  // Each slice boundary is at -90 + 15 + index * 30 degrees.
  // So slice 0 spans from -105° to -75°.
  // Normalize angle relative to the start of slice 0: offset by +90 + 15 = +105
  // Then each 30° band maps to a slice index.
  let normalizedAngle = angleDeg + 105;

  // Normalize to [0, 360)
  normalizedAngle = ((normalizedAngle % 360) + 360) % 360;

  const sliceIndex = Math.floor(normalizedAngle / SLICE_ANGLE_DEG);

  return { index: sliceIndex, type: ringType };
}
