/**
 * Key interaction — long-press or right-click on key areas to toggle
 * diatonic neighbor overlay directly (no menu).
 *
 * Uses invisible hit-area sectors (full 30° wedges) for reliable touch
 * targeting on mobile, rather than tiny text labels.
 */

import { showNeighbors, clearNeighbors } from '../overlays/neighbors.js';
import { get } from '../state.js';
import { sectorPath, DEFAULT_CONFIG } from '../circle/geometry.js';
import { attachLongPress } from './long-press.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** @type {function[]} Long-press cleanup functions */
let longPressCleanups = [];

/**
 * Toggle the diatonic overlay for a given key.
 * If the key is already active, clear the overlay.
 * Otherwise, show neighbors for the new key.
 */
function toggleNeighbors(index, type) {
  const activeIndex = get('selectedKeyIndex');
  const activeType = get('overlayType');

  if (activeIndex === index && activeType === type) {
    clearNeighbors();
  } else {
    showNeighbors({ index, type });
  }
}

/**
 * Create invisible hit-area sectors for all 24 keys (12 major + 12 minor)
 * and attach long-press handlers to them.
 */
function createHitAreas() {
  longPressCleanups.forEach(fn => fn());
  longPressCleanups = [];

  const svg = document.querySelector('#circle-container svg');
  if (!svg) return;

  // Remove any existing hit-area group
  const existing = svg.querySelector('.hit-areas');
  if (existing) existing.remove();

  const { centerX, centerY, outerRadius, middleRadius, innerRadius } = DEFAULT_CONFIG;

  const g = document.createElementNS(SVG_NS, 'g');
  g.classList.add('hit-areas');

  for (let i = 0; i < 12; i++) {
    const startDeg = -90 + i * 30 - 15;
    const endDeg = startDeg + 30;

    // Outer ring hit area (major keys)
    const majorPath = document.createElementNS(SVG_NS, 'path');
    majorPath.setAttribute('d', sectorPath(centerX, centerY, middleRadius, outerRadius, startDeg, endDeg));
    majorPath.setAttribute('fill', 'transparent');
    majorPath.setAttribute('stroke', 'none');
    majorPath.style.cursor = 'pointer';
    majorPath.dataset.index = i;
    majorPath.dataset.type = 'major';
    g.appendChild(majorPath);

    // Inner ring hit area (minor keys)
    const minorPath = document.createElementNS(SVG_NS, 'path');
    minorPath.setAttribute('d', sectorPath(centerX, centerY, innerRadius, middleRadius, startDeg, endDeg));
    minorPath.setAttribute('fill', 'transparent');
    minorPath.setAttribute('stroke', 'none');
    minorPath.style.cursor = 'pointer';
    minorPath.dataset.index = i;
    minorPath.dataset.type = 'minor';
    g.appendChild(minorPath);

    // Attach long-press to both
    const majorCleanup = attachLongPress(majorPath, {
      threshold: 400,
      moveThreshold: 12,
      feedbackDelay: 200,
      onLongPress: () => toggleNeighbors(i, 'major'),
      onFeedbackStart: () => {},
      onCancel: () => {},
    });
    longPressCleanups.push(majorCleanup);

    const minorCleanup = attachLongPress(minorPath, {
      threshold: 400,
      moveThreshold: 12,
      feedbackDelay: 200,
      onLongPress: () => toggleNeighbors(i, 'minor'),
      onFeedbackStart: () => {},
      onCancel: () => {},
    });
    longPressCleanups.push(minorCleanup);
  }

  svg.appendChild(g);
}

/**
 * Attach all key interaction listeners:
 * - Right-click on hit areas to toggle overlay (desktop)
 * - Long-press on hit areas to toggle overlay (touch)
 */
export function attachContextMenuListeners() {
  const svg = document.querySelector('#circle-container svg');

  // Right-click handler (desktop) — works on the hit-area paths
  if (svg) {
    svg.addEventListener('contextmenu', (ev) => {
      const target = ev.target;
      if (!target || !target.dataset) return;

      // Check if it's a hit-area path or a text label
      const index = target.dataset.index !== undefined
        ? parseInt(target.dataset.index, 10)
        : resolveKeyIndexFromText(target);

      const type = target.dataset.type || getTypeFromText(target);

      if (index === -1 || !type) return;
      ev.preventDefault();
      toggleNeighbors(index, type);
    });
  }

  // Create hit areas and attach long-press
  createHitAreas();
}

/**
 * Fallback: resolve index from a text label element (for right-click on labels).
 */
function resolveKeyIndexFromText(target) {
  if (!target || !target.classList) return -1;
  if (!target.classList.contains('major-key') && !target.classList.contains('minor-key')) return -1;

  const svg = document.querySelector('#circle-container svg');
  if (!svg) return -1;

  const isMinor = target.classList.contains('minor-key');
  const selector = isMinor ? 'text.minor-key' : 'text.major-key';
  const labels = Array.from(svg.querySelectorAll(selector));
  const targetText = target.textContent.trim();
  const idx = labels.findIndex(t => t.textContent.trim() === targetText);
  return idx >= 0 ? idx : -1;
}

/**
 * Fallback: get type from a text label element.
 */
function getTypeFromText(target) {
  if (!target || !target.classList) return null;
  if (target.classList.contains('major-key')) return 'major';
  if (target.classList.contains('minor-key')) return 'minor';
  return null;
}
