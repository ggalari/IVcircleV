# Modes and Scale Degree Annotations

## Goal
Make modal relationships and scale-degree theory visible on the circle.

## Option 1: Inner ring of mode names (Best usability, moderate difficulty)
- Add a new thin ring just inside the current `innerRadius`.
- Place mode names like `Ionian`, `Dorian`, `Phrygian`, etc. around that inner path.
- Keep the labels small, grey, and serif so they read as supplementary information.

### Usability
- Strong: users can directly see mode names in relation to each key.
- Matches the existing circular layout and does not require extra UI.
- Makes the diagram more useful for modal study.

### Technical difficulty
- Moderate: needs coordinate math for a new ring and text placement.
- Requires decision on how to align names clearly without cluttering the center.
- Can be implemented entirely in SVG.

## Option 2: Scale-degree labels next to major keys (Best balance, low difficulty)
- Add small secondary text near each major key label with `I`, `ii`, `iii`, `IV`, `V`, `vi`, `vii°`.
- Use a lighter grey and reduced font size for hierarchy.
- Optionally include a toggle to switch between degrees and mode names.

### Usability
- Very easy to understand and highly practical.
- Keeps the main diagram readable while adding theory annotation.
- Works well with the existing radial label positions.

### Technical difficulty
- Low: just extra label placement based on existing coordinates.
- Minimal changes to the current SVG generator.
- Very robust and low-risk.

## Option 3: Modal switch + overlay annotation (High usability, higher difficulty)
- Add a toolbar control: `Mode: Ionian / Dorian / Aeolian / Mixolydian`.
- When a mode is selected, overlay a translucent circle highlighting the current modal degrees.
- Show the current mode name in the center and possibly highlight the corresponding minor/major pairs.

### Usability
- Great for interactive learners and exploration.
- Helps users understand how each mode maps onto the circle.
- More engaging than static labels.

### Technical difficulty
- Higher: requires toolbar UI, state handling, and dynamic SVG updates.
- Needs careful design to avoid making the page feel too busy.
- Requires additional scripting in `circle_of_fifths.page.js` or in the main generator.
