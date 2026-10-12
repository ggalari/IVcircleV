// Chord Explorer View — second mode panel (mode 1).
// Displays diatonic triads and seventh chords using abcjs with w: labels.

import { get, subscribe } from '../state.js';
import { getDiatonicTriads, getDiatonicSevenths } from '../theory/chords.js';
import { renderChordStaff, formatChordQuality, getSingleNoteName } from './staff-renderer.js';
import { SLICES } from '../circle/keys.js';
import { renderCircleZoom } from './circle-zoom.js';
import { initAudioEngine, playChordSequence, playSingleChord, stopPlayback, isReady } from '../audio/audio-engine.js';
import { createExplorerSection } from './explorer-section.js';
import { CHORD_TEMPO_MS } from '../config.js';

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

/** @type {Array<{ element: HTMLElement, sectionId: string, setPlaying: Function, clearHighlights: Function, hideSphere: Function, destroy: Function }>} */
let sections = [];

/** @type {Function|null} */
let unsubPlaybackState = null;

function cleanupAudioControls() {
  sections.forEach(s => s.destroy());
  sections = [];
  if (unsubPlaybackState) {
    unsubPlaybackState();
    unsubPlaybackState = null;
  }
}

/**
 * Render one chord section (triads or sevenths) as a data adapter over the
 * shared explorer section.
 */
function renderChordSection(panel, activeKey, { chords, sectionId, className, ariaLabel, subtitle }) {
  // Add 8th chord (tonic repeated for resolution — octave handled by ascending sequence logic)
  const withResolution = [...chords, { ...chords[0], degree: 8 }];

  const section = createExplorerSection({
    className,
    sectionId,
    tempo: CHORD_TEMPO_MS,
    ariaLabel,
    rowClassName: 'chord-staff-row',
    header: {
      className: 'chord-explorer__section-header',
      subtitleClassName: 'chord-explorer__subtitle',
      text: subtitle
    },
    renderStaff: (el) => renderChordStaff(el, {
      sliceIndex: activeKey.index,
      keyType: activeKey.type,
      chords: withResolution,
      labels: withResolution.map(c => `${c.roman}|${getSingleNoteName(c.root)}${formatChordQuality(c.quality)}`),
      names: null
    }),
    play: ({ onStart, onComplete }) => playChordSequence(
      sectionId,
      withResolution,
      activeKey.index,
      activeKey.type,
      CHORD_TEMPO_MS,
      { onChordStart: onStart, onComplete }
    )
  });

  makeChordElementsInteractive(section.element, withResolution, activeKey);
  sections.push(section);
  panel.appendChild(section.element);
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

  renderChordSection(panel, activeKey, {
    chords: triads,
    sectionId: 'chord-triads',
    className: 'chord-explorer__staff chord-explorer__staff--triads',
    ariaLabel: 'Jouer les triades',
    subtitle: 'Triades'
  });

  renderChordSection(panel, activeKey, {
    chords: sevenths,
    sectionId: 'chord-sevenths',
    className: 'chord-explorer__staff chord-explorer__staff--sevenths',
    ariaLabel: 'Jouer les accords de septième',
    subtitle: 'Accords de septième'
  });

  // Subscribe to playback state for button icon updates
  unsubPlaybackState = subscribe('playbackState', (state) => {
    if (!state) return;
    const { isPlaying, sectionId } = state;
    sections.forEach(s => s.setPlaying(isPlaying && sectionId === s.sectionId));
    // Clear highlights and hide spheres when playback stops
    if (!isPlaying) {
      sections.forEach(s => {
        s.clearHighlights();
        s.hideSphere();
      });
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
