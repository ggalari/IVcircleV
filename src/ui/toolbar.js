/**
 * Toolbar actions: print, save SVG, and toggle center label.
 * All event binding is programmatic — no inline onclick handlers.
 */

import { getCenterLabelSetting, setCenterLabelSetting, showNeighbors } from '../overlays/neighbors.js';
import { get } from '../state.js';

/**
 * Clone the rendered SVG, open a new window, write it in, and trigger print.
 */
export function printCircle() {
  const svgElement = document.querySelector('#circle-container svg');
  if (!svgElement) return;

  const clone = svgElement.cloneNode(true);
  const win = window.open('', '_blank');
  if (!win) return;

  win.document.write(
    `<!DOCTYPE html><html><head><title>Circle of Fifths</title></head><body>${clone.outerHTML}</body></html>`
  );
  win.document.close();
  win.onafterprint = () => win.close();
  win.print();
  setTimeout(() => win.close(), 10000);
}

/**
 * Serialize the SVG, create a blob, and trigger download as circle_of_fifths.svg.
 */
export function saveSVG() {
  const svgElement = document.querySelector('#circle-container svg');
  if (!svgElement) return;

  const clone = svgElement.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Read dimensions from viewBox since we no longer use fixed width/height attributes
  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    const [, , vbWidth, vbHeight] = viewBox.split(/\s+/);
    clone.setAttribute('width', vbWidth);
    clone.setAttribute('height', vbHeight);
  }

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);
  svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = 'circle_of_fifths.svg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Toggle the center label setting and refresh the overlay.
 */
export function toggleCenterLabel() {
  const current = getCenterLabelSetting();
  setCenterLabelSetting(!current);
  // Refresh the overlay to show/hide the label
  const activeKey = get('activeKey');
  if (activeKey) {
    showNeighbors(activeKey);
  }
  // Update button text
  updateToggleLabelButton();
}

/**
 * Update the toggle button text to reflect current state.
 */
function updateToggleLabelButton() {
  const btn = document.getElementById('btn-toggle-label');
  if (!btn) return;
  const enabled = getCenterLabelSetting();
  btn.textContent = enabled ? '🏷️ Masquer tonalité' : '🏷️ Afficher tonalité';
}

/**
 * Attach click listeners to toolbar buttons by their IDs.
 */
export function attachToolbarListeners() {
  const saveBtn = document.getElementById('btn-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSVG);
  }

  const printBtn = document.getElementById('btn-print');
  if (printBtn) {
    printBtn.addEventListener('click', printCircle);
  }

  const toggleLabelBtn = document.getElementById('btn-toggle-label');
  if (toggleLabelBtn) {
    toggleLabelBtn.addEventListener('click', toggleCenterLabel);
    updateToggleLabelButton();
  }
}
