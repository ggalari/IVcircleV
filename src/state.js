/**
 * The declared domain store. Every key the app reads or writes is declared here
 * with its initial value; `set` and `subscribe` reject undeclared keys so a
 * typo can no longer read back `undefined` silently. Keys are declared, not
 * invented on first write.
 */

/** @type {Map<string, { value: any, listeners: Set<Function> }>} */
const store = new Map();

/** The declared keys and their initial values. */
const INITIAL_STATE = {
  activeKey: { index: 0, type: 'major' },
  currentMode: 0,
  isTransitioning: false,
  instrument: 'guitar',
  playbackState: { isPlaying: false, sectionId: null, currentIndex: -1, type: null },
  selectedKeyIndex: null,
  overlayType: null,
  overlayActive: false,
  labelToggle: 0,
};

function isDeclared(key) {
  return Object.hasOwn(INITIAL_STATE, key);
}

function assertDeclared(key) {
  if (!isDeclared(key)) {
    throw new Error(`Unknown state key: "${key}"`);
  }
}

/**
 * Shallow equality check for plain objects.
 * Returns true if both values are objects with the same keys and values (===).
 * Falls back to === for non-object values.
 */
function isEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function getEntry(key) {
  if (!store.has(key)) {
    store.set(key, { value: INITIAL_STATE[key], listeners: new Set() });
  }
  return store.get(key);
}

export function get(key) {
  if (store.has(key)) return store.get(key).value;
  return isDeclared(key) ? INITIAL_STATE[key] : undefined;
}

export function set(key, value) {
  assertDeclared(key);
  const entry = getEntry(key);
  if (isEqual(entry.value, value)) return;
  entry.value = value;
  for (const cb of entry.listeners) {
    cb(value);
  }
}

export function subscribe(key, callback) {
  assertDeclared(key);
  const entry = getEntry(key);
  entry.listeners.add(callback);
  return () => {
    entry.listeners.delete(callback);
  };
}

/**
 * Restore every declared key to its initial value and drop all subscribers.
 * Test seam: gives each test a clean store without hand-rolled resets.
 */
export function reset() {
  store.clear();
}
