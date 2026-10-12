# Circle of Fifths

An interactive Circle of Fifths explorer for music students, in French solfège
notation. This is the shared vocabulary for the concepts the app teaches and the
structures that present them.

## The Circle

**Slice**:
One of the 12 equal 30° positions around the circle, indexed 0–11 clockwise from DO.
Each slice carries one major key and its relative minor.
_Avoid_: segment, sector, wedge, position

**Ring**:
One of the two concentric bands of the circle. The outer ring holds the 12 major
keys; the inner ring holds their relative minors.
_Avoid_: band, track

**Tonic**:
The key currently selected, from which the diatonic neighborhood is derived.
_Avoid_: active key, root

**Neighbor**:
A key adjacent to the tonic on the circle. The clockwise neighbor is a fifth up
(the dominant); the counter-clockwise neighbor is a fifth down (the subdominant).
_Avoid_: adjacent key, surrounding key

**Diatonic neighborhood**:
The set of tonic-relative keys supplying the tonic's diatonic chords — the tonic
itself, its clockwise and counter-clockwise neighbors on both rings, and the
diminished degree.
_Avoid_: overlay set, highlighted keys

## Keys and Pitch

**Key**:
A major or minor tonality, defined by a tonic and a key signature.
_Avoid_: tonality

**Relative major/minor**:
A major key and a minor key sharing one key signature, occupying the same slice on
the outer and inner rings respectively.
_Avoid_: shared key

**Key signature**:
The collection of sharps or flats that defines a key, rendered on a staff with its
clef and accidentals.
_Avoid_: signature

**Leading tone**:
The note a semitone below the tonic; the seventh degree of a major scale.
_Avoid_: subtonic

**Accidental**:
A symbol altering a note's pitch: sharp (♯), flat (♭), double sharp (𝄪), double flat (♭♭), natural (♮).
_Avoid_: modifier

**Enharmonic**:
Two different spellings of the same sounding pitch, e.g. FA♯ and SOL♭.
_Avoid_: equivalent note

**Solfège**:
The French note-naming system used throughout: DO, RE, MI, FA, SOL, LA, SI.
_Avoid_: do-re-mi, French notation

**Spelled pitch**:
A note as written — letter, accidental, and octave — e.g. `FA♯4`, `SI♭3`. The pitch's
spelling is preserved through the app; the staff renders `FA♯`, never `SOL♭`.
_Avoid_: note name, pitch literal

## Scales and Degrees

**Scale degree**:
A numbered position within a scale, 1 through 7.
_Avoid_: step

**Roman numeral**:
The label for a scale degree or the chord built on it. Uppercase marks major
quality, lowercase marks minor, and `°` marks diminished.
_Avoid_: degree label

**Diatonic chord**:
A chord whose notes all belong to the tonic's scale.
_Avoid_: scale chord

**Triad**:
A three-note diatonic chord stacked in thirds.
_Avoid_: three-note chord

**Seventh chord**:
A four-note diatonic chord: a triad plus the seventh.
_Avoid_: four-note chord

**Chord quality**:
The interval structure giving a chord its character: major, minor, diminished, or
augmented; for sevenths, maj7, min7, dom7, or half-dim7.
_Avoid_: chord type

**Interval**:
The distance between two pitches, measured in semitones.
_Avoid_: gap, distance

**Major scale** (Majeure):
The seven-note scale built on the interval pattern 2–2–1–2–2–2–1 semitones.
_Avoid_: Ionian

**Natural minor** (Mineure naturelle):
The minor scale following 2–1–2–2–1–2–2.
_Avoid_: Aeolian

**Harmonic minor** (Mineure harmonique):
Natural minor with a raised seventh degree.
_Avoid_: —

**Melodic minor** (Mineure mélodique):
Natural minor with raised sixth and seventh degrees in its ascending form.
_Avoid_: —

## Views and Presentation

**View**:
One of the three full-screen panels the user swipes between: Full Circle View,
Chord Explorer, and Scale Explorer.
_Avoid_: mode, screen, page, tab

**Full Circle View**:
The view showing all 12 major and 12 minor keys at once.
_Avoid_: circle view, main view

**Chord Explorer**:
The view showing the tonic's seven diatonic triads and seventh chords on staves.
_Avoid_: chord view

**Scale Explorer**:
The view showing four ascending scales for the tonic on staves.
_Avoid_: scale view

**Neighbor arc**:
The magnified arc of the circle centered on the tonic, used by Chord Explorer and
Scale Explorer.
_Avoid_: zoom, circle zoom, zoom arc

**Overlay**:
Highlighted sectors and labels drawn on top of the circle to mark the diatonic
neighborhood.
_Avoid_: highlight layer

**Center label**:
The tonic key name and its major/minor type shown at the circle's center.
_Avoid_: circle label

**Staff**:
The five-line musical staff on which key signatures, chords, and scales are
rendered.
_Avoid_: stave

**Staff position**:
A note's vertical placement on the staff, one step per scale degree.
_Avoid_: note position

## Audio

**Instrument**:
One of the two sound sources for playback: acoustic guitar or grand piano.
_Avoid_: voice, timbre

**Sample key**:
The canonical key derived from a spelled pitch and used to look up a note's audio
sample, e.g. `C4`, `F#4`.
_Avoid_: pitch key, buffer key
