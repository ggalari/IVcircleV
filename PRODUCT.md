# Product

## Register

product

## Users

Music students with basic to intermediate theory knowledge. They use this on mobile or tablet during practice sessions, and occasionally on desktop for deeper exploration. They already know what a key signature is; they want to see relationships between keys, chords, and scales quickly.

## Product Purpose

An interactive Circle of Fifths explorer that makes key relationships, diatonic chords, and scale construction immediately visible. French solfège notation throughout. Success means a student can tap a key and instantly understand its harmonic neighborhood without flipping through textbook pages.

## Implemented Features

### Three Interactive Views

1. **Full Circle View** — The complete circle of fifths with 12 major and 12 minor keys. Tap any key to highlight its diatonic neighborhood (I, IV, V, ii, iii, vi, vii°) with color-coded overlays. Shows roman numerals, leading tones, and key signature staffs with clef and accidentals.

2. **Chord Explorer** — Zoomed neighbor arc centered on the selected key. Displays 7 diatonic triads and 7 diatonic seventh chords on music staves. Labels use roman numerals and French chord names (DOm, SOL7, SI°, LAΔ7...). Proper diatonic spelling (sharp keys use sharps, flat keys use flats).

3. **Scale Explorer** — Four ascending scales rendered on music staves: Major, Natural Minor, Harmonic Minor (raised 7th), Melodic Minor ascending (raised 6th and 7th). Correct staff positions, diatonic note spelling, and double-sharp (𝄪) where needed.

### Audio Playback

- Play scales and chords for any key with real audio samples
- Two instruments: **Acoustic Guitar** and **Grand Piano**
- Sequential scale playback with per-note highlighting and bouncing sphere animation
- Chord sequence playback with per-chord highlighting
- Tap individual notes or chords for immediate single-sound playback
- Gain normalization for multi-note chords (1/N per tone)
- Instrument switching via a submenu in the settings dropdown

### Instrument Selection

- Submenu in the settings dropdown showing both instruments with the active one checked
- Switching instruments stops current playback, reloads the appropriate sample set, and disables play buttons during loading
- Instrument preference persisted as a cookie (survives page reload)
- Guitar uses recorded acoustic samples (C3–D5) with Karplus-Strong synthesis fallback for higher pitches
- Piano uses recorded grand piano samples (C3–B5) with no synthesis fallback

### Navigation & Interaction

- Swipe left/right to cycle between the three views (wraps around)
- Chevron buttons always visible for view switching
- Keyboard arrows (← →) for desktop navigation
- Page indicator dots showing current view
- Tap keys on the circle or zoomed arc to change key selection
- Right-click/long-press context menu for neighbor key navigation
- Desktop click handler for direct key selection on the circle SVG

### Settings & Preferences

- **Theme**: Light/Dark mode toggle (respects system preference, persisted via cookie)
- **Center label**: Toggle key name display at circle center
- **Instrument**: Submenu to switch between Guitar and Piano
- All preferences persist across sessions via cookies

### Accessibility

- WCAG 2.1 AA color contrast
- Touch targets minimum 44px
- `aria-label` on all interactive elements
- `aria-live` region for screen reader key change announcements
- Keyboard navigation (Tab, Enter, Space, Arrow keys)
- `role="menu"`, `role="menuitem"`, `role="menuitemradio"` on dropdown elements
- Reduced motion support

### Technical

- Vanilla JS (no framework), Vite build
- Web Audio API for sample playback with AudioContext lazy initialization
- Pub/sub state store for reactive component updates
- abcjs for music notation rendering
- Responsive layout with mobile-first CSS
- 434 automated tests (vitest + fast-check property-based testing)

## Brand Personality

Informative, polished, clear.

The interface should feel like a well-made reference tool: authoritative without being academic, clean without being sterile. It respects the user's existing knowledge and gets out of the way.

## Anti-references

- Gamified music apps (Yousician, Simply Piano): too playful, too much chrome
- Generic music theory websites with cluttered layouts and ad-heavy sidebars
- Overly minimal "design exercise" apps that sacrifice information density for aesthetics
- Dark-mode-for-cool dashboards with neon accents

## Design Principles

1. **Information first**: every visual choice serves comprehension. Decoration that doesn't aid understanding gets cut.
2. **Immediate legibility**: a glance should orient the user. Key relationships, chord quality, scale degree: all readable without squinting or decoding.
3. **Quiet confidence**: the tool knows what it is. No need to explain itself with tooltips, onboarding modals, or excessive labeling.
4. **Responsive to context**: works equally well as a quick-glance reference on a phone and a study companion on a laptop.

## Accessibility & Inclusion

- WCAG 2.1 AA minimum
- Color is never the sole differentiator (red/green coding must have secondary indicators)
- Touch targets minimum 44px
- Reduced motion support for animations
- Screen reader labels for interactive SVG elements
