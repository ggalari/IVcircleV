# Requirements Document

## Introduction

Migrate the Circle of Fifths single-page application from a flat file structure with global functions and script-tag loading to a Vite-based project using ES modules. This is a pure architectural refactoring — no user-facing features are added or removed. All existing functionality (SVG rendering, context menu, neighbor overlay with roman numerals, save/print/show code) must be preserved identically.

## Glossary

- **Application**: The Circle of Fifths single-page web application
- **Vite**: The JavaScript build tool used as development server and production bundler
- **ES_Module**: A JavaScript file using `import`/`export` syntax per the ECMAScript module specification
- **HMR**: Hot Module Replacement — a Vite feature that updates modules in the browser without a full page reload during development
- **Build_Output**: The static files produced by `npm run build`, placed in the `dist/` directory
- **State_Module**: A minimal reactive pub/sub module (~30 lines) enabling future features to subscribe to state changes
- **Source_Directory**: The `src/` folder containing all application ES modules
- **Entry_Point**: The `src/main.js` file that bootstraps the application
- **Dev_Server**: The Vite development server started via `npm run dev`

## Requirements

### Requirement 1: Vite Project Initialization

**User Story:** As a developer, I want the project to use Vite as its build tool, so that I have a modern development experience with fast builds and HMR.

#### Acceptance Criteria

1. THE Application SHALL have a `package.json` with Vite listed as a dev dependency
2. WHEN `npm run dev` is executed, THE Dev_Server SHALL start and serve the Application with HMR enabled
3. WHEN `npm run build` is executed, THE Application SHALL produce a Build_Output in the `dist/` directory containing static HTML, CSS, and JS files
4. THE Application SHALL have a `vite.config.js` file at the project root configuring the build

### Requirement 2: ES Module Conversion

**User Story:** As a developer, I want all JavaScript to use ES module syntax, so that dependencies between modules are explicit and statically analyzable.

#### Acceptance Criteria

1. THE Application SHALL use `import` and `export` statements exclusively for all inter-file JavaScript dependencies, with zero `require()` calls, zero IIFE-based global assignments, and zero reliance on implicit script-tag load order
2. THE Application SHALL have zero functions attached to the `window` object for internal module communication, and all inline event handler attributes (e.g., `onclick`) in HTML SHALL be replaced with programmatic event listeners registered from within modules
3. THE Entry_Point (src/main.js) SHALL be the single `<script type="module">` tag in the HTML document, SHALL import all application modules, and SHALL invoke the application's render and event-binding logic when the DOMContentLoaded event fires
4. WHEN the Application is loaded in a browser, THE Application SHALL execute all modules via the ES module system using only the single entry-point script tag, with zero additional `<script>` tags required for application code
5. IF a module fails to load due to a network or syntax error, THEN THE Application SHALL display an error message indicating the failure in the page container rather than silently failing with a blank screen

### Requirement 3: Modular File Structure

**User Story:** As a developer, I want the code organized into focused modules under a `src/` directory, so that each file has a single responsibility and future features are easy to add.

#### Acceptance Criteria

1. THE Source_Directory SHALL contain a `circle/` subdirectory with separate modules for SVG rendering (building the complete SVG markup), geometry calculations (angle and position computations), and key data (the ordered list of 12 key slices, accidental sequences, and leading-tone mappings)
2. THE Source_Directory SHALL contain an `overlays/` subdirectory with a module that exports functions for drawing neighbor-highlight sectors and placing roman numeral labels onto the SVG
3. THE Source_Directory SHALL contain a `ui/` subdirectory with separate modules for context menu logic (show, hide, and action dispatch) and toolbar button handling (print, save-SVG, and toggle-code actions)
4. THE Source_Directory SHALL contain a `theory/` subdirectory with a module that exports the neighbor scale-degree mappings for major and minor keys (mapping each neighbor position to its roman numeral)
5. THE Source_Directory SHALL contain a `state.js` module implementing the State_Module that exports functions to get and set the currently selected key info (index and type) used by overlay and context-menu modules
6. THE Entry_Point SHALL be located at `src/main.js`
7. WHEN the Entry_Point is loaded, THE Entry_Point SHALL import all required modules using ES module syntax, invoke the SVG render function, and attach all UI event listeners
8. Each module within the Source_Directory SHALL export only named functions or constants using ES module export syntax and SHALL NOT assign properties to the global `window` object
9. Each module within the Source_Directory SHALL address a single responsibility such that no module both generates SVG markup and handles user interaction events

### Requirement 4: Reactive State Module

**User Story:** As a developer, I want a minimal reactive state module, so that future features can subscribe to state changes without tight coupling between components.

#### Acceptance Criteria

1. THE State_Module SHALL implement a pub/sub pattern exposing three operations: subscribe (register a callback for a given state key), get (retrieve the current value of a state key), and set (update the value of a state key and notify subscribers)
2. WHEN a subscriber registers a callback for a state key, THE State_Module SHALL return an unsubscribe function that, when called, removes that callback so it is no longer invoked on future updates
3. WHEN a state value is updated via set, THE State_Module SHALL invoke every callback registered for that key, passing the new value as the callback argument, in the order the callbacks were registered
4. THE State_Module SHALL be implemented in no more than 50 lines of code (excluding blank lines and comments) without external dependencies
5. THE State_Module SHALL manage at minimum the following state keys for the neighbor overlay feature: selectedKeyIndex (number or null), overlayActive (boolean), and overlayType (string: "major" or "minor")
6. WHEN get is called for a state key, THE State_Module SHALL return the current value of that key, or undefined if the key has never been set
7. IF set is called with a value identical to the current value for that key, THEN THE State_Module SHALL not notify subscribers for that key

### Requirement 5: Visual and Behavioral Preservation

**User Story:** As a developer, I want all existing visual output and user interactions preserved exactly, so that the migration introduces zero regressions.

#### Acceptance Criteria

1. THE Application SHALL render the Circle of Fifths as a 980×980 SVG containing three concentric ring circles (outer radius 320, middle radius 215, inner radius 110), 12 radial divider lines, 12 major-key labels (class `major-key`), 12 minor-key labels (class `minor-key`), 24 leading-tone annotations, 12 key-signature staff groups with treble clef and accidentals, a dashed minor-third arrow with the label "tierce mineure", and the "Majeur"/"Mineur" header labels
2. WHEN a user right-clicks a major-key or minor-key label, THE Application SHALL display a context menu at the click coordinates with a "Show neighbors" button enabled and a "Clear neighbors" button that is disabled when no neighbor overlay is currently displayed
3. WHEN "Show neighbors" is selected, THE Application SHALL highlight 6 sectors (3 on the outer ring and 3 on the inner ring) covering the tonic index and its two adjacent indices, with the tonic sector at opacity 1 and neighbor sectors at opacity 0.45, and display roman numeral labels (I/IV/V on outer and vi/ii/iii on inner for a major key, or i/iv/v on inner and III/VI/VII on outer for a minor key)
4. WHEN "Clear neighbors" is selected, THE Application SHALL remove all child elements from the neighbor overlay group
5. WHEN "Save SVG" is clicked, THE Application SHALL trigger a file download with filename `circle_of_fifths.svg` containing the serialized SVG markup prefixed with an XML declaration
6. WHEN "Print" is clicked, THE Application SHALL open a new browser window containing the cloned SVG and invoke the print dialog
7. WHEN "Show / Hide SVG Code" is clicked, THE Application SHALL toggle the hidden attribute of the read-only textarea element, and the textarea SHALL be hidden on initial page load
8. WHEN a user clicks outside the context menu while it is visible, THE Application SHALL hide the context menu

### Requirement 6: Static Deployment Compatibility

**User Story:** As a developer, I want the production build to produce purely static files, so that I can deploy to GitHub Pages or any static hosting without a server.

#### Acceptance Criteria

1. THE Build_Output SHALL consist exclusively of static HTML, CSS, and JavaScript files with no server-side runtime requirement
2. THE Build_Output SHALL be deployable by copying the `dist/` folder contents to any static file host
3. THE Application SHALL function correctly when served from a subdirectory path (e.g., GitHub Pages project site)

### Requirement 7: Browser Compatibility

**User Story:** As a developer, I want the application to work in all modern browsers, so that users on any major platform can access it.

#### Acceptance Criteria

1. THE Application SHALL function correctly in the current stable versions of Chrome, Firefox, Safari, and Edge
2. THE Application SHALL use only web platform features supported by all four target browsers without polyfills

### Requirement 8: No Framework Dependency

**User Story:** As a developer, I want the application to remain vanilla JavaScript without any UI framework, so that the codebase stays simple and lightweight.

#### Acceptance Criteria

1. THE Application SHALL have zero runtime dependencies on UI frameworks (React, Vue, Svelte, Angular, or similar)
2. THE Application SHALL use only the DOM API for all rendering and event handling
3. THE Application SHALL retain the existing SVG string-concatenation approach for circle generation

### Requirement 9: Development Workflow

**User Story:** As a developer, I want a clean development workflow with standard npm scripts, so that I can iterate quickly on changes.

#### Acceptance Criteria

1. WHEN `npm install` is executed in the project root, THE Application SHALL install all required dependencies
2. WHEN `npm run dev` is executed, THE Dev_Server SHALL be accessible at a local URL and reflect source changes via HMR without manual page reload
3. WHEN `npm run build` is executed, THE Application SHALL produce an optimized, minified Build_Output
4. THE Application SHALL include a `npm run preview` script that serves the Build_Output locally for pre-deployment verification

### Requirement 10: Clean Project Configuration

**User Story:** As a developer, I want proper project configuration files, so that the tooling and version control work correctly.

#### Acceptance Criteria

1. THE Application SHALL have a `.gitignore` that excludes `node_modules/` and `dist/` directories
2. THE Application SHALL have an `index.html` at the project root that serves as the Vite entry point with a module script tag referencing the Entry_Point
3. THE Application SHALL have global styles in a `style.css` file imported by the Entry_Point or referenced in `index.html`
