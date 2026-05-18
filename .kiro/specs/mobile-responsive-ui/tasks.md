# Implementation Plan: Mobile Responsive UI

## Overview

Transform the Circle of Fifths application into a fully responsive, touch-friendly web app. The implementation proceeds in layers: first responsive SVG scaling and layout (CSS + renderer), then new interactive modules (hamburger, long-press, touch handler, menu positioning), then integration and cleanup of removed features.

## Tasks

- [x] 1. Responsive SVG and layout foundation
  - [x] 1.1 Update renderer.js to use viewBox instead of fixed width/height
    - Change `<svg width="${width}" height="${height}" ...>` to `<svg viewBox="0 0 ${width} ${height}" ...>`
    - Remove the fixed `width` and `height` attributes from the SVG element
    - Update `saveSVG` in toolbar.js to read viewBox dimensions for the exported file
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 1.2 Add responsive CSS for SVG container and card layout
    - Add `#circle-container svg` rule: `width: 100%; height: auto; max-width: 980px; display: block; margin: 0 auto;`
    - Update `.card` to `max-width: 1040px; margin: 0 auto; width: 100%; box-sizing: border-box;`
    - Add `@media (max-width: 600px)` block with: `.card` padding 12px, card width `calc(100vw - 16px)`, `.note` and `.legend` font-size 14px, line-height 1.3
    - Remove the existing `textarea` and `textarea[hidden]` CSS rules
    - Ensure no horizontal overflow at 320px–1920px viewport widths
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 11.1, 11.3_

- [x] 2. Checkpoint - Verify responsive layout
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create menu-position module and property tests
  - [x] 3.1 Implement ui/menu-position.js with clampMenuPosition and getMenuWidthConstraints
    - Create `src/ui/menu-position.js` exporting `clampMenuPosition(desired, menu, viewport, inset)` and `getMenuWidthConstraints(viewportWidth, breakpoint)`
    - `clampMenuPosition` returns `{ x, y, maxHeight, needsScroll }` ensuring all edges are at least `inset` px inside viewport
    - `getMenuWidthConstraints` returns `{ minWidth, maxWidth }` — 180/vw-16 at ≤600px, 160/Infinity above
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 3.2 Write property test for viewport containment clamping
    - **Property 1: Viewport containment clamping**
    - **Validates: Requirements 3.1, 7.1, 7.2**
    - Generate random desired positions, menu dimensions, and viewport dimensions with fast-check
    - Assert result.x >= 8, result.y >= 8, result.x + effectiveWidth <= vw - 8, result.y + effectiveHeight <= vh - 8

  - [ ]* 3.3 Write property test for context menu width constraints
    - **Property 3: Context menu width constraints at small viewport**
    - **Validates: Requirements 7.3**
    - Generate random viewport widths; assert minWidth=180 and maxWidth=vw-16 when vw<=600, minWidth=160 and maxWidth=Infinity when vw>600

  - [ ]* 3.4 Write property test for context menu height overflow detection
    - **Property 4: Context menu height overflow detection**
    - **Validates: Requirements 7.4**
    - Generate random menu heights and viewport heights; assert needsScroll=true iff mh > vh-16, and maxHeight = vh-16

- [x] 4. Create long-press gesture module and property tests
  - [x] 4.1 Implement ui/long-press.js with distance, exceedsMovementThreshold, and attachLongPress
    - Create `src/ui/long-press.js` exporting `distance(a, b)`, `exceedsMovementThreshold(start, current, threshold)`, and `attachLongPress(element, config)`
    - `attachLongPress` manages the state machine: Idle → Waiting → Feedback (200ms) → Active (500ms)
    - Calls `config.onFeedbackStart` at 200ms, `config.onLongPress` at 500ms with touch coordinates
    - Cancels if finger moves > 10px or lifts before 500ms
    - Suppresses browser default context menu and text selection during gesture
    - Returns a cleanup function to remove all listeners
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7_

  - [ ]* 4.2 Write property test for long-press distance cancellation
    - **Property 2: Long-press distance cancellation**
    - **Validates: Requirements 3.3**
    - Generate random 2D point pairs with fast-check
    - Assert `exceedsMovementThreshold(start, current, 10)` returns true iff Euclidean distance > 10

  - [ ]* 4.3 Write unit tests for long-press timing behavior
    - Use vitest fake timers to verify: no callback at 499ms, callback fires at 500ms
    - Verify feedback callback fires at 200ms
    - Verify cancel when finger moves > 10px
    - _Requirements: 3.3, 3.4, 3.7_

- [x] 5. Create touch-handler and hamburger modules
  - [x] 5.1 Implement ui/touch-handler.js
    - Create `src/ui/touch-handler.js` exporting `attachTouchHandlers(svgContainer)`
    - On `touchstart` within SVG container, set active flag
    - On `touchmove` within SVG container while active, call `preventDefault()` to suppress scroll/bounce
    - On multi-touch (2+ contact points), call `preventDefault()` to suppress pinch-to-zoom
    - On `touchend`/`touchcancel`, clear active flag
    - Do not interfere with touches originating outside the SVG container
    - Return a cleanup function
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 5.2 Implement ui/hamburger.js
    - Create `src/ui/hamburger.js` exporting `attachHamburgerMenu()`
    - Query `.hamburger-btn` and `.toolbar-panel` elements
    - Toggle panel visibility on hamburger button tap
    - Close panel on outside tap (not on button or panel)
    - Close panel after action button click (after action executes)
    - Return a cleanup function
    - _Requirements: 5.1, 5.2, 9.1, 9.3, 9.4, 9.5_

  - [ ]* 5.3 Write unit tests for hamburger toggle behavior
    - Verify panel opens on button click, closes on second click
    - Verify panel closes on outside click
    - Verify panel closes after action button click
    - _Requirements: 9.3, 9.4, 9.5_

- [x] 6. Checkpoint - Verify new modules
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate modules and update existing code
  - [x] 7.1 Update context-menu.js to use menu-position.js and long-press integration
    - Import `clampMenuPosition` and `getMenuWidthConstraints` from `./menu-position.js`
    - Replace inline clamping in `showContextMenu` with `clampMenuPosition` call
    - Apply width constraints from `getMenuWidthConstraints` to the menu element
    - Set `overflow-y: auto` and `max-height` when `needsScroll` is true
    - Import and use `attachLongPress` from `./long-press.js` on SVG key labels
    - Preserve existing right-click (`contextmenu` event) activation
    - Close context menu on outside tap within 100ms
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 7.1, 7.2, 7.3, 7.4_

  - [x] 7.2 Update toolbar.js to remove toggle-code handler
    - Remove the `btn-toggle-code` event listener block from `attachToolbarListeners`
    - Keep `saveSVG` and `printCircle` functions intact
    - Update `saveSVG` to handle viewBox-based SVG (set explicit width/height on clone for export)
    - _Requirements: 10.3, 10.6_

  - [x] 7.3 Update index.html for hamburger menu, remove SVG code feature
    - Remove `<button id="btn-toggle-code">` element
    - Remove `<textarea id="svgCodeArea" readonly hidden>` element
    - Replace the `.toolbar` div with a hamburger button: `<button class="hamburger-btn" aria-label="Menu">☰</button>`
    - Add `.toolbar-panel` div (hidden by default) containing two buttons: "💾 Télécharger SVG" and "🖨️ Imprimer"
    - Update the `.note` text to remove reference to "Show / Hide SVG Code"
    - Ensure viewport meta tag does NOT contain `user-scalable=no` or `maximum-scale=1`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 9.1, 9.2, 9.6, 10.1, 10.2, 10.5_

  - [x] 7.4 Add CSS for hamburger button, toolbar panel, and touch targets
    - Style `.hamburger-btn`: min 44×44px touch target, positioned top-right of card
    - Style `.toolbar-panel`: hidden by default, dropdown below hamburger, full-width buttons with min 44px height
    - Add 8px gap between toolbar panel buttons
    - At ≤600px breakpoint: increase panel button padding to 12px vertical / 20px horizontal
    - Style `.ctx-menu-item` with min-height 44px and min-width 44px
    - Add `.long-press-feedback` class for visual indication during gesture (e.g., opacity or outline)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.4, 9.2, 9.6_

  - [x] 7.5 Update main.js to wire new modules
    - Import `attachTouchHandlers` from `./ui/touch-handler.js`
    - Import `attachHamburgerMenu` from `./ui/hamburger.js`
    - Call `attachTouchHandlers` with the `#circle-container` element after SVG render
    - Call `attachHamburgerMenu()` after DOM ready
    - _Requirements: 8.1, 8.2, 8.5, 9.1_

- [x] 8. Remove remaining SVG code feature references
  - [x] 8.1 Remove all CSS targeting textarea and SVG code button
    - Delete `textarea` and `textarea[hidden]` rules from style.css
    - Verify no remaining CSS references to `#svgCodeArea` or `btn-toggle-code`
    - _Requirements: 10.4, 10.6_

  - [x] 8.2 Verify no remaining references to removed feature in source files
    - Search all HTML, CSS, and JS files for `svgCodeArea`, `btn-toggle-code`, `toggle-code`, `toggleCode`
    - Remove any found references
    - _Requirements: 10.6_

- [x] 9. Final checkpoint - Full verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The app uses vanilla JS with ES modules, vitest for testing, and fast-check for property-based tests
- French labels are used for toolbar buttons: "Télécharger SVG", "Imprimer"

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "3.2", "3.3", "3.4", "4.2", "4.3", "5.1", "5.2"] },
    { "id": 2, "tasks": ["5.3", "7.1", "7.2"] },
    { "id": 3, "tasks": ["7.3", "7.4", "7.5"] },
    { "id": 4, "tasks": ["8.1", "8.2"] }
  ]
}
```
