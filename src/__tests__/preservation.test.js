/**
 * @vitest-environment jsdom
 */
/**
 * Preservation Property Tests
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 *
 * These tests capture baseline behavior on UNFIXED code that must remain
 * unchanged after the fix is implemented. They use observation-first methodology:
 * observe current behavior, then assert it as a property.
 *
 * Properties tested:
 * - Non-enharmonic keys render exactly |accidentals| symbols
 * - Index 6 enharmonic key renders 6♯ left / 6♭ right
 * - hitTestKey returns correct index/type for coordinates within sectors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { buildSVG, renderCircle } from '../circle/renderer.js';
import { SLICES } from '../circle/keys.js';
import { hitTestKey } from '../modes/hit-test.js';
import { DEFAULT_CONFIG } from '../circle/geometry.js';
import { attachSwipeHandler } from '../modes/swipe-handler.js';
import { attachContextMenuListeners } from '../ui/context-menu.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse the full circle SVG and count accidental symbols (♯ and ♭) in each
 * staff group. Staff groups are <g transform="translate(...)"> elements that
 * contain <text class="accidental"> children.
 */
function parseStaffGroups(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const groups = doc.querySelectorAll('g[transform]');
  const staffGroups = [];

  for (const g of groups) {
    const accidentals = g.querySelectorAll('text.accidental');
    if (accidentals.length > 0 || g.querySelector('text.clef')) {
      const sharps = Array.from(accidentals).filter(el => el.textContent === '♯').length;
      const flats = Array.from(accidentals).filter(el => el.textContent === '♭').length;
      const transform = g.getAttribute('transform');
      staffGroups.push({ transform, sharps, flats, total: accidentals.length });
    }
  }

  return staffGroups;
}

/**
 * Mock SVG element for hit-test testing.
 */
function mockSvgElement({ left = 0, top = 0, width = 980, height = 980 } = {}) {
  return {
    getBoundingClientRect: () => ({ left, top, width, height, right: left + width, bottom: top + height }),
  };
}

/**
 * Convert SVG coordinates to client coordinates for a 1:1 rendered SVG at origin.
 */
function svgToClient(svgX, svgY, svgEl = mockSvgElement()) {
  const rect = svgEl.getBoundingClientRect();
  const scaleX = rect.width / DEFAULT_CONFIG.width;
  const scaleY = rect.height / DEFAULT_CONFIG.height;
  return { x: rect.left + svgX * scaleX, y: rect.top + svgY * scaleY };
}

/**
 * Compute the SVG-space coordinates for the center of a given slice index
 * at a given radius from center.
 */
function sliceCenterCoords(index, radius) {
  const { centerX, centerY } = DEFAULT_CONFIG;
  const angleDeg = -90 + index * 30;
  const angleRad = angleDeg * (Math.PI / 180);
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
}

// ─── Non-enharmonic indices ───────────────────────────────────────────────────

const NON_ENHARMONIC_INDICES = [0, 1, 2, 3, 4, 8, 9, 10, 11];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Preservation: Non-Enharmonic Rendering', () => {
  /**
   * Property: For all non-enharmonic key indices (0-4, 8-11),
   * renderAccidentals(SLICES[i].accidentals) produces exactly
   * |SLICES[i].accidentals| accidental symbols.
   *
   * Observation: On unfixed code, non-enharmonic keys each have a single
   * staff group with exactly |acc| accidentals of the correct type.
   */
  it('non-enharmonic keys render exactly |accidentals| symbols', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NON_ENHARMONIC_INDICES),
        (index) => {
          const svg = buildSVG();
          const parser = new DOMParser();
          const doc = parser.parseFromString(svg, 'image/svg+xml');

          const slice = SLICES[index];
          const acc = slice.accidentals;
          const expectedCount = Math.abs(acc);

          // Each non-enharmonic key has exactly one staff group.
          // We identify it by counting all accidentals in the full SVG
          // and verifying the total matches expectations.
          // More targeted: compute the staff position for this index and find
          // the staff group at that approximate location.
          const { centerX, centerY, staffRadius } = DEFAULT_CONFIG;
          const angleDeg = -90 + index * 30;
          const angleRad = angleDeg * (Math.PI / 180);
          const staffCx = centerX + staffRadius * Math.cos(angleRad);
          const staffCy = centerY + staffRadius * Math.sin(angleRad);

          // The staff group transform is translate(staffCx - 32, staffCy - 10)
          const expectedTx = Math.round(staffCx - 32);
          const expectedTy = Math.round(staffCy - 10);

          // Find the matching staff group
          const groups = doc.querySelectorAll('g[transform]');
          let matchedGroup = null;
          for (const g of groups) {
            const transform = g.getAttribute('transform');
            // Parse translate(x, y)
            const match = transform.match(/translate\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
            if (!match) continue;
            const tx = Math.round(parseFloat(match[1]));
            const ty = Math.round(parseFloat(match[2]));
            // Allow small tolerance for floating point
            if (Math.abs(tx - expectedTx) < 2 && Math.abs(ty - expectedTy) < 2) {
              matchedGroup = g;
              break;
            }
          }

          expect(matchedGroup).not.toBeNull();

          const accidentals = matchedGroup.querySelectorAll('text.accidental');
          expect(accidentals.length).toBe(expectedCount);

          // Verify correct type: sharps for positive, flats for negative
          if (acc > 0) {
            const allSharps = Array.from(accidentals).every(el => el.textContent === '♯');
            expect(allSharps).toBe(true);
          } else if (acc < 0) {
            const allFlats = Array.from(accidentals).every(el => el.textContent === '♭');
            expect(allFlats).toBe(true);
          }
        }
      ),
      { numRuns: NON_ENHARMONIC_INDICES.length }
    );
  });
});

describe('Preservation: Index 6 Enharmonic Rendering', () => {
  /**
   * Property: For index 6 enharmonic key (G♭/F#, acc=6), the left staff
   * renders 6 sharps and the right staff renders 6 flats.
   *
   * Observation: On unfixed code, index 6 correctly renders 6♯/6♭ because
   * renderAccidentals(6) → 6 sharps and renderAccidentals(-6) → 6 flats.
   */
  it('index 6 renders 6 sharps on left staff and 6 flats on right staff', () => {
    fc.assert(
      fc.property(
        fc.constant(6),
        (index) => {
          const svg = buildSVG();
          const parser = new DOMParser();
          const doc = parser.parseFromString(svg, 'image/svg+xml');

          const { centerX, centerY, staffRadius } = DEFAULT_CONFIG;
          const angleDeg = -90 + index * 30; // 90° (bottom)
          const angleRad = angleDeg * (Math.PI / 180);
          const staffCx = centerX + staffRadius * Math.cos(angleRad);
          const staffCy = centerY + staffRadius * Math.sin(angleRad);

          // Left staff: translate(staffCx - 45 - 32, staffCy - 10)
          const leftTx = Math.round(staffCx - 45 - 32);
          const leftTy = Math.round(staffCy - 10);

          // Right staff: translate(staffCx + 45 - 32, staffCy - 10)
          const rightTx = Math.round(staffCx + 45 - 32);
          const rightTy = Math.round(staffCy - 10);

          const groups = doc.querySelectorAll('g[transform]');
          let leftGroup = null;
          let rightGroup = null;

          for (const g of groups) {
            const transform = g.getAttribute('transform');
            const match = transform.match(/translate\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
            if (!match) continue;
            const tx = Math.round(parseFloat(match[1]));
            const ty = Math.round(parseFloat(match[2]));

            if (Math.abs(tx - leftTx) < 2 && Math.abs(ty - leftTy) < 2) {
              leftGroup = g;
            }
            if (Math.abs(tx - rightTx) < 2 && Math.abs(ty - rightTy) < 2) {
              rightGroup = g;
            }
          }

          expect(leftGroup).not.toBeNull();
          expect(rightGroup).not.toBeNull();

          // Left staff: 6 sharps
          const leftAccidentals = leftGroup.querySelectorAll('text.accidental');
          expect(leftAccidentals.length).toBe(6);
          const allLeftSharps = Array.from(leftAccidentals).every(el => el.textContent === '♯');
          expect(allLeftSharps).toBe(true);

          // Right staff: 6 flats
          const rightAccidentals = rightGroup.querySelectorAll('text.accidental');
          expect(rightAccidentals.length).toBe(6);
          const allRightFlats = Array.from(rightAccidentals).every(el => el.textContent === '♭');
          expect(allRightFlats).toBe(true);
        }
      ),
      { numRuns: 1 }
    );
  });
});

describe('Preservation: hitTestKey returns correct index/type for all sectors', () => {
  /**
   * Property: For all 12 key indices × 2 types (major/minor), hitTestKey
   * returns the correct { index, type } for coordinates at the center of
   * the corresponding sector.
   *
   * Observation: On unfixed code, hitTestKey correctly maps coordinates
   * to slice indices based on angle and distance from center.
   */
  it('hitTestKey returns correct index for major ring center coordinates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 11 }),
        (index) => {
          const svg = mockSvgElement();
          const { majorRadius } = DEFAULT_CONFIG;

          // Compute center of the major ring for this slice
          const coords = sliceCenterCoords(index, majorRadius);
          const clientPoint = svgToClient(coords.x, coords.y, svg);

          const result = hitTestKey(clientPoint, svg);
          expect(result).not.toBeNull();
          expect(result.index).toBe(index);
          expect(result.type).toBe('major');
        }
      ),
      { numRuns: 12 }
    );
  });

  it('hitTestKey returns correct index for minor ring center coordinates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 11 }),
        (index) => {
          const svg = mockSvgElement();
          const { minorRadius } = DEFAULT_CONFIG;

          // Compute center of the minor ring for this slice
          const coords = sliceCenterCoords(index, minorRadius);
          const clientPoint = svgToClient(coords.x, coords.y, svg);

          const result = hitTestKey(clientPoint, svg);
          expect(result).not.toBeNull();
          expect(result.index).toBe(index);
          expect(result.type).toBe('minor');
        }
      ),
      { numRuns: 12 }
    );
  });

  it('hitTestKey returns null for coordinates inside inner ring', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 11 }),
        (index) => {
          const svg = mockSvgElement();
          const { innerRadius } = DEFAULT_CONFIG;

          // Use a radius well inside the inner ring
          const coords = sliceCenterCoords(index, innerRadius - 20);
          const clientPoint = svgToClient(coords.x, coords.y, svg);

          const result = hitTestKey(clientPoint, svg);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 12 }
    );
  });

  it('hitTestKey returns null for coordinates outside outer ring', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 11 }),
        (index) => {
          const svg = mockSvgElement();
          const { outerRadius } = DEFAULT_CONFIG;

          // Use a radius well outside the outer ring
          const coords = sliceCenterCoords(index, outerRadius + 50);
          const clientPoint = svgToClient(coords.x, coords.y, svg);

          const result = hitTestKey(clientPoint, svg);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 12 }
    );
  });
});

describe('Preservation: Swipe handler calls onSwipe for swipe gestures', () => {
  /**
   * Property: The swipe handler continues to call onSwipe for swipe gestures.
   *
   * Observation: On unfixed code, attachSwipeHandler correctly classifies
   * fast horizontal movements as swipes and calls the onSwipe callback.
   */
  it('swipe gestures trigger onSwipe callback', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('left', 'right'),
        (direction) => {
          const listeners = {};
          const track = {
            addEventListener: (event, handler) => {
              if (!listeners[event]) listeners[event] = [];
              listeners[event].push(handler);
            },
            removeEventListener: () => {},
          };

          const onSwipe = vi.fn();
          const onTap = vi.fn();

          vi.spyOn(Date, 'now')
            .mockReturnValueOnce(1000)
            .mockReturnValueOnce(1100);

          attachSwipeHandler(track, { onSwipe, onTap });

          const startX = 200;
          const endX = direction === 'left' ? 100 : 300;

          // Trigger touchstart
          listeners.touchstart.forEach(h =>
            h({ touches: [{ clientX: startX, clientY: 100 }] })
          );

          // Trigger touchend
          listeners.touchend.forEach(h =>
            h({ changedTouches: [{ clientX: endX, clientY: 100 }] })
          );

          expect(onSwipe).toHaveBeenCalledWith(`swipe-${direction}`);
          expect(onTap).not.toHaveBeenCalled();

          vi.restoreAllMocks();
        }
      ),
      { numRuns: 2 }
    );
  });
});

describe('Preservation: Right-click (contextmenu) triggers toggleNeighbors', () => {
  /**
   * Property: Right-click on circle SVG hit areas still triggers toggleNeighbors.
   *
   * Observation: On unfixed code, the contextmenu event listener on the SVG
   * calls toggleNeighbors when a hit-area path with data-index/data-type is
   * right-clicked.
   */
  it('contextmenu event on hit-area path calls toggleNeighbors behavior', () => {
    fc.assert(
      fc.property(
        fc.record({
          index: fc.integer({ min: 0, max: 11 }),
          type: fc.constantFrom('major', 'minor'),
        }),
        ({ index, type }) => {
          // Set up DOM
          const container = document.createElement('div');
          container.id = 'circle-container';
          document.body.appendChild(container);

          try {
            // Render circle
            renderCircle('circle-container');

            const svg = container.querySelector('svg');
            expect(svg).not.toBeNull();

            // Attach context menu listeners (creates hit areas)
            attachContextMenuListeners();

            // Find the hit-area path for the target key
            const hitAreas = svg.querySelectorAll('.hit-areas path');
            const targetPath = Array.from(hitAreas).find(
              p => p.dataset.index === String(index) && p.dataset.type === type
            );

            // Hit areas should exist for all 24 keys
            expect(targetPath).not.toBeUndefined();

            // Dispatch contextmenu event
            const contextEvent = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
            });

            const prevented = !targetPath.dispatchEvent(contextEvent);

            // The contextmenu handler calls preventDefault when it finds a valid target
            // This confirms the handler is active and processing the event
            expect(prevented).toBe(true);
          } finally {
            document.body.removeChild(container);
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});
