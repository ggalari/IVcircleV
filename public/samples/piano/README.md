# Piano Samples

This directory should contain grand piano audio samples covering the chromatic range C3 to B5 (36 pitches).

## File Naming Convention

Files use flat-based naming: `{NoteName}{Octave}.mp3`

### Expected Files

**Octave 3:**
C3.mp3, Db3.mp3, D3.mp3, Eb3.mp3, E3.mp3, F3.mp3, Gb3.mp3, G3.mp3, Ab3.mp3, A3.mp3, Bb3.mp3, B3.mp3

**Octave 4:**
C4.mp3, Db4.mp3, D4.mp3, Eb4.mp3, E4.mp3, F4.mp3, Gb4.mp3, G4.mp3, Ab4.mp3, A4.mp3, Bb4.mp3, B4.mp3

**Octave 5:**
C5.mp3, Db5.mp3, D5.mp3, Eb5.mp3, E5.mp3, F5.mp3, Gb5.mp3, G5.mp3, Ab5.mp3, A5.mp3, Bb5.mp3, B5.mp3

## Notes

- Accidentals use **flat-based** names (Db, Eb, Gb, Ab, Bb) — not sharps (C#, D#, F#, G#, A#).
- Enharmonic aliases (e.g., F#4 → Gb4) are resolved at runtime by the sample library.
- Format: MP3 (`.mp3`)
- Unlike guitar samples, there is **no Karplus-Strong synthesis fallback** for piano — missing files will result in silence for that pitch.
