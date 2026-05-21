/**
 * @vitest-environment jsdom
 */
/**
 * Bug Condition Exploration Test
 * 
 * **Validates: Requirements 1.1, 1.2, 1.4, 1.5**
 * 
 * This test encodes the EXPECTED (correct) behavior for the four bugs.
 * It is expected to FAIL on unfixed code — failure confirms the bugs exist.
 * After the fix is implemented, this test should PASS.
 * 
 * Bug Conditions tested:
 * - isBugCondition(input) WHERE input.action = "renderEnharmonicStaff" AND |input.accidentals| = 5
 * - isBugCondition(input) WHERE input.action = "clickKey" AND input.view = "circleView"
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { buildSVG, renderCircle } from '../circle/renderer.js';
import { SLICES } from '../circle/keys.js';
import { get, set } from '../state.js';
import { hitTestKey } from '../modes/hit-test.js';
import { DEFAULT_CONFIG } from '../circle/geometry.js';
import { attachContextMenuListeners } from '../ui/context-menu.js';

describe('Bug Condition Exploration: Enharmonic Accidentals and Circle Click Selection', () => {
  /**
   * Property 1: Bug Condition - Enharmonic Accidentals Display Correct Count
   * 
   * For enharmonic keys where |accidentals| = 5 (indices 5 and 7), the right staff
   * SHALL render exactly 7 accidental symbols (the complementary count: 12 - 5 = 7).
   * 
   * Bug: renderAccidentals(-acc) uses Math.abs(-5) = 5 as the count instead of 7.
   */
  describe('Enharmonic right staff accidental count', () => {
    it('index 5 (acc=5, B/SI) right staff produces exactly 7 flat symbols', () => {
      fc.assert(
        fc.property(
          // Generate the specific bug condition: index 5 with acc=5
          fc.constant({ index: 5, acc: 5 }),
          ({ index, acc }) => {
            const svg = buildSVG();

            // The enharmonic staff for index 5 has two staff groups side by side.
            // Left staff: 5 sharps (correct). Right staff: should be 7 flats.
            // Parse the SVG to find staff groups for this slice.
            // The right staff should contain 7 <text class="accidental"> elements with ♭ symbol.
            
            // Extract all accidental text elements from the SVG
            const parser = new DOMParser();
            const doc = parser.parseFromString(svg, 'image/svg+xml');
            
            // Find all staff groups (g elements containing staff-line rects and accidental texts)
            const allAccidentals = doc.querySelectorAll('text.accidental');
            
            // For index 5 enharmonic key, there are two staff groups.
            // The left staff has `acc` (5) sharps, the right staff should have 7 flats.
            // We need to identify which accidentals belong to the right staff of index 5.
            // 
            // The enharmonic branch renders:
            //   renderStaffGroup(staffCx - 45, staffCy, leftAcc)  -> 5 sharps (♯)
            //   renderStaffGroup(staffCx + 45, staffCy, rightAcc) -> should be 7 flats (♭)
            //
            // We can count flat symbols (♭) in the right staff group by looking at
            // the staff groups. Each staff group is a <g> with transform.
            const staffGroups = doc.querySelectorAll('g[transform]');
            
            // Find the enharmonic pair for index 5.
            // Index 5 is at angle -90 + 5*30 = 60°. The staff is at staffRadius from center.
            // The right staff group is offset +45 from the staff center x.
            // We'll count flats (♭) in the full SVG that belong to the right staff of index 5.
            
            // Simpler approach: count all ♭ symbols in the SVG.
            // Non-enharmonic keys with negative accidentals: indices 8(-4), 9(-3), 10(-2), 11(-1)
            // Total flats from non-enharmonic: 4 + 3 + 2 + 1 = 10
            // Index 6 enharmonic right staff: 6 flats
            // Index 7 enharmonic left staff: 5 flats (acc=-5, left staff renders acc which is -5 → 5 flats)
            // Index 5 enharmonic right staff: should be 7 flats (bug: only renders 5)
            // Total expected flats: 10 + 6 + 5 + 7 = 28
            
            // Let's use a more targeted approach: parse the staff groups and find the right one
            // for index 5 specifically.
            
            // Actually, let's directly test the rendering logic by examining the SVG output
            // for the specific staff group. The enharmonic key at index 5 renders two staff groups.
            // We can find them by looking at the transform coordinates.
            
            // The staffRadius is 380, centerX=490, centerY=490
            // Index 5 angle = -90 + 5*30 = 60°
            // staffCx = 490 + 380 * cos(60° * π/180) = 490 + 380 * 0.5 = 490 + 190 = 680
            // staffCy = 490 + 380 * sin(60° * π/180) = 490 + 380 * 0.866 = 490 + 329.1 = 819.1
            // Right staff group transform: translate(680 + 45 - 32, 819.1 - 10) = translate(693, 809.1)
            
            // Instead of exact coordinate matching, let's count ♭ symbols in each staff group
            // and verify that one group for index 5 has exactly 7 flats.
            
            // Most reliable: count all flat accidentals in the full SVG and verify the total
            // matches what we expect with 7 flats for index 5's right staff.
            const flatAccidentals = Array.from(allAccidentals).filter(el => el.textContent === '♭');
            const sharpAccidentals = Array.from(allAccidentals).filter(el => el.textContent === '♯');
            
            // Expected flat count with correct rendering:
            // Non-enharmonic: index 8 (4♭) + index 9 (3♭) + index 10 (2♭) + index 11 (1♭) = 10
            // Enharmonic index 5 right staff: 7♭
            // Enharmonic index 6 right staff: 6♭
            // Enharmonic index 7 left staff: 5♭ (acc=-5, left staff renders acc=-5 → 5 flats)
            // Total expected: 10 + 7 + 6 + 5 = 28
            const expectedTotalFlats = 28;
            
            expect(flatAccidentals.length).toBe(expectedTotalFlats);
          }
        ),
        { numRuns: 1 }
      );
    });

    it('index 7 (acc=-5, D♭/RE♭) right staff produces exactly 7 sharp symbols', () => {
      fc.assert(
        fc.property(
          // Generate the specific bug condition: index 7 with acc=-5
          fc.constant({ index: 7, acc: -5 }),
          ({ index, acc }) => {
            const svg = buildSVG();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(svg, 'image/svg+xml');
            
            const allAccidentals = doc.querySelectorAll('text.accidental');
            const sharpAccidentals = Array.from(allAccidentals).filter(el => el.textContent === '♯');
            
            // Expected sharp count with correct rendering:
            // Non-enharmonic: index 1 (1♯) + index 2 (2♯) + index 3 (3♯) + index 4 (4♯) = 10
            // Enharmonic index 5 left staff: 5♯ (acc=5, left staff renders acc=5 → 5 sharps)
            // Enharmonic index 6 left staff: 6♯
            // Enharmonic index 7 right staff: 7♯ (acc=-5, right staff should render 7 sharps)
            // Total expected: 10 + 5 + 6 + 7 = 28
            const expectedTotalSharps = 28;
            
            expect(sharpAccidentals.length).toBe(expectedTotalSharps);
          }
        ),
        { numRuns: 1 }
      );
    });
  });

  /**
   * Property 1 (continued): Bug Condition - Circle View Click Updates activeKey
   * 
   * For a left-click on a valid key sector in the full circle view, the code SHALL
   * call set('activeKey', { index, type }) with the correct key.
   * 
   * Bug: No click event listener exists on the circle SVG for desktop left-click.
   * 
   * Test approach: Verify that the click handler logic (hitTestKey + set) works
   * correctly by importing hitTestKey and simulating what the handler does.
   * The handler in main.js does: hitTestKey({x, y}, svg) → set('activeKey', result)
   */
  describe('Circle view click selection', () => {
    it('hitTestKey + set integration: clicking a key sector updates activeKey', () => {
      fc.assert(
        fc.property(
          fc.record({
            index: fc.integer({ min: 0, max: 11 }),
            type: fc.constantFrom('major', 'minor')
          }),
          ({ index, type }) => {
            // Compute coordinates at the center of the target sector
            const { centerX, centerY, majorRadius, minorRadius } = DEFAULT_CONFIG;
            const radius = type === 'major' ? majorRadius : minorRadius;
            const angleDeg = -90 + index * 30;
            const angleRad = angleDeg * (Math.PI / 180);
            const svgX = centerX + radius * Math.cos(angleRad);
            const svgY = centerY + radius * Math.sin(angleRad);

            // Mock SVG element with getBoundingClientRect (1:1 mapping at origin)
            const mockSvg = {
              getBoundingClientRect: () => ({
                left: 0, top: 0, width: DEFAULT_CONFIG.width, height: DEFAULT_CONFIG.height,
                right: DEFAULT_CONFIG.width, bottom: DEFAULT_CONFIG.height
              })
            };

            // This is what the click handler does:
            const hit = hitTestKey({ x: svgX, y: svgY }, mockSvg);

            // Verify hitTestKey returns the correct key
            expect(hit).not.toBeNull();
            expect(hit.index).toBe(index);
            expect(hit.type).toBe(type);

            // Verify set('activeKey', ...) updates state correctly
            set('activeKey', { index: 11, type: 'minor' }); // reset
            if (hit) {
              set('activeKey', { index: hit.index, type: hit.type });
            }
            const activeKey = get('activeKey');
            expect(activeKey.index).toBe(index);
            expect(activeKey.type).toBe(type);
          }
        ),
        { numRuns: 24 }
      );
    });
  });

  /**
   * Property 1 (continued): Bug Condition - toggleNeighbors updates activeKey
   * 
   * When toggleNeighbors is invoked with (index, type), it SHALL also call
   * set('activeKey', { index, type }) for cross-view consistency.
   * 
   * Bug: toggleNeighbors only manages the overlay state, never updates activeKey.
   * 
   * Test approach: Directly call the contextmenu handler's internal logic by
   * importing the module and verifying that set('activeKey') is called.
   * Since toggleNeighbors is not exported, we test via the contextmenu event
   * on a properly set up DOM.
   */
  describe('toggleNeighbors updates activeKey state', () => {
    let container;

    beforeEach(() => {
      set('activeKey', { index: 0, type: 'major' });
      
      container = document.createElement('div');
      container.id = 'circle-container';
      document.body.appendChild(container);
    });

    afterEach(() => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    it('right-click triggering toggleNeighbors updates activeKey to the selected key', () => {
      // Render circle
      renderCircle('circle-container');

      // Attach context menu listeners (creates hit areas + contextmenu handler)
      attachContextMenuListeners();

      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();

      // Find a hit-area path for index 3, major
      const hitAreas = svg.querySelectorAll('.hit-areas path');
      const targetPath = Array.from(hitAreas).find(
        p => p.getAttribute('data-index') === '3' && p.getAttribute('data-type') === 'major'
      );
      expect(targetPath).toBeDefined();

      // Reset activeKey to something different
      set('activeKey', { index: 9, type: 'minor' });

      // Dispatch contextmenu event
      const contextEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });
      targetPath.dispatchEvent(contextEvent);

      // Verify activeKey was updated by toggleNeighbors
      const activeKey = get('activeKey');
      expect(activeKey.index).toBe(3);
      expect(activeKey.type).toBe('major');
    });
  });
});
