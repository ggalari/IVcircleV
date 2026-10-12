// Scale Explorer View — third mode panel (mode 2).
// Displays 4 scales for the active key using abcjs.

import { subscribe, get } from '../state.js';
import { getAllScales } from '../theory/scales.js';
import { SLICES } from '../circle/keys.js';
import { renderScaleStaff, getSingleNoteName } from './staff-renderer.js';
import { renderCircleZoom } from './circle-zoom.js';
import { initAudioEngine, playScale, playSingleNote, stopPlayback, isReady, getPlaybackState } from '../audio/audio-engine.js';
import { createExplorerSection } from './explorer-section.js';
import { createBouncingSphere } from '../audio/bouncing-sphere.js';
import { notesToSampleKeys } from '../theory/pitch.js';
import {
  SCALE_TEMPO_MS,
  TAP_SPHERE_VISIBLE_MS,
  TAP_SPHERE_DESTROY_DELAY_MS,
  TAP_SPHERE_OFFSET_Y,
  SOUNDING_HIGHLIGHT_MS
} from '../config.js';

/**
 * Get the display name for the active key.
 */
function getKeyDisplayName(activeKey) {
  const slice = SLICES[((activeKey.index % 12) + 12) % 12];
  const name = activeKey.type === 'major' ? slice.major : slice.minor;
  const typeLabel = activeKey.type === 'major' ? 'Majeur' : 'mineur';
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
 * Make individual note elements in a scale staff interactive (tap-to-play).
 * Adds keyboard focus, hover/focus scaling, tap playback, sounding highlight, and accessible labels.
 * @param {HTMLElement} scaleDiv - The scale-staff-container element
 * @param {Object} scale - The ScaleResult object
 */
function makeNoteElementsInteractive(scaleDiv, scale) {
  const staffDiv = scaleDiv.querySelector('.abcjs-staff');
  if (!staffDiv) return;

  const noteElements = staffDiv.querySelectorAll('.abcjs-note');
  if (!noteElements.length) return;

  // Pre-compute sample keys for correct octave assignment
  const sampleKeys = notesToSampleKeys(scale.notes, scale.staffPositions, 3);

  noteElements.forEach((noteEl, i) => {
    // Only process notes that correspond to scale.notes entries
    if (i >= scale.notes.length) return;

    const noteName = getSingleNoteName(scale.notes[i]);
    const sampleKey = sampleKeys[i]; // Correct octave for this note position

    // Accessibility attributes
    noteEl.setAttribute('aria-label', noteName);
    noteEl.setAttribute('tabindex', '0');
    noteEl.setAttribute('role', 'button');
    noteEl.style.cursor = 'pointer';

    // Ensure minimum 44×44px tap target via a transparent hit area overlay
    // SVG note elements are often small, so expand them using padding on a wrapping group
    noteEl.style.padding = '12px';
    noteEl.style.margin = '-12px';
    // For SVG elements, overflow may clip, so also add a pointer-events expansion
    noteEl.style.pointerEvents = 'all';

    // Transition for hover/focus scale
    noteEl.style.transition = 'transform 150ms ease, filter 200ms ease-out';
    noteEl.style.transformOrigin = 'center';
    noteEl.style.transformBox = 'fill-box';

    // Hover/focus: apply 1.15× scale transform
    noteEl.addEventListener('mouseenter', () => {
      noteEl.style.transform = 'scale(1.15)';
    });
    noteEl.addEventListener('focus', () => {
      noteEl.style.transform = 'scale(1.15)';
    });
    noteEl.addEventListener('mouseleave', () => {
      if (!noteEl.dataset.sounding) {
        noteEl.style.transform = '';
      }
    });
    noteEl.addEventListener('blur', () => {
      if (!noteEl.dataset.sounding) {
        noteEl.style.transform = '';
      }
    });

    // Click/keyboard handler for tap playback
    const handleActivate = async () => {
      // Init audio if needed
      if (!isReady()) {
        await initAudioEngine();
      }
      if (!isReady()) return;

      // Stop any current sequence playback
      stopPlayback();

      // Play the single note with correct octave
      playSingleNote(noteName, sampleKey);

      // Show bouncing sphere at this element's position for 400ms
      showTapSphere(staffDiv, noteEl);

      // Apply "sounding" highlight (glow)
      applySoundingHighlight(noteEl);
    };

    noteEl.addEventListener('click', handleActivate);
    noteEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleActivate();
      }
    });
  });
}

/**
 * Show a temporary bouncing sphere at a note element's position.
 * @param {HTMLElement} container - The staff container to position the sphere within
 * @param {Element} noteEl - The target note element
 */
function showTapSphere(container, noteEl) {
  // Ensure container has position:relative for absolute positioning
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  const sphere = createBouncingSphere(container);
  const rect = noteEl.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const x = rect.left + rect.width / 2 - containerRect.left;
  const y = rect.top - containerRect.top - TAP_SPHERE_OFFSET_Y;

  sphere.moveTo(x, y, 0);
  sphere.show();

  setTimeout(() => {
    sphere.hide();
    // Destroy after fade out completes
    setTimeout(() => sphere.destroy(), TAP_SPHERE_DESTROY_DELAY_MS);
  }, TAP_SPHERE_VISIBLE_MS);
}

/**
 * Apply the "sounding" highlight (glow) to a note element.
 * Persists for SOUNDING_HIGHLIGHT_MS, then fades out.
 * @param {Element} noteEl - The SVG note element
 */
function applySoundingHighlight(noteEl) {
  noteEl.dataset.sounding = 'true';
  noteEl.style.filter = 'drop-shadow(0 0 6px var(--color-major, #8b0000)) drop-shadow(0 0 12px var(--color-major, #8b0000))';
  noteEl.style.transform = 'scale(1.15)';

  setTimeout(() => {
    // Begin fade-out transition
    noteEl.style.transition = 'transform 150ms ease, filter 200ms ease-out';
    noteEl.style.filter = '';
    noteEl.style.transform = '';
    delete noteEl.dataset.sounding;
  }, SOUNDING_HIGHLIGHT_MS);
}

/**
 * Sync play button states with the current playback state.
 * Also hides spheres and clears highlights when playback stops.
 * @param {{ sections: Array }} context
 */
function syncPlayButtonStates(context) {
  const state = getPlaybackState();
  context.sections.forEach(s => s.setPlaying(state.isPlaying && state.sectionId === s.sectionId));
  if (!state.isPlaying) {
    context.sections.forEach(s => {
      s.hideSphere();
      s.clearHighlights();
    });
  }
}

/**
 * Render the scale explorer content.
 * @param {HTMLElement} panel - The panel to render into
 * @param {Object} activeKey - The active key object
 * @param {{ sections: Array }} context - Shared context tracking sections across re-renders
 */
function renderScales(panel, activeKey, context) {
  const scales = getAllScales(activeKey.index, activeKey.type);
  const keyName = getKeyDisplayName(activeKey);

  context.sections.forEach(s => s.destroy());
  context.sections = [];

  // Clear panel
  panel.innerHTML = '';

  // Title
  const title = document.createElement('h2');
  title.className = 'scale-explorer-title';
  title.textContent = `${keyName} — Gammes`;
  panel.appendChild(title);

  // Zoomed circle
  const zoomEl = renderCircleZoom(activeKey);
  panel.appendChild(zoomEl);

  // Render each scale
  const scalesContainer = document.createElement('div');
  scalesContainer.className = 'scale-explorer-content';

  scales.forEach(scale => {
    const sectionId = `scale-${scale.name}`;

    const section = createExplorerSection({
      className: 'scale-staff-container',
      sectionId,
      tempo: SCALE_TEMPO_MS,
      ariaLabel: `Jouer la gamme ${scale.name.toLowerCase()}`,
      rowClassName: 'scale-staff-row',
      renderStaff: (el) => renderScaleStaff(el, {
        sliceIndex: activeKey.index,
        keyType: activeKey.type,
        scale,
        noteLabels: getScaleNoteLabels(scale)
      }),
      play: ({ onStart, onComplete }) => playScale(
        sectionId,
        scale,
        SCALE_TEMPO_MS,
        { onNoteStart: onStart, onComplete }
      )
    });

    // Buttons are always enabled — audio engine initializes lazily on first play
    section.playButton.setDisabled(false);

    // Make individual note elements interactive (tap-to-play)
    makeNoteElementsInteractive(section.element, scale);

    context.sections.push(section);
    scalesContainer.appendChild(section.element);
  });

  panel.appendChild(scalesContainer);

  // Sync button states with current playback state
  syncPlayButtonStates(context);
}

/**
 * Initialize the Scale Explorer View.
 */
export function initScaleExplorerView(panel) {
  // Shared context for tracking sections across re-renders
  const context = {
    sections: []
  };

  const activeKey = get('activeKey') || { index: 0, type: 'major' };
  renderScales(panel, activeKey, context);

  const unsubKey = subscribe('activeKey', (newKey) => {
    if (newKey) {
      renderScales(panel, newKey, context);
    }
  });

  const unsubLabel = subscribe('labelToggle', () => {
    const key = get('activeKey') || { index: 0, type: 'major' };
    renderScales(panel, key, context);
  });

  // Subscribe to playback state changes to update button icons
  const unsubPlayback = subscribe('playbackState', () => {
    syncPlayButtonStates(context);
  });

  return () => {
    unsubKey();
    unsubLabel();
    unsubPlayback();
    // Clean up sections (play buttons and bouncing spheres)
    context.sections.forEach(s => s.destroy());
    context.sections = [];
  };
}
