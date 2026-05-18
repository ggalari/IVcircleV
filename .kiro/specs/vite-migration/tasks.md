# Implementation Plan: Vite Migration

## Overview

Migrate the Circle of Fifths application from flat files with global functions and script-tag loading to a Vite-based ES module architecture. The migration decomposes `circle_of_fifths.js` and `circle_of_fifths.page.js` into focused modules under `src/`, introduces a minimal reactive state module, and wires everything through a single entry point. All existing visual output and interactions are preserved identically.

## Tasks

- [x] 1. Initialize Vite project and configure build tooling
  - [x] 1.1 Create `package.json` with Vite, Vitest, and fast-check as dev dependencies; add `dev`, `build`, `preview`, and `test` npm scripts
    - Initialize with `npm init -y`, then add dependencies
    - Scripts: `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`, `"test": "vitest run"`
    - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.2, 9.3, 9.4_

  - [x] 1.2 Create `vite.config.js` at project root with default vanilla JS configuration
    - Minimal config exporting `defineConfig({})`
    - _Requirements: 1.4_

  - [x] 1.3 Create root `index.html` as Vite entry point with static markup, a single `<script type="module" src="/src/main.js"></script>`, and no inline `onclick` attributes
    - Migrate all HTML structure from `circle_of_fifths.html` (card, container, toolbar buttons, context menu, textarea, legend, note)
    - Replace `onclick="saveSVG()"` and `onclick="printCircle()"` with plain buttons (ids only)
    - Remove the two `<script>` tags for old JS files
    - _Requirements: 2.3, 2.4, 10.2_

  - [x] 1.4 Create `style.css` with all global styles extracted from the inline `<style>` block in `circle_of_fifths.html`
    - Move body, card, svg, toolbar, button, overlay, context-menu, textarea, note, and legend styles
    - _Requirements: 10.3_

  - [x] 1.5 Update `.gitignore` to exclude `node_modules/` and `dist/`
    - _Requirements: 10.1_

- [x] 2. Implement core data and utility modules
  - [x] 2.1 Create `src/circle/keys.js` — export `SLICES`, `SHARPS_ORDER`, `FLATS_ORDER`, `LEADING_TONE_MAP`, and `getLeadingTone(tonic, isMajor)` extracted from `circle_of_fifths.js`
    - Extract the `slices` array, `sharpsOrder`, `flatsOrder`, `leadingToneMap`, and `getLeadingTone` function
    - Use named exports only, no `window` assignments
    - _Requirements: 3.1, 3.8, 2.1_

  - [x] 2.2 Create `src/circle/geometry.js` — export `DEFAULT_CONFIG`, `sectorPath(cx, cy, innerR, outerR, startDeg, endDeg)`, and position calculation helpers
    - Extract `DEFAULT_CONFIG` object and the degree-to-radian constant
    - Implement `sectorPath` producing the SVG arc path `d` string used by neighbor sectors
    - Export `getSliceAngles(count)` returning array of angles in radians
    - _Requirements: 3.1, 3.8, 3.9_

  - [x] 2.3 Create `src/theory/degrees.js` — export `NEIGHBOR_DEGREES` constant and `getNeighborDegrees(type)` function
    - Extract the `NEIGHBOR_DEGREES` object from `circle_of_fifths.page.js`
    - Pure data module with no DOM dependencies
    - _Requirements: 3.4, 3.8_

  - [x] 2.4 Create `src/state.js` — implement the reactive pub/sub state module with `get(key)`, `set(key, value)`, and `subscribe(key, callback)` returning an unsubscribe function
    - Internal `Map<string, { value, listeners: Set<Function> }>`
    - `set` skips notification if value is identical (===) to current
    - `subscribe` returns a function that removes the callback from the set
    - Must be ≤50 lines (excluding blanks and comments)
    - Manage keys: `selectedKeyIndex`, `overlayActive`, `overlayType`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 2.5 Write property tests for state module (Properties 1–4)
    - **Property 1: State get/set round-trip** — for any key string and value, `set(k,v)` then `get(k)` returns `v`; unset keys return `undefined`
    - **Property 2: Unsubscribe prevents notification** — after unsubscribe, callback is never called on subsequent sets
    - **Property 3: Subscriber notification order** — N subscribers invoked in registration order, each receiving new value
    - **Property 4: Set deduplication** — setting same value twice does not re-notify
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.6, 4.7**

- [x] 3. Implement SVG rendering module
  - [x] 3.1 Create `src/circle/renderer.js` — export `buildSVG(options?)`, `renderCircle(containerId, options?)`, and `getCircleLayout(options?)`
    - Migrate the `buildSVG`, `renderStaffLines`, `renderAccidentals`, `renderStaffGroup`, `renderAccidentalLabel`, `buildStyleBlock`, `buildArrow`, and `getCircleLayout` functions from `circle_of_fifths.js`
    - Import `SLICES`, `SHARPS_ORDER`, `FLATS_ORDER`, `getLeadingTone` from `./keys.js`
    - Import `DEFAULT_CONFIG` from `./geometry.js`
    - `renderCircle` sets container `innerHTML` to `buildSVG()` output
    - No `window` assignments
    - _Requirements: 5.1, 2.1, 2.2, 3.1, 3.8, 3.9, 8.3_

  - [ ]* 3.2 Write unit tests for renderer verifying SVG output contains all required elements
    - Verify 3 circle elements, 12 radial lines, 12 `.major-key` texts, 12 `.minor-key` texts, 24 leading-tone annotations, 12 staff groups, arrow path, "Majeur"/"Mineur" labels
    - _Requirements: 5.1_

- [x] 4. Checkpoint — Ensure core modules work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement overlay and UI modules
  - [x] 5.1 Create `src/overlays/neighbors.js` — export `showNeighbors(keyInfo)`, `clearNeighbors()`, and `createOverlay(svg)`
    - Import `sectorPath` from `../circle/geometry.js` and `get`/`set` from `../state.js`
    - Import `getNeighborDegrees` from `../theory/degrees.js`
    - Migrate `handleShowNeighbors`, `clearNeighborOverlay`, `createNeighborOverlay`, `addNeighborSectorByIndex`, and `addRomanNumeralLabel` logic
    - Tonic sector opacity 1, neighbor sectors opacity 0.45
    - Update state (`overlayActive`, `selectedKeyIndex`, `overlayType`) on show/clear
    - _Requirements: 5.3, 5.4, 3.2, 3.8, 3.9_

  - [ ]* 5.2 Write property test for neighbor overlay (Property 5)
    - **Property 5: Neighbor overlay produces correct sectors and labels** — for any index 0–11 and type major/minor, verify 6 sectors at correct indices, correct opacities, and correct roman numeral labels
    - **Validates: Requirements 5.3**

  - [x] 5.3 Create `src/ui/context-menu.js` — export `showContextMenu(x, y, keyInfo)`, `hideContextMenu()`, and `attachContextMenuListeners()`
    - Import `showNeighbors`, `clearNeighbors` from `../overlays/neighbors.js`
    - Migrate `showContextMenu`, `hideContextMenu`, `resolveKeyIndex`, right-click handler, and click-outside-to-dismiss logic
    - Disable "Clear neighbors" button when overlay is empty
    - _Requirements: 5.2, 5.8, 3.3, 3.8, 3.9_

  - [x] 5.4 Create `src/ui/toolbar.js` — export `printCircle()`, `saveSVG()`, and `attachToolbarListeners()`
    - Migrate print (clone SVG → new window → print dialog), save (serialize → blob → download as `circle_of_fifths.svg`), and toggle-code logic
    - Attach click listeners to toolbar buttons by id (no inline handlers)
    - _Requirements: 5.5, 5.6, 5.7, 3.3, 3.8, 3.9_

- [x] 6. Wire entry point and integrate all modules
  - [x] 6.1 Create `src/main.js` — import `style.css`, import all modules, render circle, and attach all event listeners on DOMContentLoaded
    - Import `renderCircle` from `./circle/renderer.js`
    - Import `attachContextMenuListeners` from `./ui/context-menu.js`
    - Import `attachToolbarListeners` from `./ui/toolbar.js`
    - Wrap initialization in try/catch; on error display message in `#circle-container`
    - _Requirements: 2.3, 2.4, 2.5, 3.6, 3.7_

  - [x] 6.2 Verify zero `window.*` assignments in `src/`, zero `require()` calls, zero inline `onclick` attributes in `index.html`, and only one `<script>` tag
    - Run a grep/lint check across all source files
    - _Requirements: 2.1, 2.2, 2.4_

- [x] 7. Checkpoint — Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Build verification and static deployment
  - [x] 8.1 Verify `npm run build` produces `dist/` with static HTML, CSS, and JS files; verify `npm run preview` serves the build output
    - Run build command and check output structure
    - _Requirements: 1.2, 1.3, 6.1, 6.2, 9.3, 9.4_

  - [ ]* 8.2 Write integration tests verifying no global assignments and correct module structure
    - Static analysis: grep `src/` for `window.` assignments, `require(`, inline handlers
    - Verify build output contains only static files
    - _Requirements: 2.1, 2.2, 6.1_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–5)
- Unit tests validate specific examples and edge cases
- The design specifies JavaScript (not pseudocode), so all implementation uses vanilla JS with ES module syntax
- Vitest is the test runner (ships with Vite); fast-check is the property-based testing library

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.5", "3.1"] },
    { "id": 1, "tasks": ["3.2", "5.1", "5.4"] },
    { "id": 2, "tasks": ["5.2", "5.3"] },
    { "id": 3, "tasks": ["6.1"] },
    { "id": 4, "tasks": ["6.2", "8.1"] },
    { "id": 5, "tasks": ["8.2"] }
  ]
}
```
