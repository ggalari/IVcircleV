// Scale Explorer View — third mode panel (mode 2).
// Displays 4 scales for the active key using abcjs.

import { subscribe, get, set } from '../state.js';
import { getAllScales } from '../theory/scales.js';
import { SLICES } from '../circle/keys.js';
import { renderScaleStaff, getSingleNoteName } from './staff-renderer.js';
import { renderCircleZoom } from './circle-zoom.js';
import { initAudioEngine, playScale, playSingleNote, stopPlayback, isReady, getPlaybackState } from '../audio/audio-engine.js';
import { createPlayButton } from '../audio/play-button.js';
import { createBouncingSphere } from '../audio/bouncing-sphere.js';
import { mapScaleToSampleKeys } from '../audio/pitch-mapper.js';

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
  const sampleKeys = mapScaleToSampleKeys(scale.notes, 3);

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
 * Show a temporary bouncing sphere at a note element's position for 400ms.
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
  const y = rect.top - containerRect.top - 24; // Position sphere above the note

  sphere.moveTo(x, y, 0);
  sphere.show();

  setTimeout(() => {
    sphere.hide();
    // Destroy after fade out completes
    setTimeout(() => sphere.destroy(), 100);
  }, 400);
}

/**
 * Apply the "sounding" highlight (glow) to a note element.
 * Persists for 400ms, then fades out over 200ms.
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
  }, 400);
}

/**
 * Render the scale explorer content.
 * @param {HTMLElement} panel - The panel to render into
 * @param {Object} activeKey - The active key object
 * @param {Object} context - Shared context for play buttons and tempo slider
 */
function renderScales(panel, activeKey, context) {
  const scales = getAllScales(activeKey.index, activeKey.type);
  const keyName = getKeyDisplayName(activeKey);

  // Destroy old play buttons
  context.playButtons.forEach(btn => btn.destroy());
  context.playButtons = [];

  // Destroy old bouncing spheres
  if (context.spheres) {
    context.spheres.forEach(s => s.destroy());
  }
  context.spheres = [];

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
    const scaleDiv = document.createElement('div');
    scaleDiv.className = 'scale-staff-container';
    scaleDiv.style.position = 'relative'; // Needed for absolute sphere positioning

    // Create header row with label and play button
    const headerRow = document.createElement('div');
    headerRow.className = 'scale-section-header';

    const sectionId = `scale-${scale.name}`;

    // Create bouncing sphere for this section
    const sphere = createBouncingSphere(scaleDiv);
    context.spheres.push(sphere);

    const playBtn = createPlayButton({
      ariaLabel: `Jouer la gamme ${scale.name.toLowerCase()}`,
      onPlay: async () => {
        if (!isReady()) {
          await initAudioEngine();
          // Enable all buttons once ready
          if (isReady()) {
            context.playButtons.forEach(b => b.setDisabled(false));
          }
        }
        const tempo = 1000; // 1 second between notes
        playScale(sectionId, scale, tempo, {
          onNoteStart: (index) => {
            // Position sphere above the current note element
            const staffEl = scaleDiv.querySelector('.abcjs-staff');
            if (staffEl) {
              const noteEls = staffEl.querySelectorAll('.abcjs-note');
              const noteEl = noteEls[index];
              if (noteEl) {
                const containerRect = scaleDiv.getBoundingClientRect();
                const noteRect = noteEl.getBoundingClientRect();
                const x = noteRect.left - containerRect.left + noteRect.width / 2;
                // Position sphere directly above the note
                const y = noteRect.top - containerRect.top - 20;
                const currentTempo = 1000;
                if (index === 0) {
                  sphere.show();
                }
                sphere.moveTo(x, y, currentTempo);
              }
            }
          },
          onComplete: () => {
            sphere.hide();
          }
        });
      },
      onStop: () => {
        stopPlayback();
      }
    });

    // Buttons are always enabled — audio engine initializes lazily on first play
    playBtn.setDisabled(false);

    context.playButtons.push(playBtn);
    // Store sectionId on the button for state matching
    playBtn._sectionId = sectionId;

    renderScaleStaff(scaleDiv, {
      sliceIndex: activeKey.index,
      keyType: activeKey.type,
      scale,
      noteLabels: getScaleNoteLabels(scale)
    });

    // Wrap the staff and play button in a flex row so button sits at end of staff line
    const staffEl = scaleDiv.querySelector('.abcjs-staff');
    if (staffEl) {
      const staffRow = document.createElement('div');
      staffRow.className = 'scale-staff-row';
      staffEl.parentNode.insertBefore(staffRow, staffEl);
      staffRow.appendChild(staffEl);
      staffRow.appendChild(playBtn.element);
    } else {
      scaleDiv.appendChild(playBtn.element);
    }

    // Make individual note elements interactive (tap-to-play)
    makeNoteElementsInteractive(scaleDiv, scale);

    scalesContainer.appendChild(scaleDiv);
  });

  panel.appendChild(scalesContainer);

  // Sync button states with current playback state
  syncPlayButtonStates(context);
}

/**
 * Sync play button states with current playback state.
 * Also hides spheres when playback stops.
 */
function syncPlayButtonStates(context) {
  const state = getPlaybackState();
  context.playButtons.forEach(btn => {
    const isThisPlaying = state.isPlaying && state.sectionId === btn._sectionId;
    btn.setPlaying(isThisPlaying);
  });
  // Hide all spheres when playback stops
  if (!state.isPlaying && context.spheres) {
    context.spheres.forEach(s => s.hide());
  }
}

/**
 * Initialize the Scale Explorer View.
 */
export function initScaleExplorerView(panel) {
  // Shared context for tracking UI elements across re-renders
  const context = {
    playButtons: [],
    spheres: []
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
    // Clean up play buttons
    context.playButtons.forEach(btn => btn.destroy());
    context.playButtons = [];
    // Clean up bouncing spheres
    if (context.spheres) {
      context.spheres.forEach(s => s.destroy());
      context.spheres = [];
    }
  };
}
