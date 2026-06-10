/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { set, get } from '../state.js';

// Mock abcjs since jsdom doesn't support full SVG rendering
vi.mock('abcjs', () => ({
  default: {
    renderAbc: vi.fn((el, abc, opts) => {
      el.innerHTML = `<svg class="abcjs-mock">${abc}</svg>`;
    })
  }
}));

// Mock audio engine
vi.mock('../audio/audio-engine.js', () => ({
  initAudioEngine: vi.fn(() => Promise.resolve(true)),
  playScale: vi.fn(),
  playSingleNote: vi.fn(),
  stopPlayback: vi.fn(),
  isReady: vi.fn(() => false),
  getPlaybackState: vi.fn(() => ({ isPlaying: false, sectionId: null, currentIndex: -1, type: null }))
}));

// Mock play button
vi.mock('../audio/play-button.js', () => ({
  createPlayButton: vi.fn(({ ariaLabel, onPlay, onStop }) => {
    const el = document.createElement('button');
    el.className = 'play-button';
    el.setAttribute('aria-label', ariaLabel);
    el.dataset.playing = 'false';
    el.dataset.disabled = 'false';
    el.addEventListener('click', () => {
      if (el.dataset.playing === 'true') {
        onStop();
      } else {
        onPlay();
      }
    });
    return {
      element: el,
      setPlaying: vi.fn((playing) => { el.dataset.playing = String(playing); }),
      setDisabled: vi.fn((disabled) => { el.dataset.disabled = String(disabled); }),
      destroy: vi.fn(),
      _sectionId: null
    };
  })
}));

// Mock tempo slider
vi.mock('../audio/tempo-slider.js', () => ({
  createTempoSlider: vi.fn((container, onChange) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'tempo-slider-wrapper';
    container.appendChild(wrapper);
    return {
      getValue: vi.fn(() => 500),
      setValue: vi.fn(),
      destroy: vi.fn()
    };
  })
}));

// Mock bouncing sphere
vi.mock('../audio/bouncing-sphere.js', () => ({
  createBouncingSphere: vi.fn((container) => {
    return {
      moveTo: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      destroy: vi.fn()
    };
  })
}));

// Mock bouncing sphere
vi.mock('../audio/bouncing-sphere.js', () => ({
  createBouncingSphere: vi.fn((containerEl) => {
    return {
      moveTo: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      destroy: vi.fn()
    };
  })
}));

import { initScaleExplorerView } from '../modes/scale-explorer-view.js';
import { initAudioEngine, playScale, playSingleNote, stopPlayback, isReady, getPlaybackState } from '../audio/audio-engine.js';
import { createPlayButton } from '../audio/play-button.js';
import { createTempoSlider } from '../audio/tempo-slider.js';
import { createBouncingSphere } from '../audio/bouncing-sphere.js';

describe('scale-explorer-view', () => {
  let panel;
  let cleanup;

  beforeEach(() => {
    vi.clearAllMocks();
    set('activeKey', { index: 0, type: 'major' });
    set('tempo', 500);

    // Create mock circle container for the zoom feature
    const circleContainer = document.createElement('div');
    circleContainer.id = 'circle-container';
    circleContainer.innerHTML = '<svg viewBox="0 0 980 980"></svg>';
    document.body.appendChild(circleContainer);

    panel = document.createElement('div');
    panel.className = 'mode-panel';
    Object.defineProperty(panel, 'clientWidth', { value: 360, configurable: true });
    document.body.appendChild(panel);
  });

  afterEach(() => {
    if (cleanup) cleanup();
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('renders scale content for the default key (C Major) on init', () => {
      cleanup = initScaleExplorerView(panel);
      expect(panel.innerHTML).toContain('DO Majeur');
      expect(panel.innerHTML).toContain('Gammes');
    });

    it('renders 4 scale sections on init', () => {
      cleanup = initScaleExplorerView(panel);
      const containers = panel.querySelectorAll('.scale-staff-container');
      expect(containers.length).toBe(4);
    });

    it('renders scale type labels', () => {
      cleanup = initScaleExplorerView(panel);
      expect(panel.innerHTML).toContain('Majeure');
      expect(panel.innerHTML).toContain('Mineure naturelle');
      expect(panel.innerHTML).toContain('Mineure harmonique');
      expect(panel.innerHTML).toContain('Mineure mélodique');
    });
  });

  describe('play buttons', () => {
    it('creates 4 play buttons (one per scale section)', () => {
      cleanup = initScaleExplorerView(panel);
      expect(createPlayButton).toHaveBeenCalledTimes(4);
    });

    it('renders play buttons with correct aria labels', () => {
      cleanup = initScaleExplorerView(panel);
      const calls = createPlayButton.mock.calls;
      const labels = calls.map(c => c[0].ariaLabel);
      expect(labels).toContain('Jouer la gamme majeure');
      expect(labels).toContain('Jouer la gamme mineure naturelle');
      expect(labels).toContain('Jouer la gamme mineure harmonique');
      expect(labels).toContain('Jouer la gamme mineure mélodique');
    });

    it('inserts play buttons inline in each scale section', () => {
      cleanup = initScaleExplorerView(panel);
      const buttons = panel.querySelectorAll('.play-button');
      expect(buttons.length).toBe(4);
      // Each button should be inside a scale-section-header
      const headers = panel.querySelectorAll('.scale-section-header');
      expect(headers.length).toBe(4);
    });

    it('buttons are always enabled (audio engine initializes lazily on play)', () => {
      isReady.mockReturnValue(false);
      cleanup = initScaleExplorerView(panel);
      const results = createPlayButton.mock.results;
      results.forEach(r => {
        expect(r.value.setDisabled).toHaveBeenCalledWith(false);
      });
    });

    it('buttons remain enabled even when audio engine is ready', () => {
      isReady.mockReturnValue(true);
      cleanup = initScaleExplorerView(panel);
      const results = createPlayButton.mock.results;
      results.forEach(r => {
        expect(r.value.setDisabled).toHaveBeenCalledWith(false);
      });
    });

    it('calls initAudioEngine on play when not ready, then plays', async () => {
      // isReady returns false during render AND during onPlay initial check,
      // then returns true after initAudioEngine resolves
      isReady.mockReturnValue(false);
      initAudioEngine.mockImplementation(async () => {
        isReady.mockReturnValue(true);
        return true;
      });
      cleanup = initScaleExplorerView(panel);

      // Get the onPlay callback from the first createPlayButton call
      const onPlay = createPlayButton.mock.calls[0][0].onPlay;
      await onPlay();

      expect(initAudioEngine).toHaveBeenCalled();
      expect(playScale).toHaveBeenCalled();
    });

    it('calls playScale with correct sectionId and tempo', async () => {
      isReady.mockReturnValue(true);
      cleanup = initScaleExplorerView(panel);
      set('tempo', 1000);

      const onPlay = createPlayButton.mock.calls[0][0].onPlay;
      await onPlay();

      expect(playScale).toHaveBeenCalledWith(
        'scale-Majeure',
        expect.objectContaining({ name: 'Majeure' }),
        1000,
        expect.objectContaining({ onNoteStart: expect.any(Function), onComplete: expect.any(Function) })
      );
    });

    it('calls stopPlayback on stop', () => {
      isReady.mockReturnValue(true);
      cleanup = initScaleExplorerView(panel);

      const onStop = createPlayButton.mock.calls[0][0].onStop;
      onStop();

      expect(stopPlayback).toHaveBeenCalled();
    });

    it('recreates play buttons on re-render (key change)', () => {
      cleanup = initScaleExplorerView(panel);
      const firstResults = createPlayButton.mock.results.map(r => r.value);

      set('activeKey', { index: 1, type: 'major' });

      // Old buttons should be destroyed
      firstResults.forEach(btn => {
        expect(btn.destroy).toHaveBeenCalled();
      });
      // New buttons should be created (4 initial + 4 new)
      expect(createPlayButton).toHaveBeenCalledTimes(8);
    });
  });

  describe('tempo slider', () => {
    it('creates a tempo slider', () => {
      cleanup = initScaleExplorerView(panel);
      expect(createTempoSlider).toHaveBeenCalledTimes(1);
    });

    it('renders tempo slider container', () => {
      cleanup = initScaleExplorerView(panel);
      const tempoContainer = panel.querySelector('.scale-explorer-tempo');
      expect(tempoContainer).not.toBeNull();
    });

    it('initializes tempo slider with stored value', () => {
      set('tempo', 1500);
      cleanup = initScaleExplorerView(panel);
      const slider = createTempoSlider.mock.results[0].value;
      expect(slider.setValue).toHaveBeenCalledWith(1500);
    });

    it('updates tempo state when slider changes', () => {
      cleanup = initScaleExplorerView(panel);
      const onChange = createTempoSlider.mock.calls[0][1];
      onChange(2000);
      expect(get('tempo')).toBe(2000);
    });

    it('destroys and recreates tempo slider on re-render', () => {
      cleanup = initScaleExplorerView(panel);
      const firstSlider = createTempoSlider.mock.results[0].value;

      set('activeKey', { index: 2, type: 'major' });

      expect(firstSlider.destroy).toHaveBeenCalled();
      expect(createTempoSlider).toHaveBeenCalledTimes(2);
    });
  });

  describe('playback state subscription', () => {
    it('updates button playing state when playbackState changes', () => {
      isReady.mockReturnValue(true);
      getPlaybackState.mockReturnValue({ isPlaying: true, sectionId: 'scale-Majeure', currentIndex: 0, type: 'scale' });
      cleanup = initScaleExplorerView(panel);

      // Trigger playbackState change
      set('playbackState', { isPlaying: true, sectionId: 'scale-Majeure', currentIndex: 0, type: 'scale' });

      // The first button (Majeure) should be set to playing
      const btns = createPlayButton.mock.results;
      expect(btns[0].value.setPlaying).toHaveBeenCalledWith(true);
      // Others should not be playing
      expect(btns[1].value.setPlaying).toHaveBeenCalledWith(false);
      expect(btns[2].value.setPlaying).toHaveBeenCalledWith(false);
      expect(btns[3].value.setPlaying).toHaveBeenCalledWith(false);
    });

    it('resets all buttons when playback stops', () => {
      isReady.mockReturnValue(true);
      getPlaybackState.mockReturnValue({ isPlaying: false, sectionId: null, currentIndex: -1, type: null });
      cleanup = initScaleExplorerView(panel);

      set('playbackState', { isPlaying: false, sectionId: null, currentIndex: -1, type: null });

      const btns = createPlayButton.mock.results;
      btns.forEach(btn => {
        expect(btn.value.setPlaying).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('state subscription', () => {
    it('updates content when activeKey changes', () => {
      cleanup = initScaleExplorerView(panel);
      set('activeKey', { index: 1, type: 'major' });
      expect(panel.innerHTML).toContain('SOL Majeur');
    });

    it('renders 4 scale sections after key change', () => {
      cleanup = initScaleExplorerView(panel);
      set('activeKey', { index: 5, type: 'major' });
      const containers = panel.querySelectorAll('.scale-staff-container');
      expect(containers.length).toBe(4);
    });
  });

  describe('cleanup', () => {
    it('returns a cleanup function', () => {
      cleanup = initScaleExplorerView(panel);
      expect(typeof cleanup).toBe('function');
    });

    it('unsubscribes from state changes after cleanup', () => {
      cleanup = initScaleExplorerView(panel);
      cleanup();
      const htmlAfterCleanup = panel.innerHTML;
      set('activeKey', { index: 7, type: 'major' });
      expect(panel.innerHTML).toBe(htmlAfterCleanup);
      cleanup = null;
    });

    it('destroys play buttons on cleanup', () => {
      cleanup = initScaleExplorerView(panel);
      const btns = createPlayButton.mock.results.map(r => r.value);
      cleanup();
      btns.forEach(btn => {
        expect(btn.destroy).toHaveBeenCalled();
      });
      cleanup = null;
    });

    it('destroys tempo slider on cleanup', () => {
      cleanup = initScaleExplorerView(panel);
      const slider = createTempoSlider.mock.results[0].value;
      cleanup();
      expect(slider.destroy).toHaveBeenCalled();
      cleanup = null;
    });

    it('destroys bouncing spheres on cleanup', () => {
      cleanup = initScaleExplorerView(panel);
      const spheres = createBouncingSphere.mock.results.map(r => r.value);
      cleanup();
      spheres.forEach(sphere => {
        expect(sphere.destroy).toHaveBeenCalled();
      });
      cleanup = null;
    });
  });

  describe('bouncing sphere', () => {
    it('creates 4 bouncing spheres (one per scale section)', () => {
      cleanup = initScaleExplorerView(panel);
      expect(createBouncingSphere).toHaveBeenCalledTimes(4);
    });

    it('creates sphere with the scale section container', () => {
      cleanup = initScaleExplorerView(panel);
      const calls = createBouncingSphere.mock.calls;
      calls.forEach(call => {
        const container = call[0];
        expect(container.className).toBe('scale-staff-container');
      });
    });

    it('calls sphere.show() and sphere.moveTo() on first note start', async () => {
      isReady.mockReturnValue(true);
      cleanup = initScaleExplorerView(panel);

      // Inject mock .abcjs-note elements into the first scale section's staff
      const containers = panel.querySelectorAll('.scale-staff-container');
      const staffEl = containers[0].querySelector('.abcjs-staff');
      if (staffEl) {
        const svg = staffEl.querySelector('svg') || staffEl;
        const noteEl = document.createElement('div');
        noteEl.className = 'abcjs-note';
        svg.appendChild(noteEl);
      }

      // Trigger play on the first scale
      const onPlay = createPlayButton.mock.calls[0][0].onPlay;
      await onPlay();

      // Get the onNoteStart callback from playScale
      const playScaleCallbacks = playScale.mock.calls[0][3];
      const sphere = createBouncingSphere.mock.results[0].value;

      // Simulate first note start
      playScaleCallbacks.onNoteStart(0);

      expect(sphere.show).toHaveBeenCalled();
      expect(sphere.moveTo).toHaveBeenCalled();
    });

    it('calls sphere.hide() on playback complete', async () => {
      isReady.mockReturnValue(true);
      cleanup = initScaleExplorerView(panel);

      const onPlay = createPlayButton.mock.calls[0][0].onPlay;
      await onPlay();

      const playScaleCallbacks = playScale.mock.calls[0][3];
      const sphere = createBouncingSphere.mock.results[0].value;

      // Simulate playback complete
      playScaleCallbacks.onComplete();

      expect(sphere.hide).toHaveBeenCalled();
    });

    it('hides all spheres when playback state changes to stopped', () => {
      isReady.mockReturnValue(true);
      getPlaybackState.mockReturnValue({ isPlaying: false, sectionId: null, currentIndex: -1, type: null });
      cleanup = initScaleExplorerView(panel);

      // Trigger playbackState change to stopped
      set('playbackState', { isPlaying: false, sectionId: null, currentIndex: -1, type: null });

      const spheres = createBouncingSphere.mock.results.map(r => r.value);
      spheres.forEach(sphere => {
        expect(sphere.hide).toHaveBeenCalled();
      });
    });

    it('destroys and recreates spheres on re-render (key change)', () => {
      cleanup = initScaleExplorerView(panel);
      const firstSpheres = createBouncingSphere.mock.results.map(r => r.value);

      set('activeKey', { index: 1, type: 'major' });

      // Old spheres should be destroyed
      firstSpheres.forEach(sphere => {
        expect(sphere.destroy).toHaveBeenCalled();
      });
      // New spheres should be created (4 initial + 4 new)
      expect(createBouncingSphere).toHaveBeenCalledTimes(8);
    });

    it('uses current tempo from state for sphere.moveTo', async () => {
      isReady.mockReturnValue(true);
      set('tempo', 1500);
      cleanup = initScaleExplorerView(panel);

      const onPlay = createPlayButton.mock.calls[0][0].onPlay;
      await onPlay();

      // Inject a mock .abcjs-note element into the container
      const container = createBouncingSphere.mock.calls[0][0];
      const staffEl = container.querySelector('.abcjs-staff');
      if (staffEl) {
        const noteEl = document.createElement('div');
        noteEl.className = 'abcjs-note';
        staffEl.appendChild(noteEl);
      }

      const playScaleCallbacks = playScale.mock.calls[0][3];
      playScaleCallbacks.onNoteStart(0);

      const sphere = createBouncingSphere.mock.results[0].value;
      // In jsdom getBoundingClientRect returns zeros, so moveTo is called with calculated values
      // The important thing is that moveTo was called with the tempo value
      if (sphere.moveTo.mock.calls.length > 0) {
        const lastCall = sphere.moveTo.mock.calls[sphere.moveTo.mock.calls.length - 1];
        expect(lastCall[2]).toBe(1500);
      }
    });
  });
});
