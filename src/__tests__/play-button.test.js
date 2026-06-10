/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPlayButton } from '../audio/play-button.js';

describe('play-button', () => {
  let playButton;
  let onPlay;
  let onStop;

  beforeEach(() => {
    onPlay = vi.fn();
    onStop = vi.fn();
    playButton = createPlayButton({
      label: 'Gamme majeure',
      onPlay,
      onStop,
      ariaLabel: 'Jouer la gamme majeure',
    });
    document.body.appendChild(playButton.element);
  });

  afterEach(() => {
    playButton.destroy();
    if (playButton.element.parentNode) {
      document.body.removeChild(playButton.element);
    }
  });

  describe('element creation and structure', () => {
    it('returns an object with element, setPlaying, setDisabled, destroy', () => {
      expect(playButton.element).toBeInstanceOf(HTMLButtonElement);
      expect(typeof playButton.setPlaying).toBe('function');
      expect(typeof playButton.setDisabled).toBe('function');
      expect(typeof playButton.destroy).toBe('function');
    });

    it('renders a button element with play-button class', () => {
      expect(playButton.element.className).toBe('play-button');
      expect(playButton.element.type).toBe('button');
    });

    it('contains an SVG play icon initially', () => {
      const svg = playButton.element.querySelector('svg');
      expect(svg).not.toBeNull();
      // Play icon has a polygon (triangle)
      const polygon = playButton.element.querySelector('polygon');
      expect(polygon).not.toBeNull();
    });

    it('has minimum touch target of 44x44 CSS pixels', () => {
      expect(playButton.element.style.minWidth).toBe('44px');
      expect(playButton.element.style.minHeight).toBe('44px');
    });

    it('uses stroke-based SVG icon style with stroke-width 2', () => {
      const svg = playButton.element.querySelector('svg');
      expect(svg.getAttribute('stroke-width')).toBe('2');
      expect(svg.getAttribute('stroke-linecap')).toBe('round');
      expect(svg.getAttribute('stroke-linejoin')).toBe('round');
    });

    it('SVG icons use currentColor for theming', () => {
      const svg = playButton.element.querySelector('svg');
      expect(svg.getAttribute('stroke')).toBe('currentColor');
    });

    it('SVG has aria-hidden="true"', () => {
      const svg = playButton.element.querySelector('svg');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('icon toggling on setPlaying', () => {
    it('shows play icon (polygon) when not playing', () => {
      playButton.setPlaying(false);
      const polygon = playButton.element.querySelector('polygon');
      const rect = playButton.element.querySelector('rect');
      expect(polygon).not.toBeNull();
      expect(rect).toBeNull();
    });

    it('shows stop icon (rect) when playing', () => {
      playButton.setPlaying(true);
      const rect = playButton.element.querySelector('rect');
      const polygon = playButton.element.querySelector('polygon');
      expect(rect).not.toBeNull();
      expect(polygon).toBeNull();
    });

    it('toggles icon back and forth', () => {
      playButton.setPlaying(true);
      expect(playButton.element.querySelector('rect')).not.toBeNull();

      playButton.setPlaying(false);
      expect(playButton.element.querySelector('polygon')).not.toBeNull();

      playButton.setPlaying(true);
      expect(playButton.element.querySelector('rect')).not.toBeNull();
    });
  });

  describe('disabled state', () => {
    it('disables the button when setDisabled(true) is called', () => {
      playButton.setDisabled(true);
      expect(playButton.element.disabled).toBe(true);
    });

    it('enables the button when setDisabled(false) is called', () => {
      playButton.setDisabled(true);
      playButton.setDisabled(false);
      expect(playButton.element.disabled).toBe(false);
    });

    it('does not invoke callbacks when disabled and clicked', () => {
      playButton.setDisabled(true);
      playButton.element.click();
      expect(onPlay).not.toHaveBeenCalled();
      expect(onStop).not.toHaveBeenCalled();
    });
  });

  describe('ARIA attributes', () => {
    it('has aria-label set to the provided ariaLabel', () => {
      expect(playButton.element.getAttribute('aria-label')).toBe('Jouer la gamme majeure');
    });

    it('has aria-pressed set to "false" initially', () => {
      expect(playButton.element.getAttribute('aria-pressed')).toBe('false');
    });

    it('updates aria-pressed to "true" when playing', () => {
      playButton.setPlaying(true);
      expect(playButton.element.getAttribute('aria-pressed')).toBe('true');
    });

    it('updates aria-pressed to "false" when stopped', () => {
      playButton.setPlaying(true);
      playButton.setPlaying(false);
      expect(playButton.element.getAttribute('aria-pressed')).toBe('false');
    });

    it('updates aria-label to "Arrêter la lecture" when playing', () => {
      playButton.setPlaying(true);
      expect(playButton.element.getAttribute('aria-label')).toBe('Arrêter la lecture');
    });

    it('reverts aria-label to initial value when stopped', () => {
      playButton.setPlaying(true);
      playButton.setPlaying(false);
      expect(playButton.element.getAttribute('aria-label')).toBe('Jouer la gamme majeure');
    });
  });

  describe('keyboard interaction', () => {
    it('triggers onPlay when Enter is pressed and not playing', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      playButton.element.dispatchEvent(event);
      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it('triggers onStop when Enter is pressed and playing', () => {
      playButton.setPlaying(true);
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      playButton.element.dispatchEvent(event);
      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('triggers onPlay when Space is pressed and not playing', () => {
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      playButton.element.dispatchEvent(event);
      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it('triggers onStop when Space is pressed and playing', () => {
      playButton.setPlaying(true);
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      playButton.element.dispatchEvent(event);
      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('calls preventDefault on Space key to avoid scrolling', () => {
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      playButton.element.dispatchEvent(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('does not trigger callbacks on other keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
      playButton.element.dispatchEvent(event);
      expect(onPlay).not.toHaveBeenCalled();
      expect(onStop).not.toHaveBeenCalled();
    });
  });

  describe('callback invocation', () => {
    it('calls onPlay when button is clicked and not playing', () => {
      playButton.element.click();
      expect(onPlay).toHaveBeenCalledTimes(1);
      expect(onStop).not.toHaveBeenCalled();
    });

    it('calls onStop when button is clicked and playing', () => {
      playButton.setPlaying(true);
      playButton.element.click();
      expect(onStop).toHaveBeenCalledTimes(1);
      expect(onPlay).not.toHaveBeenCalled();
    });

    it('does not call callbacks when disabled', () => {
      playButton.setDisabled(true);
      playButton.element.click();
      expect(onPlay).not.toHaveBeenCalled();
      expect(onStop).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('removes click event listener after destroy', () => {
      playButton.destroy();
      playButton.element.click();
      expect(onPlay).not.toHaveBeenCalled();
    });

    it('removes keydown event listener after destroy', () => {
      playButton.destroy();
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      playButton.element.dispatchEvent(event);
      expect(onPlay).not.toHaveBeenCalled();
    });

    it('removes style element from document', () => {
      playButton.destroy();
      const styleEl = document.querySelector('[data-play-button-styles]');
      expect(styleEl).toBeNull();
    });
  });
});
