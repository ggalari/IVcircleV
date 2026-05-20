/** @type {Map<string, { value: any, listeners: Set<Function> }>} */
const store = new Map();

/** Default initial values for state keys */
const INITIAL_STATE = {
  activeKey: { index: 0, type: 'major' },
  currentMode: 0,
  isTransitioning: false,
};

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
    const initial = Object.hasOwn(INITIAL_STATE, key) ? INITIAL_STATE[key] : undefined;
    store.set(key, { value: initial, listeners: new Set() });
  }
  return store.get(key);
}

export function get(key) {
  if (!store.has(key) && Object.hasOwn(INITIAL_STATE, key)) {
    return INITIAL_STATE[key];
  }
  return store.has(key) ? store.get(key).value : undefined;
}

export function set(key, value) {
  const entry = getEntry(key);
  if (isEqual(entry.value, value)) return;
  entry.value = value;
  for (const cb of entry.listeners) {
    cb(value);
  }
}

export function subscribe(key, callback) {
  const entry = getEntry(key);
  entry.listeners.add(callback);
  return () => {
    entry.listeners.delete(callback);
  };
}
