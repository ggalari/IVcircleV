/**
 * Hamburger menu — floating dropdown triggered by the ☰ button.
 * Standard pattern: click to open, click action to execute + close,
 * click outside to dismiss.
 */

/**
 * Initialize the hamburger menu.
 * @returns {function} Cleanup function to remove all listeners
 */
export function attachHamburgerMenu() {
  const btn = document.querySelector('.hamburger-btn');
  const dropdown = document.querySelector('.hamburger-dropdown');

  if (!btn || !dropdown) {
    return () => {};
  }

  function open() {
    dropdown.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }

  function close() {
    dropdown.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  function toggle(e) {
    e.stopPropagation();
    if (dropdown.hidden) {
      open();
    } else {
      close();
    }
  }

  function handleOutsideClick(e) {
    if (dropdown.hidden) return;
    if (btn.contains(e.target) || dropdown.contains(e.target)) return;
    close();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && !dropdown.hidden) {
      close();
      btn.focus();
    }
  }

  function handleItemClick() {
    // Let the action's own handler fire first, then close
    setTimeout(close, 0);
  }

  btn.addEventListener('click', toggle);
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleKeydown);

  const items = dropdown.querySelectorAll('.dropdown-item');
  items.forEach(item => item.addEventListener('click', handleItemClick));

  return function cleanup() {
    btn.removeEventListener('click', toggle);
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleKeydown);
    items.forEach(item => item.removeEventListener('click', handleItemClick));
  };
}
