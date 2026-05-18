# Requirements Document

## Introduction

This feature replaces the existing direct-highlight right-click behavior on key labels in the Circle of Fifths SVG with a custom context menu. The menu offers two actions: highlighting neighbor keys with roman numeral annotations showing functional relationships, and clearing the overlay. The overlay highlights 6 sectors across both the outer (major) and inner (minor) rings, showing all diatonic neighbor relationships. Roman numeral labeling adapts to whether the selected key is major or minor, displaying full scale degree mappings (I/IV/V/ii/iii/vi for major, i/iv/v/III/VI/VII for minor).

## Glossary

- **Circle_App**: The single-page Circle of Fifths HTML application comprising `circle_of_fifths.html`, `circle_of_fifths.js`, and `circle_of_fifths.page.js`
- **Key_Label**: An SVG `<text>` element with class `major-key` or `minor-key` representing a tonal key on the circle
- **Neighbor_Key**: A key adjacent to the selected key on the circle (index ±1 modulo 12), differing by exactly one accidental. Neighbors exist on both the outer ring (major keys) and inner ring (minor keys relative to the selected key's scale)
- **Context_Menu**: A custom HTML `<div>` menu displayed when the user right-clicks a Key_Label, positioned at pointer coordinates
- **Neighbor_Overlay**: The SVG `<g class="neighbor-overlay">` group containing highlighted sector paths and roman numeral text elements
- **Roman_Numeral_Label**: A text annotation placed in the top-right corner of a highlighted sector indicating the functional scale degree (e.g., I, IV, V, ii, iii, vi) relative to the selected key
- **Selected_Key**: The key whose Key_Label the user right-clicked to trigger the Context_Menu
- **Functional_Relationship**: The scale-degree relationship between the Selected_Key and a Neighbor_Key, expressed as a roman numeral
- **Outer_Ring**: The ring between middleRadius (215) and outerRadius (320) containing major key labels
- **Inner_Ring**: The ring between innerRadius (110) and middleRadius (215) containing minor key labels

## Requirements

### Requirement 1: Context Menu Display on Right-Click

**User Story:** As a music student, I want a context menu to appear when I right-click a key label, so that I can choose what action to perform on that key.

#### Acceptance Criteria

1. WHEN the user right-clicks a Key_Label, THE Circle_App SHALL suppress the default browser context menu and display a custom Context_Menu positioned with its top-left corner at the pointer coordinates of the click event
2. THE Context_Menu SHALL always contain exactly two items in the following order: "Show neighbors" and "Clear neighbors"
3. IF the Neighbor_Overlay group contains one or more child elements WHEN the Context_Menu is displayed, THEN THE "Clear neighbors" item SHALL be enabled (clickable)
4. IF the Neighbor_Overlay group contains zero child elements WHEN the Context_Menu is displayed, THEN THE "Clear neighbors" item SHALL be visually greyed out and non-interactive (disabled)
5. WHEN the user clicks anywhere outside the Context_Menu, THE Circle_App SHALL dismiss the Context_Menu without performing any action
6. IF the user right-clicks a Key_Label while a Context_Menu is already visible, THEN THE Circle_App SHALL dismiss the existing Context_Menu and display a new Context_Menu at the new pointer coordinates
7. WHEN the user right-clicks a Key_Label, THE Circle_App SHALL NOT modify the Neighbor_Overlay in any way; the overlay remains unchanged until a menu action is selected

### Requirement 2: Neighbor Key Highlighting

**User Story:** As a music student, I want to highlight the neighbor keys of a selected key across both rings, so that I can visualize all closely related keys (major and minor) on the circle.

#### Acceptance Criteria

1. WHEN the user selects "Show neighbors" from the Context_Menu, THE Circle_App SHALL clear any existing content in the Neighbor_Overlay and then render exactly 6 highlighted sectors: 3 on the tonic's ring (Selected_Key at index N, indices (N+1) mod 12 and (N−1) mod 12) and 3 on the relative ring (same indices)
2. IF the Selected_Key is major, THE tonic's ring SHALL be the Outer_Ring and the relative ring SHALL be the Inner_Ring
3. IF the Selected_Key is minor, THE tonic's ring SHALL be the Inner_Ring and the relative ring SHALL be the Outer_Ring
4. WHEN the user selects "Show neighbors" for a major Key_Label, THE Circle_App SHALL apply the `highlight-major` CSS class (rgba(139,0,0,0.25) fill) to all 6 highlighted sectors
5. WHEN the user selects "Show neighbors" for a minor Key_Label, THE Circle_App SHALL apply the `highlight-minor` CSS class (rgba(46,107,46,0.22) fill) to all 6 highlighted sectors
6. WHEN the user selects "Show neighbors", THE Circle_App SHALL apply the `fade-in` CSS class to each highlighted sector, producing an opacity animation from 0 to the element's final opacity over 220ms with ease timing
7. THE Circle_App SHALL render the Selected_Key's sector at full opacity (1.0) and all 5 neighbor sectors at reduced opacity (0.45) to visually distinguish the tonic
8. THE Circle_App SHALL render each highlighted sector as an SVG path element within the Neighbor_Overlay group, using exact circle radii: Outer_Ring spans outerRadius (320) to middleRadius (215), Inner_Ring spans middleRadius (215) to innerRadius (110)

### Requirement 3: Roman Numeral Labeling

**User Story:** As a music theory student, I want roman numerals displayed on all neighbor sectors showing full scale degree relationships, so that I can understand the functional harmonic relationship between the selected key and all its diatonic neighbors.

#### Acceptance Criteria

1. WHEN the user selects "Show neighbors" for a major Selected_Key, THE Circle_App SHALL display Roman_Numeral_Labels on all 6 sectors: on the Outer_Ring "I" (self), "V" (clockwise), "IV" (counter-clockwise); on the Inner_Ring "vi" (self), "iii" (clockwise), "ii" (counter-clockwise)
2. WHEN the user selects "Show neighbors" for a minor Selected_Key, THE Circle_App SHALL display Roman_Numeral_Labels on all 6 sectors: on the Inner_Ring "i" (self), "v" (clockwise), "iv" (counter-clockwise); on the Outer_Ring "III" (self), "VII" (clockwise), "VI" (counter-clockwise)
3. THE Circle_App SHALL position each Roman_Numeral_Label in the top-right corner of its corresponding sector, offset 10° clockwise from the sector center angle and 18px inward from the outer boundary of the ring
4. THE Circle_App SHALL render each Roman_Numeral_Label as an SVG text element with font-size 15px for Outer_Ring labels and 13px for Inner_Ring labels, using text-anchor "middle", dominant-baseline "central", font-family "Georgia, serif", and font-weight 700
5. THE Circle_App SHALL color Roman_Numeral_Labels using the Selected_Key's type color: #8B0000 for major, #2E6B2E for minor
6. WHEN the neighbor overlay is cleared, THE Circle_App SHALL remove all Roman_Numeral_Labels from the SVG within the same operation that removes the highlighted sectors

### Requirement 4: Overlay Replacement via Show Neighbors

**User Story:** As a user, I want selecting "Show neighbors" on a new key to replace the current overlay, so that I can quickly compare neighbor relationships without manually clearing first.

#### Acceptance Criteria

1. WHEN the user selects "Show neighbors" from the Context_Menu while a Neighbor_Overlay is already visible, THE Circle_App SHALL clear all existing child elements from the Neighbor_Overlay group and then render the new overlay for the newly Selected_Key
2. WHEN the user selects "Show neighbors" from the Context_Menu after clearing, THE Circle_App SHALL render the Neighbor_Overlay with sectors and Roman_Numeral_Labels for the newly Selected_Key, with no residual elements from the previous overlay
3. THE Circle_App SHALL NOT clear or modify the Neighbor_Overlay upon right-clicking a Key_Label; clearing only occurs when the user explicitly selects "Show neighbors" or "Clear neighbors" from the Context_Menu

### Requirement 5: Clear Neighbors Action

**User Story:** As a user, I want to dismiss the neighbor overlay entirely, so that I can return to the unadorned circle view.

#### Acceptance Criteria

1. WHEN the user selects "Clear neighbors" from the Context_Menu, THE Circle_App SHALL remove all child elements (path and text nodes) from the Neighbor_Overlay group and close the Context_Menu
2. WHEN the user selects "Clear neighbors", THE Circle_App SHALL retain the Neighbor_Overlay `<g class="neighbor-overlay">` element in the DOM with zero child elements
3. THE "Clear neighbors" menu item SHALL always be visible in the Context_Menu but SHALL be disabled (greyed out, non-interactive) when the Neighbor_Overlay group contains zero child elements

### Requirement 6: Key Label Interaction Scope

**User Story:** As a user, I want the context menu to work on both major and minor key labels, so that I can explore neighbor relationships from either perspective.

#### Acceptance Criteria

1. WHEN the user right-clicks any SVG text element with class `major-key`, THE Circle_App SHALL suppress the default browser context menu and display the Context_Menu for the corresponding slice using the major highlight style
2. WHEN the user right-clicks any SVG text element with class `minor-key`, THE Circle_App SHALL suppress the default browser context menu and display the Context_Menu for the corresponding slice using the minor highlight style
3. WHEN the user right-clicks an area of the SVG that is not a text element with class `major-key` or `minor-key`, THE Circle_App SHALL allow the default browser context menu to appear without calling preventDefault
4. THE Circle_App SHALL use event delegation by attaching a single `contextmenu` event listener on the SVG element and determining the target by checking the clicked element's classList for `major-key` or `minor-key`
