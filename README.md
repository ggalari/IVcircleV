# IV Circle V — Cercle des Quintes Interactif

An interactive Circle of Fifths explorer for music students. Navigate between three views to understand keys, chords, and scales — all in French solfège notation.

## Features

### 🎵 Full Circle View
- Interactive circle of fifths with 12 major and 12 minor keys
- Tap any key to highlight its diatonic neighborhood (I, IV, V, ii, iii, vi, vii°)
- Color-coded overlay: red (Majeur) and green (Mineur)
- Roman numeral labels and leading tones for each neighbor
- Key signature staffs with clef and accidentals

### 🎹 Chord Explorer
- Zoomed neighbor arc centered on the selected key
- 7 diatonic triads in root position on a music staff
- 7 diatonic seventh chords on a second staff
- Labels: roman numerals + chord names (DOm, SOL7, SI°, LAΔ7...)
- Proper diatonic spelling (sharp keys use sharps, flat keys use flats)

### 🎼 Scale Explorer
- Zoomed neighbor arc for harmonic context
- 4 ascending scales rendered on music staves:
  - Major
  - Natural Minor
  - Harmonic Minor (raised 7th with accidental)
  - Melodic Minor ascending (raised 6th and 7th)
- Correct staff positions and diatonic note spelling
- Double-sharp symbol (𝄪) where needed

### 📱 Navigation
- Swipe left/right to cycle views (circular — wraps around)
- Chevron buttons always visible
- Keyboard arrows (← →)
- Page indicator dots
- Tap keys on the circle or zoomed arc to change selection

## Getting Started

```bash
npm install
npm run dev      # dev server at localhost:5173
npm test         # run tests
npm run build    # production build → dist/
```

## Deploy

The `dist/` folder is a static site. Deploy to Netlify, Vercel, GitHub Pages, or any static host.

## Tech

Vanilla JS · Vite · abcjs (notation) · vitest · fast-check

## License

MIT
