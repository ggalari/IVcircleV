// overlays/neighborhood.js — the one description of the diatonic neighbourhood
// that both the full-circle overlay (DOM) and the neighbour arc (SVG markup) draw.
//
// Expected values are independent music-theory facts (the roman numerals of the
// circle-of-fifths neighbourhood), not recomputed from the implementation.
import { describe, it, expect } from 'vitest';
import {
  getNeighborhood,
  neighborhoodSector,
  neighborhoodLabelPoint,
} from '../overlays/neighborhood.js';
import { DEFAULT_CONFIG, sectorPath } from '../circle/geometry.js';

/** Index entries by their position offset and ring so tests read by degree. */
function byPosition(entries) {
  const map = {};
  for (const entry of entries) {
    map[`${entry.position}:${entry.ring}`] = entry;
  }
  return map;
}

describe('getNeighborhood', () => {
  it('lists the six immediate sectors plus the diminished, for C major', () => {
    const { entries } = getNeighborhood({ index: 0, type: 'major' });
    expect(entries).toHaveLength(7);

    const m = byPosition(entries);
    expect(m['0:outer']).toMatchObject({ sliceIndex: 0, type: 'major', isTonic: true, label: 'I' });
    expect(m['1:outer']).toMatchObject({ sliceIndex: 1, type: 'major', isTonic: false, label: 'V' });
    expect(m['-1:outer']).toMatchObject({ sliceIndex: 11, type: 'major', label: 'IV' });
    expect(m['0:inner']).toMatchObject({ sliceIndex: 0, type: 'minor', label: 'vi' });
    expect(m['1:inner']).toMatchObject({ sliceIndex: 1, type: 'minor', label: 'iii' });
    expect(m['-1:inner']).toMatchObject({ sliceIndex: 11, type: 'minor', label: 'ii' });
    expect(m['2:inner']).toMatchObject({ sliceIndex: 2, type: 'minor', isTonic: false, label: 'vii°' });
  });

  it('marks exactly one entry as the tonic', () => {
    const { entries } = getNeighborhood({ index: 0, type: 'major' });
    expect(entries.filter((e) => e.isTonic)).toHaveLength(1);
  });

  it('puts the diminished sector only on the inner ring', () => {
    const { entries } = getNeighborhood({ index: 0, type: 'major' });
    expect(byPosition(entries)['2:outer']).toBeUndefined();
  });

  it('labels a minor key neighbourhood from the minor degree set, tonic on the inner ring', () => {
    const { entries, center } = getNeighborhood({ index: 9, type: 'minor' });
    const m = byPosition(entries);

    expect(m['0:inner']).toMatchObject({ sliceIndex: 9, type: 'minor', isTonic: true, label: 'i' });
    expect(m['1:inner']).toMatchObject({ label: 'v' });
    expect(m['-1:inner']).toMatchObject({ label: 'iv' });
    expect(m['0:outer']).toMatchObject({ type: 'major', isTonic: false, label: 'III' });
    expect(m['1:outer']).toMatchObject({ label: 'VII' });
    expect(m['-1:outer']).toMatchObject({ label: 'VI' });
    expect(m['2:inner']).toMatchObject({ sliceIndex: 11, label: 'ii°' });

    expect(center).toEqual({ keyName: 'do', typeLabel: 'mineur', typeClass: 'roman-numeral--minor' });
  });

  it('wraps slice indexes around the circle', () => {
    const { entries } = getNeighborhood({ index: 11, type: 'major' });
    const m = byPosition(entries);
    expect(m['1:outer'].sliceIndex).toBe(0);
    expect(m['-1:outer'].sliceIndex).toBe(10);
    expect(m['2:inner'].sliceIndex).toBe(1);
  });

  it('names the centre label from the key slice', () => {
    expect(getNeighborhood({ index: 0, type: 'major' }).center).toEqual({
      keyName: 'DO',
      typeLabel: 'Majeur',
      typeClass: 'roman-numeral--major',
    });
    expect(getNeighborhood({ index: 0, type: 'minor' }).center).toEqual({
      keyName: 'la',
      typeLabel: 'mineur',
      typeClass: 'roman-numeral--minor',
    });
  });
});

describe('neighborhoodSector', () => {
  it('builds the outer-ring sector path at the given angle index', () => {
    // Outer ring spans middleRadius(215)..outerRadius(320), half-slice 15°.
    expect(neighborhoodSector(0, 'outer')).toBe(sectorPath(490, 490, 215, 320, -105, -75));
  });

  it('builds the inner-ring sector path at the given angle index', () => {
    expect(neighborhoodSector(2, 'inner')).toBe(sectorPath(490, 490, 110, 215, -45, -15));
  });
});

describe('neighborhoodLabelPoint', () => {
  it('places an outer-ring numeral 12° clockwise of the slice centre, inset from the rim', () => {
    const { x, y } = neighborhoodLabelPoint(0, 'outer');
    // radius 320-12=308, angle -78°
    expect(x).toBeCloseTo(490 + 308 * Math.cos((-78 * Math.PI) / 180), 6);
    expect(y).toBeCloseTo(490 + 308 * Math.sin((-78 * Math.PI) / 180), 6);
  });

  it('places an inner-ring numeral against the middle radius', () => {
    const { x, y } = neighborhoodLabelPoint(0, 'inner');
    // radius 215-12=203, angle -78°
    expect(x).toBeCloseTo(490 + 203 * Math.cos((-78 * Math.PI) / 180), 6);
    expect(y).toBeCloseTo(490 + 203 * Math.sin((-78 * Math.PI) / 180), 6);
  });

  it('reads its geometry from DEFAULT_CONFIG', () => {
    const { x } = neighborhoodLabelPoint(0, 'outer');
    const expectedRadius = DEFAULT_CONFIG.outerRadius - 12;
    expect(x).toBeCloseTo(
      DEFAULT_CONFIG.centerX + expectedRadius * Math.cos((-78 * Math.PI) / 180),
      6
    );
  });
});
