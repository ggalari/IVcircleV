/**
 * Context menu — right-click on key labels to show/hide neighbor overlay.
 * All event binding is programmatic — no inline onclick handlers.
 */

import { showNeighbors, clearNeighbors } from '../overlays/neighbors.js';
import { get } from '../state.js';

/** @type {{ index: number, type: "major" | "minor" } | null} */
let currentKeyInfo = null;

/**
 * Resolve the circle-of-fifths index of a clicked key label element.
 * Finds the element among its sibling labels (major-key or minor-key)
 * and returns its positional index (0–11).
 * @param {Element} target - The clicked text element
 * @returns {number} Index 0–11, or -1 if not found
 */
function resolveKeyIndex(target) {
  const svg = document.querySelector('#circle-container svg');
  if (!svg || !target) return -1;
  const isMinor = target.classList && target.classList.contains('minor-key');
  const selector = isMinor ? 'text.minor-key' : 'text.major-key';
  const labels = Array.from(svg.querySelectorAll(selector));
  const targetText = target.textContent.trim();
  const idx = labels.findIndex(t => t.textContent.trim() === targetText);
  return idx >= 0 ? idx : -1;
}

/**
 * Position and show the context menu at the given coordinates.
 * Disables the "Clear neighbors" button when no overlay is active.
 * @param {number} x - clientX coordinate
 * @param {number} y - clientY coordinate
 * @param {{ index: number, type: "major" | "minor" }} keyInfo
 */
export function showContextMenu(x, y, keyInfo) {
  const menu = document.getElementById('ctx-menu');
  if (!menu) return;
  const clampedX = Math.min(x, window.innerWidth - menu.offsetWidth);
  const clampedY = Math.min(y, window.innerHeight - menu.offsetHeight);
  menu.style.left = clampedX + 'px';
  menu.style.top = clampedY + 'px';
  menu.removeAttribute('hidden');

  // Disable "Clear neighbors" when no overlay is currently displayed
  const clearBtn = menu.querySelector('[data-action="clear"]');
  if (clearBtn) {
    clearBtn.disabled = !get('overlayActive');
  }

  currentKeyInfo = keyInfo;
}

/**
 * Hide the context menu.
 */
export function hideContextMenu() {
  const menu = document.getElementById('ctx-menu');
  if (!menu) return;
  menu.hidden = true;
}

/**
 * Attach all context menu event listeners:
 * - Right-click on key labels to open the menu
 * - Click outside to dismiss
 * - Button actions (show/clear neighbors)
 */
export function attachContextMenuListeners() {
  // Right-click handler on key labels
  const svg = document.querySelector('#circle-container svg');
  if (svg) {
    svg.addEventListener('contextmenu', (ev) => {
      const target = ev.target;
      if (!target || !target.classList) return;
      if (target.classList.contains('major-key') || target.classList.contains('minor-key')) {
        ev.preventDefault();
        const type = target.classList.contains('minor-key') ? 'minor' : 'major';
        const index = resolveKeyIndex(target);
        if (index === -1) return;
        showContextMenu(ev.clientX, ev.clientY, { index, type });
      }
    });
  }

  // Click outside to dismiss
  document.addEventListener('click', (event) => {
    const menu = document.getElementById('ctx-menu');
    if (!menu) return;
    if (!menu.hidden && !menu.contains(event.target)) {
      hideContextMenu();
    }
  });

  // Context menu button actions
  const ctxMenu = document.getElementById('ctx-menu');
  if (ctxMenu) {
    ctxMenu.addEventListener('click', (event) => {
      const action = event.target.getAttribute('data-action');
      if (!action) return;
      if (event.target.disabled) return;
      if (action === 'show') {
        if (currentKeyInfo) {
          showNeighbors(currentKeyInfo);
          hideContextMenu();
        }
      } else if (action === 'clear') {
        clearNeighbors();
        hideContextMenu();
      }
    });
  }
}
