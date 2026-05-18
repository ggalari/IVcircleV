# Modulation Routes / Closest Key Transitions

## Goal
Visualize the most natural key changes to help users understand modulation and neighbor-key relationships.

## Option 1: Nearest-neighbor curved arrows (Best usability, low difficulty)
- Draw subtle curved arrows between adjacent outer-circle keys.
- Each arrow represents a single accidental step or close modulation route.
- Use soft grey or muted red strokes and small text labels like `+1♯`.

### Usability
- Very clear and immediately legible.
- Reinforces the circle’s existing neighbor relationships.
- Keeps user focus on the circle itself.

### Technical difficulty
- Low: simple path drawing between two adjacent positions.
- Can be implemented in the current SVG generator with existing coordinate math.
- Minimal styling changes are needed.

## Option 2: Mini transition map inset (Good usability, medium difficulty)
- Add a small inset panel inside the card below the SVG.
- Display a simplified route map with 3–5 keys and arrows, such as `FA → DO → SOL`.
- Keep the same red/grey palette and serif label style.

### Usability
- Excellent for users who want a quick, annotated reference.
- Separates modulation explanation from the main circle, avoiding clutter.
- Works well for teaching the concept of key distance.

### Technical difficulty
- Medium: requires extra HTML/CSS and a small secondary SVG or graphic.
- Need to ensure the inset scales nicely in the existing card layout.
- Slightly more work than a pure in-SVG solution.

## Option 3: Weighted halo bands (Moderate usability, moderate difficulty)
- Add a faint outer halo around the circle whose thickness or opacity indicates closeness.
- Keys with one accidental difference get a stronger halo band; distant keys get lighter bands.
- Include a small legend in the note area explaining the band weights.

### Usability
- Subtle and elegant, but less explicit than arrows.
- Best for users who want a worldview of modulation proximity rather than exact routes.
- Can complement the current ring-based design nicely.

### Technical difficulty
- Moderate: requires generating additional halo paths or ring sectors.
- Must be styled carefully so the halo supports rather than overwhelms the main circle.
- No new HTML required beyond a legend line in the existing note area.
