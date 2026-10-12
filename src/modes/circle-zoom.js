// Circle zoom — builds a partial circle showing ONLY the diatonic neighbor slices.
// For major key: 3 complete slices (IV, I, V) + 1 minor-only slice (vii°)
// For minor key: 3 complete slices (iv, i, v) + 1 major-only slice (ii°)
// Uses the same drawSlice() routine as the full circle.

import { DEFAULT_CONFIG, sectorPath } from '../circle/geometry.js';
import { drawSlice, buildStyleBlock } from '../circle/renderer.js';
import { getNeighborhood, neighborhoodSector, neighborhoodLabelPoint } from '../overlays/neighborhood.js';
import { getCenterLabelSetting } from '../overlays/neighbors.js';
import { set } from '../state.js';

const DEG = Math.PI / 180;

/**
 * Get the slices to draw in the zoom, with show options for each.
 * For major key:
 *   position -1: FA/ré — complete (IV/ii)
 *   position  0: DO/la — complete (I/vi)
 *   position +1: SOL/mi — complete (V/iii)
 *   position +2: only minor ring (si = vii°)
 * For minor key:
 *   position -1: complete (VI/iv)
 *   position  0: complete (III/i)
 *   position +1: complete (VII/v)
 *   position -2: only outer ring (ii°)
 */
function getZoomSlices(activeKeyIndex, activeKeyType) {
  const slices = [];

  // 3 complete slices: positions -1, 0, +1
  for (let offset = -1; offset <= 1; offset++) {
    slices.push({
      sliceIndex: ((activeKeyIndex + offset) % 12 + 12) % 12,
      position: offset,
      show: {
        major: true,
        minor: true,
        staff: true,
        radialLine: true,
        leadingTones: true,
        background: true
      }
    });
  }

  // Diminished chord slice (partial) — always at offset +2 on the inner ring
  if (activeKeyType === 'major') {
    // Position +2: only minor ring content (vii°), no outer ring background
    slices.push({
      sliceIndex: ((activeKeyIndex + 2) % 12 + 12) % 12,
      position: 2,
      show: {
        major: false,
        minor: true,
        majorBg: false,
        minorBg: true,
        staff: true,
        radialLine: false,
        leadingTones: true,
        background: true
      }
    });
  } else {
    // Position +2: only minor ring content (ii°), no outer ring background
    slices.push({
      sliceIndex: ((activeKeyIndex + 2) % 12 + 12) % 12,
      position: 2,
      show: {
        major: false,
        minor: true,
        majorBg: false,
        minorBg: true,
        staff: true,
        radialLine: false,
        leadingTones: true,
        background: true
      }
    });
  }

  return slices;
}

/**
 * Build the SVG for the neighborhood zoom view.
 */
function buildNeighborSVG(activeKey) {
  const config = DEFAULT_CONFIG;
  // Use a larger staff radius for the zoom to prevent enharmonic double staffs
  // from overlapping the outer ring
  const zoomConfig = { ...config, staffRadius: config.staffRadius + 20 };
  const { centerX, centerY, outerRadius, middleRadius, innerRadius } = config;

  const zoomSlices = getZoomSlices(activeKey.index, activeKey.type);
  const { entries, center } = getNeighborhood(activeKey);

  // Compute the arc extent
  const positions = zoomSlices.map(s => s.position);
  const minPos = Math.min(...positions);
  const maxPos = Math.max(...positions);
  const arcStartDeg = -90 + minPos * 30 - 15;
  const arcEndDeg = -90 + maxPos * 30 + 15;

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${config.width} ${config.height}" xmlns="http://www.w3.org/2000/svg">`);
  parts.push(buildStyleBlock());
  parts.push(`<defs><pattern id="minor-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="var(--color-border-dark, #aaa)" stroke-width="0.8" stroke-opacity="0.4"/></pattern></defs>`);

  // Draw slices (backgrounds + content)
  zoomSlices.forEach(({ sliceIndex, position, show }) => {
    parts.push(drawSlice({ sliceIndex, position, config: zoomConfig, show }));
  });

  // Right boundary of last slice (only spans the minor ring since dim has no outer ring)
  const lastRad = arcEndDeg * DEG;
  parts.push(`<line x1="${centerX + innerRadius * Math.cos(lastRad)}" y1="${centerY + innerRadius * Math.sin(lastRad)}" x2="${centerX + middleRadius * Math.cos(lastRad)}" y2="${centerY + middleRadius * Math.sin(lastRad)}" class="radial-line"/>`);

  // Right boundary of the position +1 slice (full height, outer ring ends here)
  const pos1EndDeg = (-90 + 1 * 30 + 15) * DEG;
  parts.push(`<line x1="${centerX + middleRadius * Math.cos(pos1EndDeg)}" y1="${centerY + middleRadius * Math.sin(pos1EndDeg)}" x2="${centerX + outerRadius * Math.cos(pos1EndDeg)}" y2="${centerY + outerRadius * Math.sin(pos1EndDeg)}" class="radial-line"/>`);

  // Draw overlay highlights (outer ring = major/red, inner ring = minor/green — matches legend)
  entries.forEach((entry) => {
    const d = neighborhoodSector(entry.position, entry.ring);
    const opacity = entry.isTonic ? 1 : 0.45;
    const stroke = entry.isTonic
      ? ` stroke="${entry.type === 'minor' ? 'var(--color-minor, #2E6B2E)' : 'var(--color-major, #8B0000)'}" stroke-width="2" stroke-opacity="0.6"`
      : '';
    parts.push(`<path d="${d}" class="highlight-${entry.type}" opacity="${opacity}"${stroke} style="pointer-events:none"/>`);
  });

  // Roman numeral labels
  entries.forEach((entry) => {
    const { x, y } = neighborhoodLabelPoint(entry.position, entry.ring);
    parts.push(`<text x="${x}" y="${y}" class="roman-numeral roman-numeral--${entry.type} roman-numeral--${entry.ring}">${entry.label}</text>`);
  });

  // Center area: card-colored background (arc only, matching visible slices) + active key label
  // Draw a sector-shaped center fill that only covers the visible arc
  const centerArcStart = -90 + minPos * 30 - 15;
  const centerArcEnd = -90 + maxPos * 30 + 15;
  const centerD = sectorPath(centerX, centerY, 0, innerRadius, centerArcStart, centerArcEnd);
  parts.push(`<path d="${centerD}" fill="var(--color-surface-card, #fff)" stroke="none"/>`);
  // Inner ring border (arc only)
  const arcStartRad = centerArcStart * DEG;
  const arcEndRad = centerArcEnd * DEG;
  const ix1 = centerX + innerRadius * Math.cos(arcStartRad);
  const iy1 = centerY + innerRadius * Math.sin(arcStartRad);
  const ix2 = centerX + innerRadius * Math.cos(arcEndRad);
  const iy2 = centerY + innerRadius * Math.sin(arcEndRad);
  parts.push(`<path d="M ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 0 1 ${ix2} ${iy2}" fill="none" stroke="var(--color-border-ring, #999)" stroke-width="1"/>`);

  if (getCenterLabelSetting()) {
    parts.push(`<text x="${centerX}" y="${centerY - 12}" class="center-key-name ${center.typeClass}">${center.keyName}</text>`);
    parts.push(`<text x="${centerX}" y="${centerY + 22}" class="center-key-type ${center.typeClass}">${center.typeLabel}</text>`);
  }

  parts.push('</svg>');
  return parts.join('');
}

/**
 * Create the zoomed circle element.
 */
export function renderCircleZoom(activeKey) {
  const container = document.createElement('div');
  container.className = 'circle-zoom';

  const svgMarkup = buildNeighborSVG(activeKey);
  container.innerHTML = svgMarkup;

  const svg = container.querySelector('svg');
  if (svg) {
    const { centerX, centerY } = DEFAULT_CONFIG;
    const zoomStaffRadius = DEFAULT_CONFIG.staffRadius + 20;

    // Compute tight crop based on actual slices shown
    const zoomSlices = getZoomSlices(activeKey.index, activeKey.type);
    const positions = zoomSlices.map(s => s.position);
    const minPos = Math.min(...positions);
    const maxPos = Math.max(...positions);

    // Include staff area for slices that have staffs
    const hasStaffSlices = zoomSlices.filter(s => s.show.staff);
    const totalRadius = hasStaffSlices.length > 0 ? zoomStaffRadius + 50 : DEFAULT_CONFIG.outerRadius + 20;

    const arcCenterDeg = -90 + ((minPos + maxPos) / 2) * 30;
    const arcSpanDeg = (maxPos - minPos + 1) * 30;

    // Crop to fit the arc tightly
    const cropPadding = 15;
    const cropTop = centerY - totalRadius - cropPadding;
    const cropBottom = centerY + DEFAULT_CONFIG.outerRadius * 0.25;
    const cropLeft = centerX - totalRadius - cropPadding;
    const cropRight = centerX + totalRadius + cropPadding;
    svg.setAttribute('viewBox', `${cropLeft} ${cropTop} ${cropRight - cropLeft} ${cropBottom - cropTop}`);

    // Click handler
    svg.style.cursor = 'pointer';
    svg.addEventListener('click', (e) => {
      const hit = hitTestZoom(e, svg, activeKey);
      if (hit) {
        set('activeKey', hit);
      }
    });
  }

  return container;
}

/**
 * Hit-test a click on the zoomed circle.
 */
function hitTestZoom(event, svgEl, activeKey) {
  const rect = svgEl.getBoundingClientRect();
  const viewBox = svgEl.getAttribute('viewBox').split(' ').map(Number);
  const [vbX, vbY, vbW, vbH] = viewBox;

  const scaleX = vbW / rect.width;
  const scaleY = vbH / rect.height;
  const svgX = vbX + (event.clientX - rect.left) * scaleX;
  const svgY = vbY + (event.clientY - rect.top) * scaleY;

  const { centerX, centerY, outerRadius, middleRadius, innerRadius } = DEFAULT_CONFIG;

  const dx = svgX - centerX;
  const dy = svgY - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Determine ring
  let ringType = null;
  if (distance >= middleRadius && distance <= outerRadius) {
    ringType = 'major';
  } else if (distance >= innerRadius && distance <= middleRadius) {
    ringType = 'minor';
  }
  if (!ringType) return null;

  // Determine position offset from angle
  let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  let relAngle = angleDeg + 90;
  relAngle = ((relAngle + 180) % 360) - 180;
  const positionOffset = Math.round(relAngle / 30);

  // Check if this position/ring combination is actually drawn
  const zoomSlices = getZoomSlices(activeKey.index, activeKey.type);
  const matchingSlice = zoomSlices.find(s => s.position === positionOffset);
  if (!matchingSlice) return null;

  // Check if the clicked ring is shown for this slice
  if (ringType === 'major' && !matchingSlice.show.major) return null;
  if (ringType === 'minor' && !matchingSlice.show.minor) return null;

  return { index: matchingSlice.sliceIndex, type: ringType };
}
