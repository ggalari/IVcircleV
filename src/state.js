/** @type {Map<string, { value: any, listeners: Set<Function> }>} */
const store = new Map();

function getEntry(key) {
  if (!store.has(key)) {
    store.set(key, { value: undefined, listeners: new Set() });
  }
  return store.get(key);
}

export function get(key) {
  return store.has(key) ? store.get(key).value : undefined;
}

export function set(key, value) {
  const entry = getEntry(key);
  if (entry.value === value) return;
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
