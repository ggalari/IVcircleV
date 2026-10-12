// Characterization of the neighbourhood overlay as both renderers draw it today.
//
// CHARACTERIZATION test: the fixture was captured from the implementation before
// the neighbourhood-module refactor, so drift in what the full-circle overlay
// (DOM) or the neighbour arc (SVG markup) draws becomes visible. The entries are
// compared as an order-insensitive multiset, because sibling highlight sectors
// never overlap and their paint order carries no meaning. The fixture is a
// characterization baseline, not an independent source of truth; deliberate
// drift is reviewed, never silently accepted.
//
// The focus is the neighbourhood surface only: highlight sectors, roman numerals
// and the centre label — the staffs and slice backgrounds drawn by drawSlice are
// out of scope for this refactor.
//
// Label coordinates are compared to 9 decimal places: unifying the label-angle
// formula across the two renderers reorders one multiply, which moves the last
// digit of a few coordinates by < 1e-12 px. That is not visual drift, so the net
// rounds it away while still catching any real geometry change.
import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createOverlay, showNeighbors } from '../overlays/neighbors.js';
import { renderCircleZoom } from '../modes/circle-zoom.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, '__fixtures__', 'neighborhood-golden.json');

const SVG_NS = 'http://www.w3.org/2000/svg';
const SLICES = 12;
const TYPES = ['major', 'minor'];
const NEIGHBORHOOD_CLASS = /highlight-|roman-numeral|center-key/;

/**
 * A stable, order-insensitive description of every neighbourhood element under
 * `root` (a highlight path, a roman numeral, or a centre-label text).
 */
function describeNeighborhood(root) {
  const records = [...root.querySelectorAll('path, text')]
    .filter((el) => NEIGHBORHOOD_CLASS.test(el.getAttribute('class') || ''))
    .map((el) => {
      const record = {
        tag: el.tagName.toLowerCase(),
        class: el.getAttribute('class')
      };
      const d = el.getAttribute('d');
      if (d) record.d = d;
      const x = el.getAttribute('x');
      if (x) record.x = Number(x).toFixed(9);
      const y = el.getAttribute('y');
      if (y) record.y = Number(y).toFixed(9);
      if (el.tagName.toLowerCase() === 'text') record.text = el.textContent;
      const opacity = el.getAttribute('opacity') ?? el.style.opacity;
      if (opacity) record.opacity = String(opacity);
      for (const attr of ['stroke', 'stroke-width', 'stroke-opacity']) {
        const value = el.getAttribute(attr);
        if (value) record[attr] = value;
      }
      return record;
    });

  records.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return records;
}

/** Render the full-circle overlay for one key into a fresh SVG and describe it. */
function overlayFor(keyInfo) {
  document.body.innerHTML = '';
  const svg = document.createElementNS(SVG_NS, 'svg');
  document.body.appendChild(svg);
  createOverlay(svg);
  showNeighbors(keyInfo);
  return describeNeighborhood(svg);
}

/** Render the neighbour arc for one key and describe the overlay it emits. */
function zoomFor(keyInfo) {
  const container = renderCircleZoom(keyInfo);
  const svg = container.querySelector('svg');
  return describeNeighborhood(svg);
}

function buildGolden() {
  const golden = {};
  for (let index = 0; index < SLICES; index++) {
    for (const type of TYPES) {
      document.cookie = 'showCenterLabel=; max-age=0; path=/';
      const keyInfo = { index, type };
      golden[`${index}:${type}`] = {
        overlay: overlayFor(keyInfo),
        zoom: zoomFor(keyInfo)
      };
    }
  }
  return golden;
}

describe('neighbourhood render characterization', () => {
  it('matches the frozen overlay + arc baseline for all 24 keys', () => {
    const golden = buildGolden();

    if (!existsSync(fixturePath)) {
      mkdirSync(dirname(fixturePath), { recursive: true });
      writeFileSync(fixturePath, JSON.stringify(golden, null, 2) + '\n');
      console.info(`[neighborhood-golden] baseline created at ${fixturePath}; review and commit it.`);
      return;
    }

    const expected = JSON.parse(readFileSync(fixturePath, 'utf8'));
    expect(golden).toEqual(expected);
  });
});
