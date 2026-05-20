# Cercle des Quintes — Interactive Circle of Fifths

An interactive music theory tool built with vanilla JavaScript. Explore keys, chords, and scales through three complementary views with touch-friendly circular navigation.

## Features

### Full Circle View
- Complete circle of fifths with all 12 major and minor keys (French solfège notation)
- Tap any key to select it and see its diatonic neighborhood highlighted
- Color-coded overlay: red for major ring, green for minor ring
- Roman numeral scale degree labels (I, IV, V, ii, iii, vi, vii°)
- Key signature staffs with clef and accidentals for each key
- Leading tones shown in parentheses

### Chord Explorer View
- Zoomed neighbor arc showing the selected key's harmonic neighborhood
- 7 diatonic triads rendered on a music staff (root position)
- 7 diatonic seventh chords on a second staff
- Chord labels: roman numerals + chord names (e.g., DOm, SOLm7, SI°)
- Proper diatonic spelling consistent with the key signature

### Scale Explorer View
- Zoomed neighbor arc for context
- 4 scales for the selected key:
  - Major scale
  - Natural minor (relative minor)
  - Harmonic minor (raised 7th with accidental)
  - Melodic minor ascending (raised 6th and 7th)
- Correct ascending notation with proper staff positions
- Each note labeled below the staff
- Double-sharp symbol (𝄪) used where needed

### Navigation
- Swipe left/right to cycle through views (circular — wraps around)
- Chevron buttons on both sides
- Keyboard arrow keys (left/right)
- Page indicator dots showing current view
- Tap any key on the circle or zoomed arc to select it

## Tech Stack

- **Vanilla JavaScript** — no framework
- **Vite** — bundler and dev server
- **abcjs** — music notation rendering (clefs, key signatures, noteheads)
- **vitest** — test runner
- **fast-check** — property-based testing

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

The production build outputs static files to `dist/` — deploy anywhere that serves HTML.

## Project Structure

```
src/
├── circle/          # Circle rendering (drawSlice, geometry, keys data)
├── modes/           # Mode views (full-circle, chord-explorer, scale-explorer)
├── theory/          # Pure music theory (chords, scales, degrees)
├── overlays/        # Neighbor highlight overlay
├── ui/              # Navigation UI (chevrons, page-indicator, keyboard-nav)
└── main.js          # App entry point
```

## License

MIT
