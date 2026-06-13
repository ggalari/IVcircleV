// Chord Explorer View — second mode panel (mode 1).
// Displays diatonic triads and seventh chords using abcjs with w: labels.

import { get, set, subscribe } from '../state.js';
import { getDiatonicTriads, getDiatonicSevenths } from '../theory/chords.js';
import { renderChordStaff, formatChordQuality, getSingleNoteName } from './staff-renderer.js';
import { SLICES } from '../circle/keys.js';
import { renderCircleZoom } from './circle-zoom.js';
import { initAudioEngine, playChordSequence, playSingleChord, stopPlayback, isReady } from '../audio/audio-engine.js';
import { createPlayButton } from '../audio/play-button.js';
import { createBouncingSphere } from '../audio/bouncing-sphere.js';
import { CHORD_TEMPO_MS, SPHERE_NOTE_OFFSET_Y } from '../config.js';

function getKeyDisplayName(activeKey) {
  const slice = SLICES[activeKey.index];
  const name = activeKey.type === 'major' ? slice.major : slice.minor;
  const typeLabel = activeKey.type === 'major' ? 'Majeur' : 'mineur';
  return `${name} ${typeLabel}`;
}

/** French translations for chord quality, used in aria-labels */
const QUALITY_FRENCH = {
  'major': 'majeur',
  'minor': 'mineur',
  'diminished': 'diminué',
  'augmented': 'augmenté',
  'maj7': 'majeur septième',
  'min7': 'mineur septième',
  'dom7': 'septième de dominante',
  'half-dim7': 'semi-diminué'
};

/**
 * Highlight the currently sounding chord element during sequence playback.
 */
function highlightChordElement(staffEl, chordEls, index) {
  // Clear previous highlights
  chordEls.forEach(el => {
    el.style.filter = '';
    el.style.transform = '';
    el.style.transition = 'filter 150ms ease-out, transform 150ms ease-out';
  });

  // Highlight current chord
  const el = chordEls[index];
  if (el) {
    el.style.transition = 'filter 0ms, transform 0ms';
    el.style.filter = 'drop-shadow(0 0 6px var(--color-major, #8b0000)) drop-shadow(0 0 10px var(--color-major, #8b0000))';
    el.style.transform = 'scale(1.1)';
    el.style.transformOrigin = 'center';
    el.style.transformBox = 'fill-box';
  }
}

/**
 * Clear all chord highlights in a staff section.
 */
function clearChordHighlights(section) {
  const staffEl = section.querySelector('.abcjs-staff');
  if (staffEl) {
    staffEl.querySelectorAll('.abcjs-note').forEach(el => {
      el.style.filter = '';
      el.style.transform = '';
      el.style.transition = 'filter 200ms ease-out, transform 200ms ease-out';
    });
  }
}

/**
 * Make chord elements in a staff section interactive (tap-to-play).
 */
function makeChordElementsInteractive(section, chords, activeKey) {
  const staffEl = section.querySelector('.abcjs-staff');
  if (!staffEl) return;

  const chordEls = staffEl.querySelectorAll('.abcjs-note');

  chordEls.forEach((el, i) => {
    if (i >= chords.length) return;
    const chord = chords[i];

    // Accessibility attributes
    const qualityFr = QUALITY_FRENCH[chord.quality] || chord.quality;
    const label = `${chord.root} ${qualityFr}`;
    el.setAttribute('aria-label', label);
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.style.cursor = 'pointer';

    // Hover/focus scale transform
    const applyHover = () => {
      el.style.transform = 'scale(1.15)';
      el.style.transformOrigin = 'center';
      el.style.transition = 'transform 150ms ease-out';
    };
    const removeHover = () => {
      if (el.dataset.sounding !== 'true') {
        el.style.transform = '';
        el.style.transition = 'transform 150ms ease-out';
      }
    };

    el.addEventListener('mouseenter', applyHover);
    el.addEventListener('focus', applyHover);
    el.addEventListener('mouseleave', removeHover);
    el.addEventListener('blur', removeHover);

    // Click/keyboard activation handler
    const handleActivation = async (e) => {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      if (e.type === 'keydown') e.preventDefault();

      if (!isReady()) {
        await initAudioEngine();
      }

      stopPlayback();
      playSingleChord(chord, activeKey.index, activeKey.type);

      // Apply sounding highlight
      el.dataset.sounding = 'true';
      el.style.filter = 'drop-shadow(0 0 6px var(--color-major, #8b0000))';
      el.style.transform = 'scale(1.15)';
      el.style.transformOrigin = 'center';
      el.style.transition = 'filter 0ms, transform 0ms';

      setTimeout(() => {
        el.style.transition = 'filter 200ms ease-out, transform 200ms ease-out';
        el.style.filter = '';
        el.style.transform = '';
        el.dataset.sounding = 'false';
      }, 400);
    };

    el.addEventListener('click', handleActivation);
    el.addEventListener('keydown', handleActivation);
  });
}

/** @type {{ element: HTMLButtonElement, setPlaying: Function, setDisabled: Function, destroy: Function }[]} */
let playButtons = [];

/** @type {Array<{ moveTo: Function, show: Function, hide: Function, reset: Function, destroy: Function }>} */
let spheres = [];

/** @type {Function|null} */
let unsubPlaybackState = null;

function cleanupAudioControls() {
  playButtons.forEach(btn => btn.destroy());
  playButtons = [];
  spheres.forEach(s => s.destroy());
  spheres = [];
  if (unsubPlaybackState) {
    unsubPlaybackState();
    unsubPlaybackState = null;
  }
}

function renderContent(panel, activeKey) {
  const triads = getDiatonicTriads(activeKey.index, activeKey.type);
  const sevenths = getDiatonicSevenths(activeKey.index, activeKey.type);
  const keyName = getKeyDisplayName(activeKey);

  cleanupAudioControls();
  panel.innerHTML = '';

  // Title
  const title = document.createElement('h2');
  title.className = 'chord-explorer__title';
  title.textContent = `${keyName} — Accords diatoniques`;
  panel.appendChild(title);

  // Zoomed circle
  const zoomEl = renderCircleZoom(activeKey);
  panel.appendChild(zoomEl);

  // Triads
  const triadsSection = document.createElement('div');
  triadsSection.className = 'chord-explorer__staff chord-explorer__staff--triads';
  triadsSection.style.position = 'relative';

  const triadsHeader = document.createElement('div');
  triadsHeader.className = 'chord-explorer__section-header';
  const triadsSubtitle = document.createElement('h4');
  triadsSubtitle.className = 'chord-explorer__subtitle';
  triadsSubtitle.textContent = 'Triades';
  triadsHeader.appendChild(triadsSubtitle);

  // Add 8th chord (tonic repeated for resolution — octave handled by ascending sequence logic)
  const triadsWithResolution = [...triads, { ...triads[0], degree: 8 }];

  // Create bouncing sphere for triads
  const triadsSphere = createBouncingSphere(triadsSection);
  spheres.push(triadsSphere);

  const triadsPlayBtn = createPlayButton({
    ariaLabel: 'Jouer les triades',
    onPlay: async () => {
      if (!isReady()) await initAudioEngine();
      triadsSphere.reset();
      playChordSequence('chord-triads', triadsWithResolution, activeKey.index, activeKey.type, CHORD_TEMPO_MS, {
        onChordStart: (index) => {
          const staffEl = triadsSection.querySelector('.abcjs-staff');
          if (!staffEl) return;
          const chordEls = staffEl.querySelectorAll('.abcjs-note');
          highlightChordElement(staffEl, chordEls, index);
          // Position sphere above the current chord
          const chordEl = chordEls[index];
          if (chordEl) {
            const containerRect = triadsSection.getBoundingClientRect();
            const chordRect = chordEl.getBoundingClientRect();
            const x = chordRect.left - containerRect.left + chordRect.width / 2;
            const y = chordRect.top - containerRect.top - SPHERE_NOTE_OFFSET_Y;
            if (index === 0) {
              triadsSphere.show();
            }
            triadsSphere.moveTo(x, y, CHORD_TEMPO_MS);
          }
        },
        onComplete: () => {
          clearChordHighlights(triadsSection);
          triadsSphere.hide();
        }
      });
    },
    onStop: () => stopPlayback()
  });
  playButtons.push(triadsPlayBtn);

  triadsSection.appendChild(triadsHeader);
  renderChordStaff(triadsSection, {
    sliceIndex: activeKey.index,
    keyType: activeKey.type,
    chords: triadsWithResolution,
    labels: triadsWithResolution.map(c => `${c.roman}|${getSingleNoteName(c.root)}${formatChordQuality(c.quality)}`),
    names: null
  });
  makeChordElementsInteractive(triadsSection, triadsWithResolution, activeKey);

  // Wrap staff and play button in a flex row
  const triadsStaffEl = triadsSection.querySelector('.abcjs-staff');
  if (triadsStaffEl) {
    const staffRow = document.createElement('div');
    staffRow.className = 'chord-staff-row';
    triadsStaffEl.parentNode.insertBefore(staffRow, triadsStaffEl);
    staffRow.appendChild(triadsStaffEl);
    staffRow.appendChild(triadsPlayBtn.element);
  }
  panel.appendChild(triadsSection);

  // Sevenths
  const seventhsSection = document.createElement('div');
  seventhsSection.className = 'chord-explorer__staff chord-explorer__staff--sevenths';
  seventhsSection.style.position = 'relative';

  const seventhsHeader = document.createElement('div');
  seventhsHeader.className = 'chord-explorer__section-header';
  const seventhsSubtitle = document.createElement('h4');
  seventhsSubtitle.className = 'chord-explorer__subtitle';
  seventhsSubtitle.textContent = 'Accords de septième';
  seventhsHeader.appendChild(seventhsSubtitle);

  // Add 8th chord (tonic repeated for resolution — octave handled by ascending sequence logic)
  const seventhsWithResolution = [...sevenths, { ...sevenths[0], degree: 8 }];

  // Create bouncing sphere for sevenths
  const seventhsSphere = createBouncingSphere(seventhsSection);
  spheres.push(seventhsSphere);

  const seventhsPlayBtn = createPlayButton({
    ariaLabel: 'Jouer les accords de septième',
    onPlay: async () => {
      if (!isReady()) await initAudioEngine();
      seventhsSphere.reset();
      playChordSequence('chord-sevenths', seventhsWithResolution, activeKey.index, activeKey.type, CHORD_TEMPO_MS, {
        onChordStart: (index) => {
          const staffEl = seventhsSection.querySelector('.abcjs-staff');
          if (!staffEl) return;
          const chordEls = staffEl.querySelectorAll('.abcjs-note');
          highlightChordElement(staffEl, chordEls, index);
          // Position sphere above the current chord
          const chordEl = chordEls[index];
          if (chordEl) {
            const containerRect = seventhsSection.getBoundingClientRect();
            const chordRect = chordEl.getBoundingClientRect();
            const x = chordRect.left - containerRect.left + chordRect.width / 2;
            const y = chordRect.top - containerRect.top - SPHERE_NOTE_OFFSET_Y;
            if (index === 0) {
              seventhsSphere.show();
            }
            seventhsSphere.moveTo(x, y, CHORD_TEMPO_MS);
          }
        },
        onComplete: () => {
          clearChordHighlights(seventhsSection);
          seventhsSphere.hide();
        }
      });
    },
    onStop: () => stopPlayback()
  });
  playButtons.push(seventhsPlayBtn);

  seventhsSection.appendChild(seventhsHeader);
  renderChordStaff(seventhsSection, {
    sliceIndex: activeKey.index,
    keyType: activeKey.type,
    chords: seventhsWithResolution,
    labels: seventhsWithResolution.map(c => `${c.roman}|${getSingleNoteName(c.root)}${formatChordQuality(c.quality)}`),
    names: null
  });
  makeChordElementsInteractive(seventhsSection, seventhsWithResolution, activeKey);

  // Wrap staff and play button in a flex row
  const seventhsStaffEl = seventhsSection.querySelector('.abcjs-staff');
  if (seventhsStaffEl) {
    const staffRow = document.createElement('div');
    staffRow.className = 'chord-staff-row';
    seventhsStaffEl.parentNode.insertBefore(staffRow, seventhsStaffEl);
    staffRow.appendChild(seventhsStaffEl);
    staffRow.appendChild(seventhsPlayBtn.element);
  }
  panel.appendChild(seventhsSection);

  // Subscribe to playback state for button icon updates
  unsubPlaybackState = subscribe('playbackState', (state) => {
    if (!state) return;
    const { isPlaying, sectionId } = state;
    playButtons.forEach((btn, idx) => {
      const btnSectionId = idx === 0 ? 'chord-triads' : 'chord-sevenths';
      btn.setPlaying(isPlaying && sectionId === btnSectionId);
    });
    // Clear highlights and hide spheres when playback stops
    if (!isPlaying) {
      clearChordHighlights(triadsSection);
      clearChordHighlights(seventhsSection);
      spheres.forEach(s => s.hide());
    }
  });
}

export function initChordExplorerView(panel) {
  const initialKey = get('activeKey') || { index: 0, type: 'major' };
  renderContent(panel, initialKey);
  const unsubKey = subscribe('activeKey', (activeKey) => {
    renderContent(panel, activeKey);
  });
  const unsubLabel = subscribe('labelToggle', () => {
    const activeKey = get('activeKey') || { index: 0, type: 'major' };
    renderContent(panel, activeKey);
  });
  return () => {
    unsubKey();
    unsubLabel();
    cleanupAudioControls();
  };
}
