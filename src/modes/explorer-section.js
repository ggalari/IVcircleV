// src/modes/explorer-section.js
// One section of an explorer: a rendered staff, a play button, a bouncing sphere
// and playback highlighting, for a sequence of items. The explorers supply the
// items and the engine adapter; this module owns the section lifecycle so the
// chord and scale sections cannot drift apart.

import { initAudioEngine, isReady, stopPlayback } from '../audio/audio-engine.js';
import { createPlayButton } from '../audio/play-button.js';
import { createBouncingSphere } from '../audio/bouncing-sphere.js';
import { SPHERE_NOTE_OFFSET_Y } from '../config.js';

const HIGHLIGHT_TRANSITION = 'filter 150ms ease-out, transform 150ms ease-out';
const CLEAR_TRANSITION = 'filter 200ms ease-out, transform 200ms ease-out';
const SOUNDING_GLOW =
  'drop-shadow(0 0 6px var(--color-major, #8b0000)) drop-shadow(0 0 10px var(--color-major, #8b0000))';

/** The staff's note elements, in playback order. */
function noteElements(sectionEl) {
  const staffEl = sectionEl.querySelector('.abcjs-staff');
  return staffEl ? staffEl.querySelectorAll('.abcjs-note') : [];
}

/**
 * Highlight the sounding item, clearing every other item first.
 * @param {HTMLElement} sectionEl
 * @param {number} index
 */
function highlightItem(sectionEl, index) {
  const notes = noteElements(sectionEl);
  notes.forEach((el) => {
    el.style.filter = '';
    el.style.transform = '';
    el.style.transition = HIGHLIGHT_TRANSITION;
  });

  const el = notes[index];
  if (!el) return;
  el.style.transition = 'filter 0ms, transform 0ms';
  el.style.filter = SOUNDING_GLOW;
  el.style.transform = 'scale(1.1)';
  el.style.transformOrigin = 'center';
  el.style.transformBox = 'fill-box';
}

/** Clear every note highlight in the section. */
function clearSectionHighlights(sectionEl) {
  noteElements(sectionEl).forEach((el) => {
    el.style.filter = '';
    el.style.transform = '';
    el.style.transition = CLEAR_TRANSITION;
  });
}

/** The centre of an item, relative to the section, for the sphere. */
function itemPosition(sectionEl, el) {
  const containerRect = sectionEl.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return {
    x: elRect.left - containerRect.left + elRect.width / 2,
    y: elRect.top - containerRect.top - SPHERE_NOTE_OFFSET_Y,
  };
}

/**
 * Create one explorer section.
 *
 * @param {Object} options
 * @param {string} options.className - Section container class list
 * @param {string} options.sectionId - Playback section id, matched against playbackState
 * @param {number} options.tempo - Milliseconds per item
 * @param {string} options.ariaLabel - Play button accessible label
 * @param {string} options.rowClassName - Class for the staff/button row
 * @param {{ className: string, subtitleClassName: string, text: string }=} options.header
 * @param {(sectionEl: HTMLElement) => void} options.renderStaff - Renders this section's staff
 * @param {(handlers: { onStart: (index: number) => void, onComplete: () => void }) => void} options.play
 *   Engine adapter: starts the sequence and calls the handlers as it advances.
 * @returns {{
 *   element: HTMLElement,
 *   playButton: { element: HTMLButtonElement, setPlaying: Function, setDisabled: Function, destroy: Function },
 *   sectionId: string,
 *   setPlaying: (playing: boolean) => void,
 *   clearHighlights: () => void,
 *   hideSphere: () => void,
 *   destroy: () => void
 * }}
 */
export function createExplorerSection({
  className,
  sectionId,
  tempo,
  ariaLabel,
  rowClassName,
  header = null,
  renderStaff,
  play,
}) {
  const element = document.createElement('div');
  element.className = className;
  element.style.position = 'relative';

  if (header) {
    const headerEl = document.createElement('div');
    headerEl.className = header.className;
    const subtitle = document.createElement('h4');
    subtitle.className = header.subtitleClassName;
    subtitle.textContent = header.text;
    headerEl.appendChild(subtitle);
    element.appendChild(headerEl);
  }

  const sphere = createBouncingSphere(element);

  const playButton = createPlayButton({
    ariaLabel,
    onPlay: async () => {
      if (!isReady()) {
        await initAudioEngine();
      }
      sphere.reset();
      play({
        onStart: (index) => {
          highlightItem(element, index);
          const el = noteElements(element)[index];
          if (!el) return;
          if (index === 0) sphere.show();
          const { x, y } = itemPosition(element, el);
          sphere.moveTo(x, y, tempo);
        },
        onComplete: () => {
          clearSectionHighlights(element);
          sphere.hide();
        },
      });
    },
    onStop: () => stopPlayback(),
  });

  renderStaff(element);

  const staffEl = element.querySelector('.abcjs-staff');
  if (staffEl) {
    const row = document.createElement('div');
    row.className = rowClassName;
    staffEl.parentNode.insertBefore(row, staffEl);
    row.appendChild(staffEl);
    row.appendChild(playButton.element);
  } else {
    element.appendChild(playButton.element);
  }

  return {
    element,
    playButton,
    sectionId,
    setPlaying: (playing) => playButton.setPlaying(playing),
    clearHighlights: () => clearSectionHighlights(element),
    hideSphere: () => sphere.hide(),
    destroy: () => {
      playButton.destroy();
      sphere.destroy();
    },
  };
}
