# Implementation Plan: Key Explorer Modes

## Overview

Transform the Circle of Fifths app into a three-mode exploration system (Full Circle, Chord Explorer, Scale Explorer) with horizontal swipe navigation, keyboard/chevron controls, and a page indicator. The implementation builds incrementally: pure theory modules first, then gesture classification, then the mode switcher UI, and finally wiring everything together.

## Tasks

- [x] 1. Create pure theory modules
  - [x] 1.1 Implement `src/theory/chords.js` — diatonic chord generation
    - Export `MAJOR_TRIAD_QUALITIES`, `MINOR_TRIAD_QUALITIES`, `MAJOR_SEVENTH_QUALITIES`, `MINOR_SEVENTH_QUALITIES` arrays
    - Export `getDiatonicTriads(keyIndex, keyType)` returning 7 chord objects with `degree`, `roman`, `root`, `quality`, `intervals`, `staffPositions`
    - Export `getDiatonicSevenths(keyIndex, keyType)` returning 7 seventh chord objects
    - Use SLICES from `src/circle/keys.js` for root note names
    - Roman numerals: uppercase for major, lowercase for minor, ° suffix for diminished
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 1.2 Write property test for diatonic chord generation (Property 7)
    - **Property 7: Diatonic Chord Generation Correctness**
    - For any keyIndex in [0,11] and keyType in {'major','minor'}, `getDiatonicTriads` returns exactly 7 chords with qualities matching the expected pattern
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

  - [x] 1.3 Implement `src/theory/scales.js` — scale generation
    - Export `SCALE_INTERVALS` object with `major`, `naturalMinor`, `harmonicMinor`, `melodicMinor` interval arrays
    - Export `getScale(keyIndex, keyType, scaleType)` returning `ScaleResult` with `name`, `tonic`, `notes` (8 notes), `intervals`, `staffPositions`
    - Export `getAllScales(keyIndex, keyType)` returning array of 4 ScaleResult objects
    - Use SLICES from `src/circle/keys.js` for tonic names
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 1.4 Write property test for scale generation (Property 8)
    - **Property 8: Scale Generation Interval Correctness**
    - For any keyIndex in [0,11] and scaleType, the generated scale contains exactly 8 notes and intervals match the defined pattern
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [x] 2. Implement gesture classifier
  - [x] 2.1 Implement `src/modes/gesture-classifier.js` — pure gesture classification function
    - Export constants: `SWIPE_MIN_DX = 30`, `SWIPE_MAX_DURATION = 300`, `TAP_MAX_DISPLACEMENT = 10`, `TAP_MAX_DURATION = 300`
    - Export `classifyGesture(dx, dy, duration)` returning one of `'tap'`, `'swipe-left'`, `'swipe-right'`, `'discard'`
    - If |dx| > SWIPE_MIN_DX and duration < SWIPE_MAX_DURATION → swipe (direction based on sign of dx)
    - If sqrt(dx²+dy²) ≤ TAP_MAX_DISPLACEMENT and duration ≤ TAP_MAX_DURATION → tap
    - Otherwise → discard
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 2.2 Write property test for gesture classification (Property 6)
    - **Property 6: Gesture Classification Partition**
    - For any (dx, dy, duration), `classifyGesture` returns exactly one of the 4 categories; swipe/tap/discard conditions are mutually exclusive and exhaustive
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement mode switcher and state integration
  - [x] 4.1 Extend `src/state.js` with new state keys
    - Add initial values for `activeKey` (`{ index: 0, type: 'major' }`), `currentMode` (`0`), `isTransitioning` (`false`)
    - Add a `setIfChanged` helper or use existing `set` (which already skips if value === previous)
    - Add deep equality check for `activeKey` object comparison (current `set` uses `===`)
    - _Requirements: 1.1, 1.3, 2.2, 11.1_

  - [ ]* 4.2 Write property tests for state invariants (Properties 1, 3, 4, 5)
    - **Property 1: Active Key Invariant** — activeKey always valid after any sequence of operations
    - **Property 3: Key Selection State Update** — selecting key sets state to exactly {index, type}
    - **Property 4: Key Selection Idempotence** — selecting same key does not trigger change event
    - **Property 5: Mode Preserved on Key Change** — currentMode unchanged after key selection
    - **Validates: Requirements 1.3, 2.1, 2.2, 2.3, 11.1**

  - [x] 4.3 Implement `src/modes/mode-switcher.js` — horizontal panel layout and transitions
    - Export `createModeSwitcher(container)` returning `{ goTo, next, prev, current, destroy }`
    - Create a `.mode-track` div with 3 `.mode-panel` children (width: 100% each)
    - Use CSS `transform: translateX(...)` for transitions with 300ms duration
    - `goTo(n)` clamps n to [0,2], sets `currentMode` state, animates track
    - `next()` / `prev()` increment/decrement with clamping
    - Set `isTransitioning` during animation, ignore requests while transitioning
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.1, 11.3_

  - [ ]* 4.4 Write property test for mode navigation clamping (Property 2)
    - **Property 2: Mode Navigation Clamping**
    - For any current mode and navigation action, resulting mode is always in [0,2]
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2**

- [x] 5. Implement swipe handler and navigation UI
  - [x] 5.1 Implement `src/modes/swipe-handler.js` — touch event routing
    - Export `attachSwipeHandler(trackElement, callbacks)` returning cleanup function
    - Record touchstart position and time, compute dx/dy/duration on touchend
    - Call `classifyGesture(dx, dy, duration)` and route result to `callbacks.onSwipe` or `callbacks.onTap`
    - Prevent default on touchmove when horizontal displacement detected (avoid scroll)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 3.1, 3.2_

  - [x] 5.2 Implement `src/ui/chevrons.js` — left/right chevron buttons
    - Export `createChevrons(container, callbacks)` returning cleanup function
    - Create left (‹) and right (›) button elements positioned at viewport edges
    - Subscribe to `currentMode` state: hide left chevron at mode 0, hide right at mode 2
    - Wire click handlers to `callbacks.onPrev` / `callbacks.onNext`
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 5.3 Implement `src/ui/keyboard-nav.js` — arrow key listener
    - Export `attachKeyboardNav(callbacks)` returning cleanup function
    - Listen for `keydown` on document for ArrowLeft / ArrowRight
    - Ignore if `document.activeElement` is an input/textarea
    - Call `callbacks.onPrev` / `callbacks.onNext`
    - _Requirements: 4.1, 4.2, 4.8_

  - [x] 5.4 Implement `src/ui/page-indicator.js` — three-dot indicator
    - Export `createPageIndicator(container)` returning cleanup function
    - Create 3 dot elements in a `.page-indicator` container
    - Subscribe to `currentMode` state: set active class on current dot, inactive on others
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 5.5 Write property test for page indicator dot uniqueness (Property 10)
    - **Property 10: Page Indicator Active Dot Uniqueness**
    - For any mode index (0, 1, 2), exactly one dot is active and exactly two are inactive
    - **Validates: Requirements 5.2**

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement mode view renderers
  - [x] 7.1 Implement `src/modes/staff-renderer.js` — SVG staff rendering utilities
    - Export `renderChordStaff({ accidentals, chords, width })` returning SVG markup string
    - Export `renderScaleStaff({ accidentals, scale, width })` returning SVG markup string
    - Render treble clef, 5 staff lines, key signature accidentals, and noteheads
    - Reuse accidental rendering logic from existing `src/circle/renderer.js`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.6_

  - [x] 7.2 Implement Full Circle View panel content
    - Wrap existing circle + neighbor overlay in the first `.mode-panel`
    - Subscribe to `activeKey` state changes → call `showNeighbors(activeKey)` to update overlay
    - On initial load, show neighbors for default key (C Major)
    - _Requirements: 1.1, 1.2, 6.1, 6.2, 6.3, 6.4, 2.4_

  - [x] 7.3 Implement Chord Explorer View panel content
    - Create second `.mode-panel` with chord display area
    - Subscribe to `activeKey` → call `getDiatonicTriads` and `getDiatonicSevenths`
    - Render two staves using `renderChordStaff` with roman numeral + quality labels
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 2.5_

  - [x] 7.4 Implement Scale Explorer View panel content
    - Create third `.mode-panel` with scale display area
    - Subscribe to `activeKey` → call `getAllScales`
    - Render 4 staves using `renderScaleStaff` with scale type + tonic labels
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 2.6_

  - [ ]* 7.5 Write property test for neighbor degree correctness (Property 9)
    - **Property 9: Neighbor Degree Correctness**
    - For any keyIndex and keyType, the neighbor overlay highlights exactly 7 sectors with correct roman numeral labels matching NEIGHBOR_DEGREES
    - **Validates: Requirements 6.2, 6.3, 2.4**

- [x] 8. Wire everything together in main.js
  - [x] 8.1 Update `src/main.js` to initialize the mode system
    - Import and call `createModeSwitcher` on the `.card` container
    - Import and call `createPageIndicator`, `createChevrons`, `attachKeyboardNav`
    - Import and call `attachSwipeHandler` on the mode track element
    - Route swipe callbacks to `modeSwitcher.next()` / `modeSwitcher.prev()`
    - Route tap callbacks to key selection logic (hit-test against circle geometry)
    - Initialize `activeKey` state to `{ index: 0, type: 'major' }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 8.2 Update `index.html` and `style.css` for mode layout
    - Add CSS for `.mode-track`, `.mode-panel`, `.page-indicator`, `.chevron-btn`
    - Mode track: `display: flex`, `overflow: hidden`, panels at `min-width: 100%`
    - Transition: `transform 300ms ease`
    - Page indicator: centered dots at bottom, active dot filled, inactive dimmed
    - Chevrons: fixed position at left/right edges, semi-transparent
    - _Requirements: 3.5, 4.3, 4.4, 4.6, 4.7, 5.1, 5.2_

  - [x] 8.3 Implement key selection hit-testing from tap coordinates
    - Determine which slice index and ring (major/minor) was tapped based on angle and radius from center
    - Use existing geometry (`DEFAULT_CONFIG`, `getSliceAngles`) to compute hit regions
    - Ignore taps outside major/minor rings (center, staff area, outside outer ring)
    - Update `activeKey` state on valid tap
    - _Requirements: 2.1, 2.7_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses vanilla JS (no framework), Vite for bundling, vitest for testing, and fast-check for property-based tests
- All theory modules (chords.js, scales.js, gesture-classifier.js) are pure functions with no DOM dependencies, making them ideal for property-based testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "2.2", "4.1"] },
    { "id": 2, "tasks": ["4.2", "4.3"] },
    { "id": 3, "tasks": ["4.4", "5.1", "5.2", "5.3", "5.4"] },
    { "id": 4, "tasks": ["5.5", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4", "7.5"] },
    { "id": 6, "tasks": ["8.1", "8.2"] },
    { "id": 7, "tasks": ["8.3"] }
  ]
}
```
