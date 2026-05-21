// Scale Explorer View — third mode panel (mode 2).
// Displays 4 scales for the active key using abcjs.

import { subscribe, get } from '../state.js';
import { getAllScales } from '../theory/scales.js';
import { SLICES } from '../circle/keys.js';
import { renderScaleStaff, getSingleNoteName } from './staff-renderer.js';
import { renderCircleZoom } from './circle-zoom.js';

/**
 * Get the display name for the active key.
 */
function getKeyDisplayName(activeKey) {
  const slice = SLICES[((activeKey.index % 12) + 12) % 12];
  const name = activeKey.type === 'major' ? slice.major : slice.minor;
  const typeLabel = activeKey.type === 'major' ? 'Major' : 'Minor';
  return `${name} ${typeLabel}`;
}

/**
 * Get unique note labels for a scale (no repetition, single name with accidentals).
 * @param {Object} scale - ScaleResult object
 * @returns {string[]} Array of note labels
 */
function getScaleNoteLabels(scale) {
  return scale.notes.map(note => getSingleNoteName(note));
}

/**
 * Render the scale explorer content.
 */
function renderScales(panel, activeKey) {
  const scales = getAllScales(activeKey.index, activeKey.type);
  const keyName = getKeyDisplayName(activeKey);

  // Clear panel
  panel.innerHTML = '';

  // Title
  const title = document.createElement('h2');
  title.className = 'scale-explorer-title';
  title.textContent = `${keyName} — Scales`;
  panel.appendChild(title);

  // Zoomed circle
  const zoomEl = renderCircleZoom(activeKey);
  panel.appendChild(zoomEl);

  // Render each scale
  const scalesContainer = document.createElement('div');
  scalesContainer.className = 'scale-explorer-content';

  scales.forEach(scale => {
    const scaleDiv = document.createElement('div');
    scaleDiv.className = 'scale-staff-container';

    renderScaleStaff(scaleDiv, {
      sliceIndex: activeKey.index,
      keyType: activeKey.type,
      scale,
      noteLabels: getScaleNoteLabels(scale)
    });

    scalesContainer.appendChild(scaleDiv);
  });

  panel.appendChild(scalesContainer);
}

/**
 * Initialize the Scale Explorer View.
 */
export function initScaleExplorerView(panel) {
  const activeKey = get('activeKey') || { index: 0, type: 'major' };
  renderScales(panel, activeKey);

  const unsubscribe = subscribe('activeKey', (newKey) => {
    if (newKey) {
      renderScales(panel, newKey);
    }
  });

  return unsubscribe;
}
