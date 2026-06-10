// Chord Explorer View — second mode panel (mode 1).
// Displays diatonic triads and seventh chords using abcjs with w: labels.

import { get, set, subscribe } from '../state.js';
import { getDiatonicTriads, getDiatonicSevenths } from '../theory/chords.js';
import { renderChordStaff, formatChordQuality, getSingleNoteName } from './staff-renderer.js';
import { SLICES } from '../circle/keys.js';
import { renderCircleZoom } from './circle-zoom.js';
import { initAudioEngine, playChordSequence, playSingleChord, stopPlayback, isReady } from '../audio/audio-engine.js';
import { createPlayButton } from '../audio/play-button.js';

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

/** @type {Function|null} */
let unsubPlaybackState = null;

function cleanupAudioControls() {
  playButtons.forEach(btn => btn.destroy());
  playButtons = [];
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

  const triadsHeader = document.createElement('div');
  triadsHeader.className = 'chord-explorer__section-header';
  const triadsSubtitle = document.createElement('h4');
  triadsSubtitle.className = 'chord-explorer__subtitle';
  triadsSubtitle.textContent = 'Triades';
  triadsHeader.appendChild(triadsSubtitle);

  const triadsPlayBtn = createPlayButton({
    ariaLabel: 'Jouer les triades',
    onPlay: async () => {
      if (!isReady()) await initAudioEngine();
      playChordSequence('chord-triads', triads, activeKey.index, activeKey.type, 1000, {
        onChordStart: (index) => {
          const staffEl = triadsSection.querySelector('.abcjs-staff');
          if (!staffEl) return;
          const chordEls = staffEl.querySelectorAll('.abcjs-note');
          highlightChordElement(staffEl, chordEls, index);
        },
        onComplete: () => {
          clearChordHighlights(triadsSection);
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
    chords: triads,
    labels: triads.map(c => `${c.roman}|${getSingleNoteName(c.root)}${formatChordQuality(c.quality)}`),
    names: null
  });
  makeChordElementsInteractive(triadsSection, triads, activeKey);

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

  const seventhsHeader = document.createElement('div');
  seventhsHeader.className = 'chord-explorer__section-header';
  const seventhsSubtitle = document.createElement('h4');
  seventhsSubtitle.className = 'chord-explorer__subtitle';
  seventhsSubtitle.textContent = 'Accords de septième';
  seventhsHeader.appendChild(seventhsSubtitle);

  const seventhsPlayBtn = createPlayButton({
    ariaLabel: 'Jouer les accords de septième',
    onPlay: async () => {
      if (!isReady()) await initAudioEngine();
      playChordSequence('chord-sevenths', sevenths, activeKey.index, activeKey.type, 1000, {
        onChordStart: (index) => {
          const staffEl = seventhsSection.querySelector('.abcjs-staff');
          if (!staffEl) return;
          const chordEls = staffEl.querySelectorAll('.abcjs-note');
          highlightChordElement(staffEl, chordEls, index);
        },
        onComplete: () => {
          clearChordHighlights(seventhsSection);
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
    chords: sevenths,
    labels: sevenths.map(c => `${c.roman}|${getSingleNoteName(c.root)}${formatChordQuality(c.quality)}`),
    names: null
  });
  makeChordElementsInteractive(seventhsSection, sevenths, activeKey);

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
    // Clear highlights when playback stops
    if (!isPlaying) {
      clearChordHighlights(triadsSection);
      clearChordHighlights(seventhsSection);
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
