# Implementation Plan: Context Menu Neighbors

## Overview

Replace the current direct-highlight right-click behavior on key labels with a two-step context menu interaction. A custom HTML `<div id="ctx-menu">` provides "Show neighbors" and "Clear neighbors" actions. The overlay now includes roman numeral annotations (I/IV/V or i/iv/v) indicating functional harmonic relationships. All changes land in `circle_of_fifths.page.js` and `circle_of_fifths.html`; the SVG generator (`circle_of_fifths.js`) remains untouched.

## Tasks

- [x] 1. Add context menu HTML and CSS
  - [x] 1.1 Add the `#ctx-menu` div element to `circle_of_fifths.html`
    - Insert `<div id="ctx-menu" class="ctx-menu" hidden>` inside `.card`, containing two `<button data-action="show">Show neighbors</button>` and `<button data-action="clear">Clear neighbors</button>` elements
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Add CSS styles for the context menu and disabled state to `circle_of_fifths.html`
    - Style `.ctx-menu` with `position: fixed`, `z-index: 1000`, background, border-radius, box-shadow, padding
    - Style `.ctx-menu[hidden]` with `display: none`
    - Style `.ctx-menu-item` buttons for menu appearance (full-width, text-align left, hover state)
    - Style `.ctx-menu-item:disabled` with greyed-out appearance and `cursor: not-allowed`
    - _Requirements: 1.4, 5.3_

- [x] 2. Implement context menu show/hide logic in `circle_of_fifths.page.js`
  - [x] 2.1 Implement `resolveKeyIndex(target)` function
    - Determine the slice index (0–11) from a clicked SVG text element by matching its `textContent` against the list of major-key or minor-key labels in the SVG
    - Return `-1` if no match is found
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 2.2 Implement `showContextMenu(x, y, keyInfo)` function
    - Position `#ctx-menu` at `(x, y)` using `style.left` and `style.top`, clamped to viewport bounds
    - Remove `hidden` attribute to reveal the menu
    - Enable or disable the "Clear neighbors" button based on whether the overlay has children (`overlay.children.length === 0` → disabled)
    - Store `keyInfo` in module-level state for use by action handlers
    - _Requirements: 1.1, 1.3, 1.4, 5.3_

  - [x] 2.3 Implement `hideContextMenu()` function
    - Set `hidden` attribute on `#ctx-menu`
    - _Requirements: 1.5, 1.6_

  - [x] 2.4 Rewrite the `contextmenu` event handler on the SVG element
    - Use event delegation: check `event.target.classList` for `major-key` or `minor-key`
    - If match: call `preventDefault()`, resolve key index via `resolveKeyIndex`, build `keyInfo` object, call `showContextMenu` at pointer coordinates
    - If no match: allow default browser context menu
    - Do NOT modify the overlay on right-click (remove existing `clearNeighborOverlay()` + `addNeighborSectorByIndex()` calls)
    - _Requirements: 1.1, 1.7, 6.1, 6.2, 6.3, 6.4_

  - [x] 2.5 Add document-level click listener to dismiss the menu
    - On `click` anywhere, if the click target is not inside `#ctx-menu`, call `hideContextMenu()`
    - _Requirements: 1.5_

- [x] 3. Checkpoint - Verify context menu display
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement neighbor overlay drawing with roman numerals
  - [x] 4.1 Implement `getNeighborNumerals(type)` function
    - Return `{ self: 'I', cw: 'V', ccw: 'IV' }` for major, `{ self: 'i', cw: 'v', ccw: 'iv' }` for minor
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.2 Implement `addRomanNumeralLabel(index, numeral, type)` function
    - Create an SVG `<text>` element positioned at the angular center of the sector (`-90 + index * 30` degrees) and the radial midpoint `(middleRadius + outerRadius) / 2`
    - Set font-size 20px, text-anchor "middle", dominant-baseline "central"
    - Append to the neighbor-overlay group
    - _Requirements: 3.4, 3.5_

  - [x] 4.3 Implement `handleShowNeighbors(keyInfo)` function
    - Clear all children from the overlay group
    - Draw 3 sector paths at indices `[keyInfo.index, (keyInfo.index+1)%12, (keyInfo.index+11)%12]` using existing `addNeighborSectorByIndex` with the correct type
    - Call `addRomanNumeralLabel` for each of the 3 positions with the correct numeral from `getNeighborNumerals`
    - Call `hideContextMenu()` after drawing
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2_

  - [x] 4.4 Implement `handleClearNeighbors()` function
    - Remove all child elements from the overlay group (retain the `<g>` element itself)
    - Call `hideContextMenu()` after clearing
    - _Requirements: 3.6, 5.1, 5.2_

  - [x] 4.5 Wire menu button click handlers
    - Add a `click` event listener on `#ctx-menu` that routes `data-action="show"` to `handleShowNeighbors` and `data-action="clear"` to `handleClearNeighbors`
    - _Requirements: 2.1, 5.1_

- [x] 5. Checkpoint - Verify full interaction flow
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Property-based tests with fast-check
  - [ ]* 6.1 Set up test environment (Vitest + happy-dom + fast-check)
    - Install vitest, happy-dom, and fast-check as dev dependencies
    - Create vitest config with happy-dom environment
    - Create test file `context_menu_neighbors.test.js`
    - Set up beforeEach to render the circle SVG and initialize the DOM
    - _Requirements: all_

  - [ ]* 6.2 Write property test: Clear-button disabled state reflects overlay emptiness
    - **Property 1: Clear-button disabled state reflects overlay emptiness**
    - Use arbitraries: `fc.integer({min:0, max:11})`, `fc.constantFrom('major','minor')`, `fc.integer({min:0, max:20})`
    - Assert: after showing the context menu, the "Clear neighbors" button's `disabled` attribute equals `(overlay.children.length === 0)`
    - **Validates: Requirements 1.3, 1.4, 5.3**

  - [ ]* 6.3 Write property test: Right-click preserves overlay state
    - **Property 2: Right-click preserves overlay state**
    - Use arbitraries: `fc.integer({min:0, max:11})`, `fc.constantFrom('major','minor')`, `fc.integer({min:0, max:20})`
    - Assert: dispatching a contextmenu event does not change the number or content of overlay children
    - **Validates: Requirements 1.7, 4.3**

  - [ ]* 6.4 Write property test: Show neighbors produces exactly 6 overlay children
    - **Property 3: Show neighbors produces exactly 6 overlay children**
    - Use arbitraries: `fc.integer({min:0, max:11})`, `fc.constantFrom('major','minor')`, `fc.integer({min:0, max:20})`
    - Assert: after `handleShowNeighbors`, overlay contains exactly 3 `<path>` and 3 `<text>` elements (6 total)
    - **Validates: Requirements 2.1, 2.2, 4.1, 4.2**

  - [ ]* 6.5 Write property test: Sector highlight class matches key type
    - **Property 4: Sector highlight class matches key type**
    - Use arbitraries: `fc.integer({min:0, max:11})`, `fc.constantFrom('major','minor')`
    - Assert: all 3 path elements have class `highlight-major fade-in` or `highlight-minor fade-in` matching the key type
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [ ]* 6.6 Write property test: Roman numerals match key type and neighbor position
    - **Property 5: Roman numerals match key type and neighbor position**
    - Use arbitraries: `fc.integer({min:0, max:11})`, `fc.constantFrom('major','minor')`
    - Assert: text at index N contains I/i, at (N+1)%12 contains V/v, at (N-1+12)%12 contains IV/iv
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 6.7 Write property test: Roman numeral label positioning
    - **Property 6: Roman numeral label positioning**
    - Use arbitraries: `fc.integer({min:0, max:11})`
    - Assert: each label's x/y coordinates match the angular center and radial midpoint within ±1px tolerance
    - **Validates: Requirements 3.4**

  - [ ]* 6.8 Write property test: Clearing overlay removes all children but retains the group
    - **Property 7: Clearing overlay removes all children but retains the group**
    - Use arbitraries: `fc.integer({min:0, max:11})`, `fc.constantFrom('major','minor')`, `fc.integer({min:1, max:20})`
    - Assert: after `handleClearNeighbors`, the `<g class="neighbor-overlay">` exists with 0 children
    - **Validates: Requirements 3.6, 5.1, 5.2**

  - [ ]* 6.9 Write property test: Any key label triggers the context menu
    - **Property 8: Any key label triggers the context menu**
    - Use arbitraries: `fc.integer({min:0, max:11})`, `fc.constantFrom('major','minor')`
    - Assert: dispatching contextmenu on a major-key or minor-key text element results in the custom menu becoming visible and default prevented
    - **Validates: Requirements 6.1, 6.2**

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The SVG generator (`circle_of_fifths.js`) is NOT modified by any task
- All implementation uses vanilla JavaScript — no frameworks or build tools beyond the test runner

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "4.1"] },
    { "id": 2, "tasks": ["2.4", "2.5", "4.2"] },
    { "id": 3, "tasks": ["4.3", "4.4"] },
    { "id": 4, "tasks": ["4.5"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9"] }
  ]
}
```
