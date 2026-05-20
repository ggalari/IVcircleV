/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachKeyboardNav } from '../ui/keyboard-nav.js';

describe('ui/keyboard-nav', () => {
  let callbacks;
  let cleanup;

  beforeEach(() => {
    callbacks = {
      onNext: vi.fn(),
      onPrev: vi.fn(),
    };
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });

  it('calls onNext when ArrowRight is pressed', () => {
    cleanup = attachKeyboardNav(callbacks);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(callbacks.onNext).toHaveBeenCalledTimes(1);
    expect(callbacks.onPrev).not.toHaveBeenCalled();
  });

  it('calls onPrev when ArrowLeft is pressed', () => {
    cleanup = attachKeyboardNav(callbacks);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(callbacks.onPrev).toHaveBeenCalledTimes(1);
    expect(callbacks.onNext).not.toHaveBeenCalled();
  });

  it('ignores other keys', () => {
    cleanup = attachKeyboardNav(callbacks);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(callbacks.onNext).not.toHaveBeenCalled();
    expect(callbacks.onPrev).not.toHaveBeenCalled();
  });

  it('ignores arrow keys when an INPUT is focused', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    cleanup = attachKeyboardNav(callbacks);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

    expect(callbacks.onNext).not.toHaveBeenCalled();
    expect(callbacks.onPrev).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('ignores arrow keys when a TEXTAREA is focused', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    cleanup = attachKeyboardNav(callbacks);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(callbacks.onNext).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('ignores arrow keys when a SELECT is focused', () => {
    const select = document.createElement('select');
    document.body.appendChild(select);
    select.focus();

    cleanup = attachKeyboardNav(callbacks);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

    expect(callbacks.onPrev).not.toHaveBeenCalled();

    document.body.removeChild(select);
  });

  it('returns a cleanup function that removes the listener', () => {
    cleanup = attachKeyboardNav(callbacks);
    cleanup();
    cleanup = null;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

    expect(callbacks.onNext).not.toHaveBeenCalled();
    expect(callbacks.onPrev).not.toHaveBeenCalled();
  });

  it('responds to arrow keys when a non-input element is focused', () => {
    const div = document.createElement('div');
    div.tabIndex = 0;
    document.body.appendChild(div);
    div.focus();

    cleanup = attachKeyboardNav(callbacks);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(callbacks.onNext).toHaveBeenCalledTimes(1);

    document.body.removeChild(div);
  });
});
