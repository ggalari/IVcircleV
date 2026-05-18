# Functional Harmony Overlays

## Goal
Add visual guidance for common harmonic progressions so users can see functional movement on the circle.

## Option 1: SVG Arc Overlays (Best usability, moderate difficulty)
- Draw curved arcs linking `I → IV → V`, `ii → V → I`, and other common progressions.
- Use a dedicated `<g class="harmony-overlays">` within the main SVG.
- Style with deep red strokes, subtle dashed lines, and small serif labels on the arcs.
- Keep the overlay semitransparent so the existing ring and key labels remain visible.

### Usability
- Very intuitive: users can see exactly how progressions connect keys.
- Works well on the current page because the circle already has strong radial structure.
- Good for learning common cadences.

### Technical difficulty
- Moderate: requires computing arc control points and placing labels.
- No new HTML structure needed beyond the existing SVG.
- Minimal DOM overhead, all inside one generated SVG.

## Option 2: Ribbon-style progression bands (High usability, higher difficulty)
- Add a second, narrow ring between the existing `middleRadius` and `outerRadius`.
- Render discrete band segments for progressions like `I–IV–V` as translucent red ribbons.
- Place a small label at the center of each ribbon segment (e.g. `I–IV–V`).

### Usability
- Highly visible and elegant for users who want quick pattern recognition.
- Provides a strong visual narrative of progression flow.
- Could be slightly more abstract than direct arcs, but still readable.

### Technical difficulty
- Higher: requires additional ring segmentation logic and path building.
- Must ensure the ribbon does not compete visually with the main key labels.
- Requires careful styling to preserve current page balance.

## Option 3: HTML legend + interactive SVG highlights (Good usability, moderate difficulty)
- Add toolbar controls or legend buttons: `I–IV–V`, `ii–V–I`, `Show cadences`.
- Keep the SVG mostly unchanged, but mark the relevant key positions with data attributes.
- On selection, add or reveal overlay elements and highlight related keys/paths.

### Usability
- Very approachable, especially for learners who want explicit examples.
- Avoids clutter by showing only one progression at a time.
- Offers interactivity that makes the page feel more like a study tool.

### Technical difficulty
- Moderate: requires light scripting in `circle_of_fifths.page.js` or new JS logic.
- Still compatible with the existing HTML and SVG generator.
- Needs a small amount of UI work for toggles/buttons.
