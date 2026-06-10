/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get, set, subscribe } from '../state.js';

// Mock abcjs since jsdom doesn't support full SVG rendering
vi.mock('abcjs', () => ({
  default: {
    renderAbc: vi.fn((el, abc, opts) => {
      // Create a minimal SVG element to simulate rendering
      el.innerHTML = `<svg class="abcjs-mock">${abc}</svg>`;
    })
  }
}));

// Mock audio modules
const mockInitAudioEngine = vi.fn().mockResolvedValue(true);
const mockPlayChordSequence = vi.fn();
const mockPlaySingleChord = vi.fn();
const mockStopPlayback = vi.fn();
const mockIsReady = vi.fn().mockReturnValue(false);

vi.mock('../audio/audio-engine.js', () => ({
  initAudioEngine: (...args) => mockInitAudioEngine(...args),
  playChordSequence: (...args) => mockPlayChordSequence(...args),
  playSingleChord: (...args) => mockPlaySingleChord(...args),
  stopPlayback: (...args) => mockStopPlayback(...args),
  isReady: () => mockIsReady(),
}));

vi.mock('../audio/play-button.js', () => ({
  createPlayButton: ({ ariaLabel, onPlay, onStop }) => {
    const button = document.createElement('button');
    button.setAttribute('aria-label', ariaLabel);
    button.className = 'play-button';
    button.addEventListener('click', () => {
      if (button.dataset.playing === 'true') {
        onStop();
      } else {
        onPlay();
      }
    });
    return {
      element: button,
      setPlaying: (playing) => { button.dataset.playing = String(playing); },
      setDisabled: (disabled) => { button.disabled = disabled; },
      destroy: vi.fn(),
    };
  }
}));

vi.mock('../audio/tempo-slider.js', () => ({
  createTempoSlider: (container, onChange) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'tempo-slider-wrapper';
    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'tempo-slider';
    input.min = '500';
    input.max = '3000';
    input.step = '100';
    input.value = '500';
    wrapper.appendChild(input);
    container.appendChild(wrapper);
    let currentValue = 500;
    return {
      getValue: () => currentValue,
      setValue: (ms) => { currentValue = ms; input.value = String(ms); },
      destroy: vi.fn(),
    };
  }
}));

vi.mock('../audio/bouncing-sphere.js', () => ({
  createBouncingSphere: (container) => {
    return {
      moveTo: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      destroy: vi.fn(),
    };
  }
}));

import { initChordExplorerView } from '../modes/chord-explorer-view.js';

describe('chord-explorer-view', () => {
  let panel;
  let cleanup;

  beforeEach(() => {
    set('activeKey', { index: 0, type: 'major' });

    // Create mock circle container for the zoom feature
    const circleContainer = document.createElement('div');
    circleContainer.id = 'circle-container';
    circleContainer.innerHTML = '<svg viewBox="0 0 980 980"></svg>';
    document.body.appendChild(circleContainer);

    panel = document.createElement('div');
    panel.className = 'mode-panel';
    Object.defineProperty(panel, 'clientWidth', { value: 360, configurable: true });
    document.body.appendChild(panel);

    mockInitAudioEngine.mockClear();
    mockPlayChordSequence.mockClear();
    mockPlaySingleChord.mockClear();
    mockStopPlayback.mockClear();
    mockIsReady.mockReturnValue(false);
  });

  afterEach(() => {
    if (cleanup) cleanup();
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('renders content on init for the default key (C Major)', () => {
      cleanup = initChordExplorerView(panel);
      expect(panel.innerHTML).not.toBe('');
    });

    it('displays the key name in the title', () => {
      cleanup = initChordExplorerView(panel);
      const title = panel.querySelector('.chord-explorer__title');
      expect(title).not.toBeNull();
      expect(title.textContent).toContain('DO Majeur');
    });

    it('renders two staff sections (triads and sevenths)', () => {
      cleanup = initChordExplorerView(panel);
      const staffSections = panel.querySelectorAll('.chord-explorer__staff');
      expect(staffSections.length).toBe(2);
    });

    it('renders abcjs staves for chords', () => {
      cleanup = initChordExplorerView(panel);
      const staves = panel.querySelectorAll('.abcjs-staff');
      expect(staves.length).toBe(2);
    });
  });

  describe('play buttons', () => {
    it('renders two play buttons (one for triads, one for sevenths)', () => {
      cleanup = initChordExplorerView(panel);
      const playBtns = panel.querySelectorAll('.play-button');
      expect(playBtns.length).toBe(2);
    });

    it('triads play button has correct aria-label', () => {
      cleanup = initChordExplorerView(panel);
      const playBtns = panel.querySelectorAll('.play-button');
      expect(playBtns[0].getAttribute('aria-label')).toBe('Jouer les triades');
    });

    it('sevenths play button has correct aria-label', () => {
      cleanup = initChordExplorerView(panel);
      const playBtns = panel.querySelectorAll('.play-button');
      expect(playBtns[1].getAttribute('aria-label')).toBe('Jouer les accords de septième');
    });

    it('calls initAudioEngine and playChordSequence on triads play', async () => {
      mockIsReady.mockReturnValue(false);
      cleanup = initChordExplorerView(panel);
      const playBtns = panel.querySelectorAll('.play-button');
      playBtns[0].click();
      // Wait for async onPlay
      await vi.waitFor(() => {
        expect(mockInitAudioEngine).toHaveBeenCalled();
      });
      expect(mockPlayChordSequence).toHaveBeenCalledWith(
        'chord-triads',
        expect.any(Array),
        0,
        'major',
        500,
        expect.objectContaining({ onChordStart: expect.any(Function), onComplete: expect.any(Function) })
      );
    });

    it('skips initAudioEngine when already ready', async () => {
      mockIsReady.mockReturnValue(true);
      cleanup = initChordExplorerView(panel);
      const playBtns = panel.querySelectorAll('.play-button');
      playBtns[0].click();
      await vi.waitFor(() => {
        expect(mockPlayChordSequence).toHaveBeenCalled();
      });
      expect(mockInitAudioEngine).not.toHaveBeenCalled();
    });

    it('calls stopPlayback on stop', () => {
      cleanup = initChordExplorerView(panel);
      const playBtns = panel.querySelectorAll('.play-button');
      // Set button to playing state so click triggers onStop
      playBtns[0].dataset.playing = 'true';
      playBtns[0].click();
      expect(mockStopPlayback).toHaveBeenCalled();
    });

    it('calls playChordSequence with chord-sevenths sectionId for sevenths button', async () => {
      mockIsReady.mockReturnValue(true);
      cleanup = initChordExplorerView(panel);
      const playBtns = panel.querySelectorAll('.play-button');
      playBtns[1].click();
      await vi.waitFor(() => {
        expect(mockPlayChordSequence).toHaveBeenCalledWith(
          'chord-sevenths',
          expect.any(Array),
          0,
          'major',
          500,
          expect.any(Object)
        );
      });
    });
  });

  describe('tempo slider', () => {
    it('renders a tempo slider', () => {
      cleanup = initChordExplorerView(panel);
      const slider = panel.querySelector('.tempo-slider-wrapper');
      expect(slider).not.toBeNull();
    });

    it('uses shared tempo from state store', () => {
      set('tempo', 1200);
      cleanup = initChordExplorerView(panel);
      const input = panel.querySelector('.tempo-slider');
      expect(input.value).toBe('1200');
    });

    it('uses current tempo value when playing', async () => {
      set('tempo', 1500);
      mockIsReady.mockReturnValue(true);
      cleanup = initChordExplorerView(panel);
      const playBtns = panel.querySelectorAll('.play-button');
      playBtns[0].click();
      await vi.waitFor(() => {
        expect(mockPlayChordSequence).toHaveBeenCalledWith(
          'chord-triads',
          expect.any(Array),
          0,
          'major',
          1500,
          expect.any(Object)
        );
      });
    });
  });

  describe('playback state subscription', () => {
    it('sets triads play button to playing when playbackState matches chord-triads', () => {
      cleanup = initChordExplorerView(panel);
      set('playbackState', { isPlaying: true, sectionId: 'chord-triads', currentIndex: 0, type: 'chord' });
      const playBtns = panel.querySelectorAll('.play-button');
      expect(playBtns[0].dataset.playing).toBe('true');
      expect(playBtns[1].dataset.playing).toBe('false');
    });

    it('sets sevenths play button to playing when playbackState matches chord-sevenths', () => {
      cleanup = initChordExplorerView(panel);
      set('playbackState', { isPlaying: true, sectionId: 'chord-sevenths', currentIndex: 0, type: 'chord' });
      const playBtns = panel.querySelectorAll('.play-button');
      expect(playBtns[0].dataset.playing).toBe('false');
      expect(playBtns[1].dataset.playing).toBe('true');
    });

    it('resets all buttons when playback stops', () => {
      cleanup = initChordExplorerView(panel);
      // First set playing
      set('playbackState', { isPlaying: true, sectionId: 'chord-triads', currentIndex: 0, type: 'chord' });
      // Then stop
      set('playbackState', { isPlaying: false, sectionId: null, currentIndex: -1, type: null });
      const playBtns = panel.querySelectorAll('.play-button');
      expect(playBtns[0].dataset.playing).toBe('false');
      expect(playBtns[1].dataset.playing).toBe('false');
    });
  });

  describe('state subscription', () => {
    it('updates content when activeKey changes', () => {
      cleanup = initChordExplorerView(panel);
      set('activeKey', { index: 1, type: 'major' });
      const title = panel.querySelector('.chord-explorer__title');
      expect(title.textContent).toContain('SOL Majeur');
    });

    it('updates content for minor keys', () => {
      cleanup = initChordExplorerView(panel);
      set('activeKey', { index: 0, type: 'minor' });
      const title = panel.querySelector('.chord-explorer__title');
      expect(title.textContent).toContain('la mineur');
    });

    it('re-renders play buttons on activeKey change', () => {
      cleanup = initChordExplorerView(panel);
      set('activeKey', { index: 3, type: 'major' });
      const playBtns = panel.querySelectorAll('.play-button');
      expect(playBtns.length).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('returns a cleanup function', () => {
      cleanup = initChordExplorerView(panel);
      expect(typeof cleanup).toBe('function');
    });

    it('unsubscribes from state changes after cleanup', () => {
      cleanup = initChordExplorerView(panel);
      cleanup();
      const contentAfterCleanup = panel.innerHTML;
      set('activeKey', { index: 5, type: 'major' });
      expect(panel.innerHTML).toBe(contentAfterCleanup);
      cleanup = null;
    });
  });
});
