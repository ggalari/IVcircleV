/**
 * @vitest-environment jsdom
 */
// modes/explorer-section.js — one explorer playback section (staff + play +
// sphere + highlight) built from data and engine adapters.
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../audio/audio-engine.js', () => ({
  initAudioEngine: vi.fn(() => Promise.resolve(true)),
  isReady: vi.fn(() => true),
  stopPlayback: vi.fn(),
}));

vi.mock('../audio/play-button.js', () => ({
  createPlayButton: vi.fn(({ ariaLabel, onPlay, onStop }) => {
    const element = document.createElement('button');
    element.className = 'play-button';
    element.setAttribute('aria-label', ariaLabel);
    element.dataset.playing = 'false';
    element.addEventListener('click', () => {
      if (element.dataset.playing === 'true') onStop();
      else onPlay();
    });
    return {
      element,
      setPlaying: vi.fn((playing) => { element.dataset.playing = String(playing); }),
      setDisabled: vi.fn(),
      destroy: vi.fn(),
    };
  }),
}));

vi.mock('../audio/bouncing-sphere.js', () => ({
  createBouncingSphere: vi.fn(() => ({
    moveTo: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    reset: vi.fn(),
    destroy: vi.fn(),
  })),
}));

import { createExplorerSection } from '../modes/explorer-section.js';
import { initAudioEngine, isReady, stopPlayback } from '../audio/audio-engine.js';
import { createPlayButton } from '../audio/play-button.js';
import { createBouncingSphere } from '../audio/bouncing-sphere.js';

/** A renderStaff adapter that appends a `.abcjs-staff` with `noteCount` notes. */
function staffRenderer(noteCount = 0) {
  return vi.fn((sectionEl) => {
    const staff = document.createElement('div');
    staff.className = 'abcjs-staff';
    for (let i = 0; i < noteCount; i++) {
      const note = document.createElement('div');
      note.className = 'abcjs-note';
      staff.appendChild(note);
    }
    sectionEl.appendChild(staff);
  });
}

const TEMPO = 500;

function build(overrides = {}) {
  return createExplorerSection({
    className: 'section-class',
    sectionId: 'section-id',
    tempo: TEMPO,
    ariaLabel: 'Jouer',
    rowClassName: 'section-row',
    renderStaff: staffRenderer(3),
    play: vi.fn(),
    ...overrides,
  });
}

describe('createExplorerSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isReady.mockReturnValue(true);
  });

  it('creates a relatively-positioned section element with the given classes', () => {
    const section = build();
    expect(section.element.className).toBe('section-class');
    expect(section.element.style.position).toBe('relative');
  });

  it('renders the header before the staff when given one', () => {
    const section = build({
      header: { className: 'header-class', subtitleClassName: 'subtitle-class', text: 'Triades' },
    });
    const header = section.element.querySelector('.header-class');
    expect(header).not.toBeNull();
    expect(header.querySelector('.subtitle-class').textContent).toBe('Triades');
  });

  it('omits the header when not given one', () => {
    const section = build();
    expect(section.element.querySelector('h4')).toBeNull();
  });

  it('calls the staff adapter on the section element', () => {
    const renderStaff = staffRenderer(3);
    const section = build({ renderStaff });
    expect(renderStaff).toHaveBeenCalledWith(section.element);
    expect(section.element.querySelector('.abcjs-staff')).not.toBeNull();
  });

  it('wraps the staff and play button in the row class', () => {
    const section = build();
    const row = section.element.querySelector('.section-row');
    expect(row).not.toBeNull();
    expect(row.querySelector('.abcjs-staff')).not.toBeNull();
    expect(row.querySelector('.play-button')).not.toBeNull();
  });

  it('appends the play button directly when there is no staff', () => {
    const section = build({ renderStaff: vi.fn() });
    expect(section.element.querySelector('.section-row')).toBeNull();
    expect(section.element.querySelector('.play-button')).not.toBeNull();
  });

  it('creates the play button with the aria label', () => {
    build({ ariaLabel: 'Jouer la gamme majeure' });
    expect(createPlayButton.mock.calls[0][0].ariaLabel).toBe('Jouer la gamme majeure');
  });

  it('calls stopPlayback when the play button stops', () => {
    const section = build();
    section.playButton.element.dataset.playing = 'true';
    section.playButton.element.click();
    expect(stopPlayback).toHaveBeenCalled();
  });

  it('resets the sphere and starts playback when played while ready', () => {
    const play = vi.fn();
    const section = build({ play });
    section.playButton.element.click();
    expect(initAudioEngine).not.toHaveBeenCalled();
    expect(createBouncingSphere.mock.results[0].value.reset).toHaveBeenCalled();
    expect(play).toHaveBeenCalledWith({
      onStart: expect.any(Function),
      onComplete: expect.any(Function),
    });
  });

  it('initializes the audio engine before playing when not ready', async () => {
    isReady.mockReturnValue(false);
    const play = vi.fn();
    const section = build({ play });
    section.playButton.element.click();
    await vi.waitFor(() => expect(play).toHaveBeenCalled());
    expect(initAudioEngine).toHaveBeenCalled();
  });

  describe('playback handlers', () => {
    let section;
    let handlers;
    let sphere;

    beforeEach(() => {
      isReady.mockReturnValue(true);
      section = build({ play: vi.fn((h) => { handlers = h; }) });
      sphere = createBouncingSphere.mock.results[0].value;
      section.playButton.element.click();
    });

    it('shows and moves the sphere and highlights the item on start', () => {
      handlers.onStart(0);
      const notes = section.element.querySelectorAll('.abcjs-note');
      expect(notes[0].style.transform).toBe('scale(1.1)');
      expect(sphere.show).toHaveBeenCalled();
      expect(sphere.moveTo).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), TEMPO);
    });

    it('does not show the sphere for a later item but still moves it', () => {
      handlers.onStart(0);
      sphere.show.mockClear();
      handlers.onStart(1);
      expect(sphere.show).not.toHaveBeenCalled();
      expect(sphere.moveTo).toHaveBeenCalled();
    });

    it('clears highlights and hides the sphere on complete', () => {
      handlers.onStart(0);
      handlers.onComplete();
      expect(section.element.querySelectorAll('.abcjs-note')[0].style.filter).toBe('');
      expect(sphere.hide).toHaveBeenCalled();
    });
  });

  it('sets the playing state on the play button', () => {
    const section = build();
    section.setPlaying(true);
    expect(section.playButton.setPlaying).toHaveBeenCalledWith(true);
  });

  it('clears highlights on demand', () => {
    const section = build();
    const note = section.element.querySelector('.abcjs-note');
    note.style.filter = 'drop-shadow(0 0 6px red)';
    section.clearHighlights();
    expect(note.style.filter).toBe('');
  });

  it('hides the sphere on demand', () => {
    const section = build();
    section.hideSphere();
    expect(createBouncingSphere.mock.results[0].value.hide).toHaveBeenCalled();
  });

  it('destroys the play button and sphere', () => {
    const section = build();
    section.destroy();
    expect(section.playButton.destroy).toHaveBeenCalled();
    expect(createBouncingSphere.mock.results[0].value.destroy).toHaveBeenCalled();
  });
});
