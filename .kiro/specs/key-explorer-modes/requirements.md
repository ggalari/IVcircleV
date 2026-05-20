# Requirements Document

## Introduction

The Key Explorer Modes feature transforms the Circle of Fifths app from a single-view tool into a multi-mode exploration system. Users navigate between three complementary views — Full Circle, Chord Explorer, and Scale Explorer — via horizontal swipe gestures (mobile) or keyboard/chevron navigation (desktop). Navigation wraps around circularly (Scales → Full Circle, Full Circle → Scales). Each mode provides a different lens on the selected key's harmonic relationships. The app always maintains a selected key (defaulting to C Major / DO on launch) and the current mode persists across key changes.

## Glossary

- **Mode_Switcher**: The navigation system that manages circular transitions between the three explorer modes via swipe gestures, keyboard arrows, or chevron buttons
- **Full_Circle_View**: The full-circle view showing all 12 keys with the selected key's diatonic neighbors highlighted and roman numeral scale degree labels
- **Chord_Explorer_View**: A focused view displaying a zoomed neighbor arc, the selected key's diatonic triads and seventh chords on music staves (rendered by abcjs) with chord quality annotations
- **Scale_Explorer_View**: A focused view displaying a zoomed neighbor arc and scales associated with the selected key (major, natural minor, harmonic minor, melodic minor) rendered by abcjs
- **Zoomed_Neighbor_Arc**: A partial circle of fifths showing only the diatonic neighborhood (3 complete slices + 1 partial for the diminished chord), redrawn using the same `drawSlice` routine as the full circle
- **Page_Indicator**: A row of small dot indicators showing the current mode position among the three available modes
- **Active_Key**: The currently selected key on the circle of fifths; the app always has exactly one Active_Key
- **Swipe_Gesture**: A horizontal touch movement (left or right) used to navigate between modes on touch devices
- **drawSlice**: The reusable rendering routine that draws a single slice of the circle at any angular position, with configurable visibility of major/minor rings, staff, leading tones, and backgrounds

## Requirements

### Requirement 1: Default State on Launch

**User Story:** As a music student, I want the app to start with C Major selected and the Full Circle view active, so that I immediately see useful harmonic context.

#### Acceptance Criteria

1. WHEN the application loads, THE Mode_Switcher SHALL set the Active_Key to C Major (DO) and display the Full_Circle_View with the title "Cercle des quintes" centered at the top
2. WHEN the application loads, THE Full_Circle_View SHALL show the neighbor overlay highlighting the 7 diatonic neighbor sectors with roman numeral scale degree labels and leading tones
3. THE Mode_Switcher SHALL maintain exactly one Active_Key at all times

### Requirement 2: Key Selection Across Modes

**User Story:** As a user, I want to tap any key on the circle (or zoomed arc) to select it, so that I can explore different keys without switching views.

#### Acceptance Criteria

1. WHEN a user taps a key sector on the circle or zoomed arc, THE Mode_Switcher SHALL update the Active_Key and redraw all views for the new key
2. IF the user taps the already-active key, THEN THE Mode_Switcher SHALL not re-render
3. WHEN the Active_Key changes, THE Mode_Switcher SHALL remain in the current mode and update content within 300ms

### Requirement 3: Mode Navigation (Circular)

**User Story:** As a user, I want to swipe or use controls to cycle through modes in a loop, so I can fluidly explore all views.

#### Acceptance Criteria

1. WHEN a user swipes left, THE Mode_Switcher SHALL transition to the next mode (Full Circle → Chords → Scales → Full Circle)
2. WHEN a user swipes right, THE Mode_Switcher SHALL transition to the previous mode (Full Circle → Scales → Chords → Full Circle)
3. WHEN a mode transition occurs, THE Mode_Switcher SHALL animate with a 300ms horizontal slide
4. Chevron buttons SHALL always be visible on both sides
5. Arrow keys SHALL navigate modes circularly

### Requirement 4: Page Indicator

**User Story:** As a user, I want to see dot indicators showing which mode I'm viewing.

#### Acceptance Criteria

1. THE Page_Indicator SHALL display three dots, with the active mode's dot filled and others dimmed
2. THE Page_Indicator SHALL update immediately when the mode changes

### Requirement 5: Full Circle View

**User Story:** As a music student, I want to see the full circle of fifths with highlighted neighbors and roman numerals.

#### Acceptance Criteria

1. THE Full_Circle_View SHALL display all 12 key sectors with both major and minor rings
2. THE overlay SHALL highlight neighbors with red for the outer (major) ring and green for the inner (minor) ring, matching the legend colors
3. THE Full_Circle_View SHALL display roman numeral labels (red for major ring, green for minor ring) and leading tones in parentheses
4. THE legend SHALL show "Majeur" (red) and "Mineur" (green)

### Requirement 6: Zoomed Neighbor Arc

**User Story:** As a music student, I want to see a zoomed view of the selected key's neighborhood in the Chord and Scale views.

#### Acceptance Criteria

1. THE Zoomed_Neighbor_Arc SHALL show exactly: 3 complete slices (IV/ii, I/vi, V/iii for major) + 1 partial slice (minor ring only for vii°)
2. THE arc SHALL be redrawn using `drawSlice` with the active key at position 0 (top)
3. THE arc SHALL include key names, leading tones, staffs with accidentals, overlay colors, and roman numerals
4. THE overlay colors SHALL match the full circle (red for outer ring, green for inner ring)
5. Tapping a key in the arc SHALL select that key and redraw all views

### Requirement 7: Chord Explorer View

**User Story:** As a music student, I want to see diatonic triads and seventh chords for the selected key.

#### Acceptance Criteria

1. THE Chord_Explorer_View SHALL display the key name as a centered title, followed by the zoomed neighbor arc
2. THE view SHALL render 7 diatonic triads and 7 seventh chords on music staves using abcjs
3. Chord labels SHALL show roman numerals on one line and chord names (e.g., DOm, RE°, SOLm7) on a second line, attached to each chord via ABC w: lines
4. Chord roots SHALL use proper diatonic spelling consistent with the key (sharp keys use sharp names)
5. All chords SHALL be in root position (chord I is the lowest)

### Requirement 8: Scale Explorer View

**User Story:** As a music student, I want to see scales for the selected key with proper notation.

#### Acceptance Criteria

1. THE Scale_Explorer_View SHALL display the key name as a centered title, followed by the zoomed neighbor arc
2. THE view SHALL render 4 scales: major, natural minor, harmonic minor, melodic minor (ascending)
3. Scales SHALL use proper diatonic spelling (each letter name used once, no repeated note names)
4. Scales SHALL be ascending, starting at the correct staff position (A=-2, B=-1, C=0, D=1, E=2, F=3, G=4)
5. Harmonic and melodic minor SHALL show explicit accidentals for raised degrees
6. Double sharps SHALL use the 𝄪 symbol
7. Note labels SHALL be attached below each note via ABC w: lines

### Requirement 9: Gesture Discrimination

**User Story:** As a mobile user, I want taps and swipes to be correctly distinguished.

#### Acceptance Criteria

1. Horizontal displacement > 30px and duration < 300ms → swipe
2. Total displacement ≤ 10px and duration ≤ 300ms → tap (key selection)
3. A single touch SHALL never trigger both a key selection and a mode switch
