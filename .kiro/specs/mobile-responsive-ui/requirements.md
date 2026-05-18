# Requirements Document

## Introduction

The Circle of Fifths application currently renders at a fixed 980×980px SVG size with no responsive layout, no media queries, and no touch interaction support. This feature makes the application fully usable on mobile devices by introducing responsive scaling, touch-friendly interactions, and readable typography at small screen sizes.

## Glossary

- **App**: The Circle of Fifths web application
- **SVG_Container**: The `#circle-container` element that holds the rendered SVG circle
- **Card**: The `.card` wrapper element containing all UI content
- **Toolbar**: The hamburger menu and its panel containing two action buttons ("Télécharger SVG", "Imprimer")
- **Context_Menu**: The floating menu triggered on key labels to show/clear neighbor overlays
- **Viewport**: The visible area of the browser window on the user's device
- **Touch_Target**: An interactive element sized for reliable finger activation (minimum 44×44 CSS pixels per WCAG 2.5.5)
- **Long_Press**: A touch gesture where the user holds a finger on an element for at least 500ms
- **Breakpoint_Small**: A viewport width of 600px or less
- **Hamburger_Menu_Button**: A button displaying a three-line icon (☰) that toggles visibility of the Toolbar_Panel at all Viewport widths
- **Toolbar_Panel**: A dropdown or slide-out panel containing the two Toolbar action buttons ("Télécharger SVG", "Imprimer"), revealed by tapping the Hamburger_Menu_Button
- **Legend**: The informational area displayed below the SVG_Container showing chord color coding (major/minor) and designed to hold additional reference content

## Requirements

### Requirement 1: Responsive SVG Scaling

**User Story:** As a mobile user, I want the circle diagram to scale to fit my screen width, so that I can see the full circle without horizontal scrolling.

#### Acceptance Criteria

1. WHEN the Viewport width is less than the SVG intrinsic width (980px), THE SVG_Container SHALL scale the SVG proportionally to fit within the available width while preserving the 1:1 aspect ratio.
2. THE SVG_Container SHALL use a fluid width (percentage-based or viewport-relative) rather than a fixed pixel width, up to a maximum rendered size of 980px.
3. WHILE the Viewport width is at or below Breakpoint_Small (600px), THE SVG_Container SHALL occupy the full available width minus the combined horizontal padding of the body (20px per side) and the card (24px per side).
4. THE App SHALL render the SVG without horizontal overflow at any Viewport width from 320px to 1920px.
5. WHEN the Viewport width exceeds 980px plus the total horizontal padding, THE SVG_Container SHALL render the SVG at its intrinsic size of 980×980px and not scale further.

### Requirement 2: Responsive Card Layout

**User Story:** As a mobile user, I want the page layout to adapt to my screen size, so that content is readable and well-spaced on any device.

#### Acceptance Criteria

1. WHILE the Viewport width is at or below Breakpoint_Small, THE Card SHALL reduce its padding to 12px.
2. WHILE the Viewport width is at or below Breakpoint_Small, THE Card SHALL expand to fill the full Viewport width minus 8px horizontal margin on each side (16px total).
3. THE Card SHALL have a maximum width of 1040px and SHALL be horizontally centered within the Viewport when the Viewport width exceeds 1040px.
4. THE App SHALL not produce horizontal scrollbars at any Viewport width of 320px or greater.
5. WHILE the Viewport width is at or below Breakpoint_Small, THE Card's internal content (including the SVG element) SHALL scale down proportionally to fit within the Card's available width without overflowing.

### Requirement 3: Touch-Friendly Context Menu Activation

**User Story:** As a mobile user, I want to access the context menu on key labels using a touch gesture, so that I can view diatonic chords without needing a mouse right-click.

#### Acceptance Criteria

1. WHEN a user performs a Long_Press on a major or minor key label, THE Context_Menu SHALL appear positioned at the touch coordinates, clamped so that the menu remains fully within the visible viewport.
2. WHEN a Long_Press is detected, THE App SHALL suppress the browser default context menu and text selection for the duration of the touch interaction.
3. IF the user moves their finger more than 10px from the initial touch point during a Long_Press, THEN THE App SHALL cancel the Long_Press gesture and not display the Context_Menu.
4. IF the user lifts their finger before 500ms have elapsed, THEN THE App SHALL treat the gesture as a tap (not a Long_Press) and SHALL NOT display the Context_Menu.
5. WHEN the Context_Menu is open and the user taps outside of the Context_Menu, THE Context_Menu SHALL close within 100ms.
6. THE App SHALL continue to support right-click activation of the Context_Menu on devices with pointer input.
7. WHILE a Long_Press gesture is in progress (finger held for at least 200ms and fewer than 500ms), THE App SHALL display a visual indication on the target key label that a long-press is being recognized.

### Requirement 4: Touch-Friendly Button and Menu Sizing

**User Story:** As a mobile user, I want the hamburger button and menu items to be large enough to tap accurately, so that I can interact with the app without frustration.

#### Acceptance Criteria

1. THE Hamburger_Menu_Button SHALL have a minimum Touch_Target size of 44×44 CSS pixels at all Viewport widths.
2. THE Context_Menu items SHALL have a minimum height of 44 CSS pixels and a minimum width of 44 CSS pixels at all Viewport widths.
3. WHILE the Viewport width is at or below Breakpoint_Small, THE Toolbar_Panel action buttons SHALL have increased padding of at least 12px vertical and 20px horizontal.
4. THE Toolbar_Panel action buttons SHALL have sufficient spacing between them to prevent accidental adjacent taps (minimum 8px gap) at all Viewport widths.

### Requirement 5: Toolbar Layout with Universal Hamburger Menu

**User Story:** As a user, I want the toolbar actions always accessible behind a consistent hamburger menu, so that the interface stays uncluttered at every screen size.

#### Acceptance Criteria

1. THE App SHALL display the Hamburger_Menu_Button at all Viewport widths from 320px to 1920px.
2. THE App SHALL NOT display inline horizontal Toolbar buttons at any Viewport width.
3. THE Hamburger_Menu_Button SHALL be visible and accessible without clipping or overlapping at any Viewport width between 320px and 1920px.
4. WHILE the Viewport width is at or below Breakpoint_Small, THE Hamburger_Menu_Button SHALL be positioned to avoid overlapping the SVG_Container or other interactive elements.

### Requirement 6: Readable Typography on Small Screens

**User Story:** As a mobile user, I want text to be legible without zooming, so that I can read help text and labels comfortably.

#### Acceptance Criteria

1. WHILE the Viewport width is at or below Breakpoint_Small, THE App SHALL render the help note text (.note) at a minimum font size of 14px.
2. WHILE the Viewport width is at or below Breakpoint_Small, THE App SHALL render the legend text at a minimum font size of 14px.
3. THE App SHALL not use font sizes below 12px for any visible HTML text content (including buttons, menu items, and labels) at any Viewport width.
4. WHILE the Viewport width is at or below Breakpoint_Small, THE App SHALL maintain a minimum line-height of 1.3 for the help note text and legend text.

### Requirement 7: Context Menu Viewport Containment on Mobile

**User Story:** As a mobile user, I want the context menu to always appear fully within the visible screen area, so that I can read and tap all menu options.

#### Acceptance Criteria

1. WHEN the Context_Menu is displayed, THE Context_Menu SHALL be positioned so that all four edges (top, right, bottom, left) are at least 8px inside the Viewport boundaries.
2. IF the calculated position would place the Context_Menu partially outside the Viewport on any edge, THEN THE App SHALL clamp the Context_Menu position on that edge to maintain the 8px minimum inset from the Viewport boundary.
3. WHILE the Viewport width is at or below Breakpoint_Small, THE Context_Menu SHALL have a minimum width of 180px and a maximum width equal to the Viewport width minus 16px.
4. IF the Context_Menu height exceeds the Viewport height minus 16px, THEN THE App SHALL constrain the Context_Menu height to the Viewport height minus 16px and enable vertical scrolling within the Context_Menu.

### Requirement 8: Prevent Unintended Zoom and Scroll on Touch

**User Story:** As a mobile user, I want the app to prevent accidental pinch-zoom and bounce-scroll while interacting with the circle, so that my touch interactions are interpreted correctly.

#### Acceptance Criteria

1. WHILE a touch gesture is active within the SVG_Container (from touchstart to touchend/touchcancel), THE App SHALL call preventDefault on touchmove events targeting the SVG_Container to prevent default pinch-to-zoom behavior.
2. WHILE a touch gesture is active within the SVG_Container (from touchstart to touchend/touchcancel), THE App SHALL prevent elastic overscroll (bounce) by suppressing default scroll behavior on touchmove events targeting the SVG_Container.
3. WHEN a touch gesture originates outside the SVG_Container, THE App SHALL allow normal page scrolling without interference.
4. THE App SHALL NOT include `user-scalable=no` or `maximum-scale=1` in the viewport meta tag, preserving the browser's built-in accessibility zoom configured via browser settings.
5. WHEN a multi-touch gesture (2 or more contact points) is active within the SVG_Container, THE App SHALL prevent the browser's default pinch-to-zoom without affecting single-touch drag interpretation by the app.

### Requirement 9: Hamburger Menu Behavior

**User Story:** As a user, I want the hamburger menu to reveal toolbar actions in a panel and close predictably, so that I can access actions quickly without confusion.

#### Acceptance Criteria

1. THE App SHALL display the Hamburger_Menu_Button at all Viewport widths.
2. THE Hamburger_Menu_Button SHALL have a minimum Touch_Target size of 44×44 CSS pixels.
3. WHEN the user taps the Hamburger_Menu_Button, THE App SHALL reveal the Toolbar_Panel containing the two action buttons ("Télécharger SVG", "Imprimer").
4. WHEN the Toolbar_Panel is open and the user taps one of the action buttons, THE App SHALL execute the selected action and close the Toolbar_Panel within 100ms.
5. WHEN the Toolbar_Panel is open and the user taps outside the Toolbar_Panel and outside the Hamburger_Menu_Button, THE App SHALL close the Toolbar_Panel within 100ms.
6. WHILE the Toolbar_Panel is open, THE Toolbar_Panel action buttons SHALL each have a minimum Touch_Target size of 44×44 CSS pixels and expand to the full width of the Toolbar_Panel.

### Requirement 10: Remove Show SVG Code Feature

**User Story:** As a developer, I want the unused "Show SVG Code" feature removed from the application, so that the codebase is cleaner and the UI is uncluttered.

#### Acceptance Criteria

1. THE App SHALL NOT contain a "Show / Hide SVG Code" button in the DOM.
2. THE App SHALL NOT contain a textarea element with the id `svgCodeArea` in the DOM.
3. THE App SHALL NOT contain JavaScript event listeners or handler functions for toggling SVG code visibility.
4. THE App SHALL NOT contain CSS styles targeting the `#svgCodeArea` textarea or the "Show / Hide SVG Code" button.
5. WHEN the help note text references the "Show / Hide SVG Code" feature, THE App SHALL update or remove that reference so that no mention of the removed feature remains in visible text.
6. THE App SHALL have no remaining references to SVG code display functionality in HTML, CSS, or JavaScript source files.

### Requirement 11: Persistent Legend Area

**User Story:** As a user, I want a legend area always visible below the circle diagram, so that I can quickly identify major and minor chord color coding and find additional information in the future.

#### Acceptance Criteria

1. THE App SHALL display the legend area below the SVG_Container at all Viewport widths from 320px to 1920px.
2. THE Legend SHALL display the color coding for major chords and minor chords using labeled color indicators.
3. WHILE the Viewport width is at or below Breakpoint_Small, THE Legend SHALL remain fully visible without being clipped or hidden.
4. THE Legend area SHALL be structured to accommodate additional informational content beyond chord color coding without requiring layout changes.
