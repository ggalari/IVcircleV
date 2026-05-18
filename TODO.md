# Circle of Fifths – Feature Roadmap

## Existing Features

- [x] Circle of fifths SVG rendering with key signatures (sharps/flats on staves)
- [x] Major and minor key labels with leading tone annotations
- [x] Relative major/minor visual connection (inner/outer ring layout)
- [x] Right-click context menu on key labels (Show neighbors / Clear neighbors)
- [x] Neighbor key overlay with roman numeral scale degrees (I/IV/V/ii/iii/vi)
- [x] Dual-ring highlighting (outer + inner) with tonic opacity differentiation
- [x] Save SVG / Print / Show SVG code utilities

## Planned Features

### High Value, Moderate Effort

- [ ] Common chord progressions overlay
  - Show classic progressions (I–IV–V–I, ii–V–I, I–vi–IV–V) as animated arcs or highlighted paths
  - Students see why these progressions sound natural — the keys are neighbors

- [ ] Scale/mode display
  - Click a key → see its scale notes highlighted (major, natural minor, harmonic minor, melodic minor)
  - Extend to modes (Dorian, Mixolydian, etc.) which map beautifully to the circle

- [ ] Chord builder
  - Select a key → see its diatonic triads and seventh chords (I, ii, iii, IV, V, vi, vii°)
  - Show which are major, minor, diminished, augmented

### Medium Value, Lower Effort

- [ ] Transposition helper
  - Select source and target key → show interval distance and highlight both positions

- [ ] Enharmonic toggle
  - Switch between sharp and flat spellings for ambiguous keys (F#/Gb, C#/Db)

- [ ] Audio playback
  - Play tonic triad or scale when clicking a key (Web Audio API)
  - Play chord progression overlays for ear training

### High Value, Higher Effort

- [ ] Modulation path finder
  - Select start and destination key → show shortest modulation path with pivot chord suggestions

- [ ] Interactive quiz mode
  - "What is the relative minor of Eb?" — student clicks the answer
  - "What key has 3 sharps?" — gamification with streaks/scores

- [ ] Cadence explorer
  - Show authentic (V→I), plagal (IV→I), deceptive (V→vi), half cadences visually
  - Animate resolution direction on the circle

### Quick Wins

- [ ] Dark/light theme toggle
- [ ] Mobile-friendly touch interactions (long-press instead of right-click)
- [ ] Shareable URL state (encode overlay/selection in URL hash)

### Infrastructure

- [ ] Localisation (i18n)
  - Externalise all UI labels, note names, chord names, and roman numerals into locale files
  - Support French (current default) and English as initial languages
  - Allow switching language at runtime without page reload

## Architecture Discussion (pending)

Before implementing new features, discuss technology and architecture choices to ensure the codebase can scale for the features above.
