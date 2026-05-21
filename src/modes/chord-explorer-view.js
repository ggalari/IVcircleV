// Chord Explorer View — second mode panel (mode 1).
// Displays diatonic triads and seventh chords using abcjs with w: labels.

import { get, subscribe } from '../state.js';
import { getDiatonicTriads, getDiatonicSevenths } from '../theory/chords.js';
import { renderChordStaff, formatChordQuality, getSingleNoteName } from './staff-renderer.js';
import { SLICES } from '../circle/keys.js';
import { renderCircleZoom } from './circle-zoom.js';

function getKeyDisplayName(activeKey) {
  const slice = SLICES[activeKey.index];
  const name = activeKey.type === 'major' ? slice.major : slice.minor;
  const typeLabel = activeKey.type === 'major' ? 'Majeur' : 'mineur';
  return `${name} ${typeLabel}`;
}

function renderContent(panel, activeKey) {
  const triads = getDiatonicTriads(activeKey.index, activeKey.type);
  const sevenths = getDiatonicSevenths(activeKey.index, activeKey.type);
  const keyName = getKeyDisplayName(activeKey);

  panel.innerHTML = '';

  // Title
  const title = document.createElement('h2');
  title.className = 'chord-explorer__title';
  title.textContent = `${keyName} — Accords diatoniques`;
  panel.appendChild(title);

  // Zoomed circle
  const zoomEl = renderCircleZoom(activeKey);
  panel.appendChild(zoomEl);

  // Triads
  const triadsSection = document.createElement('div');
  triadsSection.className = 'chord-explorer__staff chord-explorer__staff--triads';
  const triadsSubtitle = document.createElement('h4');
  triadsSubtitle.className = 'chord-explorer__subtitle';
  triadsSubtitle.textContent = 'Triades';
  triadsSection.appendChild(triadsSubtitle);
  renderChordStaff(triadsSection, {
    sliceIndex: activeKey.index,
    keyType: activeKey.type,
    chords: triads,
    labels: triads.map(c => `${c.roman}|${getSingleNoteName(c.root)}${formatChordQuality(c.quality)}`),
    names: null
  });
  panel.appendChild(triadsSection);

  // Sevenths
  const seventhsSection = document.createElement('div');
  seventhsSection.className = 'chord-explorer__staff chord-explorer__staff--sevenths';
  const seventhsSubtitle = document.createElement('h4');
  seventhsSubtitle.className = 'chord-explorer__subtitle';
  seventhsSubtitle.textContent = 'Accords de septième';
  seventhsSection.appendChild(seventhsSubtitle);
  renderChordStaff(seventhsSection, {
    sliceIndex: activeKey.index,
    keyType: activeKey.type,
    chords: sevenths,
    labels: sevenths.map(c => `${c.roman}|${getSingleNoteName(c.root)}${formatChordQuality(c.quality)}`),
    names: null
  });
  panel.appendChild(seventhsSection);
}

export function initChordExplorerView(panel) {
  const initialKey = get('activeKey') || { index: 0, type: 'major' };
  renderContent(panel, initialKey);
  const unsubKey = subscribe('activeKey', (activeKey) => {
    renderContent(panel, activeKey);
  });
  const unsubLabel = subscribe('labelToggle', () => {
    const activeKey = get('activeKey') || { index: 0, type: 'major' };
    renderContent(panel, activeKey);
  });
  return () => { unsubKey(); unsubLabel(); };
}
