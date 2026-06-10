// @ts-nocheck
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTempoSlider } from '../audio/tempo-slider.js';

describe('tempo-slider', () => {
  let container;
  let slider;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (slider) {
      slider.destroy();
      slider = null;
    }
    document.body.removeChild(container);
  });

  describe('element creation and structure', () => {
    it('appends a wrapper element to the container', () => {
      slider = createTempoSlider(container, () => {});
      const wrapper = container.querySelector('.tempo-slider-wrapper');
      expect(wrapper).not.toBeNull();
    });

    it('creates a range input inside the wrapper', () => {
      slider = createTempoSlider(container, () => {});
      const input = container.querySelector('input[type="range"]');
      expect(input).not.toBeNull();
      expect(input.className).toBe('tempo-slider');
    });

    it('creates a value label span inside the wrapper', () => {
      slider = createTempoSlider(container, () => {});
      const label = container.querySelector('.tempo-slider-label');
      expect(label).not.toBeNull();
    });

    it('sets correct range attributes: min=500, max=3000, step=100', () => {
      slider = createTempoSlider(container, () => {});
      const input = container.querySelector('input[type="range"]');
      expect(input.min).toBe('500');
      expect(input.max).toBe('3000');
      expect(input.step).toBe('100');
    });
  });

  describe('default value', () => {
    it('defaults to 500', () => {
      slider = createTempoSlider(container, () => {});
      expect(slider.getValue()).toBe(500);
    });

    it('displays "500 ms" as initial label text', () => {
      slider = createTempoSlider(container, () => {});
      const label = container.querySelector('.tempo-slider-label');
      expect(label.textContent).toBe('500 ms');
    });
  });

  describe('ARIA attributes', () => {
    it('sets aria-label to "Vitesse de lecture"', () => {
      slider = createTempoSlider(container, () => {});
      const input = container.querySelector('input[type="range"]');
      expect(input.getAttribute('aria-label')).toBe('Vitesse de lecture');
    });

    it('sets aria-valuemin to "500"', () => {
      slider = createTempoSlider(container, () => {});
      const input = container.querySelector('input[type="range"]');
      expect(input.getAttribute('aria-valuemin')).toBe('500');
    });

    it('sets aria-valuemax to "3000"', () => {
      slider = createTempoSlider(container, () => {});
      const input = container.querySelector('input[type="range"]');
      expect(input.getAttribute('aria-valuemax')).toBe('3000');
    });

    it('sets aria-valuenow to initial value "500"', () => {
      slider = createTempoSlider(container, () => {});
      const input = container.querySelector('input[type="range"]');
      expect(input.getAttribute('aria-valuenow')).toBe('500');
    });

    it('sets aria-valuetext to "500 millisecondes par note"', () => {
      slider = createTempoSlider(container, () => {});
      const input = container.querySelector('input[type="range"]');
      expect(input.getAttribute('aria-valuetext')).toBe('500 millisecondes par note');
    });
  });

  describe('onChange callback', () => {
    it('fires onChange with new value on input event', () => {
      const onChange = vi.fn();
      slider = createTempoSlider(container, onChange);
      const input = container.querySelector('input[type="range"]');

      // Simulate user interaction
      input.value = '1200';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(onChange).toHaveBeenCalledWith(1200);
    });

    it('updates the label text on input event', () => {
      slider = createTempoSlider(container, () => {});
      const input = container.querySelector('input[type="range"]');
      const label = container.querySelector('.tempo-slider-label');

      input.value = '2000';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(label.textContent).toBe('2000 ms');
    });

    it('updates aria-valuenow on input event', () => {
      slider = createTempoSlider(container, () => {});
      const input = container.querySelector('input[type="range"]');

      input.value = '1500';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(input.getAttribute('aria-valuenow')).toBe('1500');
    });

    it('updates aria-valuetext on input event', () => {
      slider = createTempoSlider(container, () => {});
      const input = container.querySelector('input[type="range"]');

      input.value = '1500';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(input.getAttribute('aria-valuetext')).toBe('1500 millisecondes par note');
    });
  });

  describe('getValue', () => {
    it('returns the current numeric value', () => {
      slider = createTempoSlider(container, () => {});
      expect(slider.getValue()).toBe(500);

      const input = container.querySelector('input[type="range"]');
      input.value = '1800';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(slider.getValue()).toBe(1800);
    });
  });

  describe('setValue', () => {
    it('updates the slider input value', () => {
      slider = createTempoSlider(container, () => {});
      slider.setValue(2500);

      const input = container.querySelector('input[type="range"]');
      expect(input.value).toBe('2500');
    });

    it('updates the label text', () => {
      slider = createTempoSlider(container, () => {});
      slider.setValue(2500);

      const label = container.querySelector('.tempo-slider-label');
      expect(label.textContent).toBe('2500 ms');
    });

    it('updates aria-valuenow', () => {
      slider = createTempoSlider(container, () => {});
      slider.setValue(2500);

      const input = container.querySelector('input[type="range"]');
      expect(input.getAttribute('aria-valuenow')).toBe('2500');
    });

    it('updates aria-valuetext', () => {
      slider = createTempoSlider(container, () => {});
      slider.setValue(2500);

      const input = container.querySelector('input[type="range"]');
      expect(input.getAttribute('aria-valuetext')).toBe('2500 millisecondes par note');
    });

    it('clamps values below minimum to 500', () => {
      slider = createTempoSlider(container, () => {});
      slider.setValue(100);
      expect(slider.getValue()).toBe(500);
    });

    it('clamps values above maximum to 3000', () => {
      slider = createTempoSlider(container, () => {});
      slider.setValue(5000);
      expect(slider.getValue()).toBe(3000);
    });
  });

  describe('destroy', () => {
    it('removes the wrapper element from the container', () => {
      slider = createTempoSlider(container, () => {});
      expect(container.querySelector('.tempo-slider-wrapper')).not.toBeNull();

      slider.destroy();
      expect(container.querySelector('.tempo-slider-wrapper')).toBeNull();
      slider = null; // prevent double-destroy in afterEach
    });

    it('removes input event listener after destroy', () => {
      const onChange = vi.fn();
      slider = createTempoSlider(container, onChange);
      const input = container.querySelector('input[type="range"]');

      slider.destroy();
      slider = null;

      // Even if the input still exists (it shouldn't), events should not fire
      input.value = '2000';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
