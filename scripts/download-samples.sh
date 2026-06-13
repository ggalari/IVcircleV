#!/bin/bash
# Download instrument samples from nbrosowsky/tonejs-instruments (CC-BY 3.0)
# Source: https://github.com/nbrosowsky/tonejs-instruments
# License: Creative Commons Attribution 3.0
#
# Samples are originally from the University of Iowa Electronic Music Studios
# and processed for web use by Nicholaus P. Brosowsky.
#
# This script downloads piano and guitar-acoustic samples for the C3–B5 range
# and renames them to the flat-based naming convention used by this project.

set -e

BASE_URL="https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples"
PIANO_DIR="public/samples/piano"
GUITAR_DIR="public/samples/guitar"

mkdir -p "$PIANO_DIR" "$GUITAR_DIR"

# Mapping: our flat-based name -> tonejs sharp-based name
# tonejs uses: A3, As3 (A#), B3, C3, Cs3 (C#), D3, Ds3 (D#), E3, F3, Fs3 (F#), G3, Gs3 (G#)
# We use:     A3, Bb3,      B3, C3, Db3,       D3, Eb3,       E3, F3, Gb3,       G3, Ab3

declare -a NOTES=(
  "C3:C3" "Db3:Cs3" "D3:D3" "Eb3:Ds3" "E3:E3" "F3:F3" "Gb3:Fs3" "G3:G3" "Ab3:Gs3" "A3:A3" "Bb3:As3" "B3:B3"
  "C4:C4" "Db4:Cs4" "D4:D4" "Eb4:Ds4" "E4:E4" "F4:F4" "Gb4:Fs4" "G4:G4" "Ab4:Gs4" "A4:A4" "Bb4:As4" "B4:B4"
  "C5:C5" "Db5:Cs5" "D5:D5" "Eb5:Ds5" "E5:E5" "F5:F5" "Gb5:Fs5" "G5:G5" "Ab5:Gs5" "A5:A5" "Bb5:As5" "B5:B5"
)

echo "=== Downloading Piano samples (Salamander Grand Piano) ==="
PIANO_SOURCE="piano"
PIANO_DOWNLOADED=0
PIANO_FAILED=0

for entry in "${NOTES[@]}"; do
  OUR_NAME="${entry%%:*}"
  TONEJS_NAME="${entry##*:}"
  URL="${BASE_URL}/${PIANO_SOURCE}/${TONEJS_NAME}.mp3"
  DEST="${PIANO_DIR}/${OUR_NAME}.mp3"

  if [ -f "$DEST" ]; then
    echo "  [skip] ${OUR_NAME}.mp3 (already exists)"
    continue
  fi

  if curl -fsSL --retry 2 "$URL" -o "$DEST" 2>/dev/null; then
    echo "  [ok]   ${OUR_NAME}.mp3"
    PIANO_DOWNLOADED=$((PIANO_DOWNLOADED + 1))
  else
    echo "  [FAIL] ${OUR_NAME}.mp3 (from ${TONEJS_NAME})"
    PIANO_FAILED=$((PIANO_FAILED + 1))
    rm -f "$DEST"
  fi
done

echo ""
echo "=== Downloading Guitar samples (Acoustic Guitar) ==="
GUITAR_SOURCE="guitar-acoustic"
GUITAR_DOWNLOADED=0
GUITAR_FAILED=0

for entry in "${NOTES[@]}"; do
  OUR_NAME="${entry%%:*}"
  TONEJS_NAME="${entry##*:}"
  URL="${BASE_URL}/${GUITAR_SOURCE}/${TONEJS_NAME}.mp3"
  DEST="${GUITAR_DIR}/${OUR_NAME}.mp3"

  if [ -f "$DEST" ]; then
    echo "  [skip] ${OUR_NAME}.mp3 (already exists)"
    continue
  fi

  if curl -fsSL --retry 2 "$URL" -o "$DEST" 2>/dev/null; then
    echo "  [ok]   ${OUR_NAME}.mp3"
    GUITAR_DOWNLOADED=$((GUITAR_DOWNLOADED + 1))
  else
    echo "  [FAIL] ${OUR_NAME}.mp3 (from ${TONEJS_NAME})"
    GUITAR_FAILED=$((GUITAR_FAILED + 1))
    rm -f "$DEST"
  fi
done

echo ""
echo "=== Done ==="
echo "Piano:  ${PIANO_DOWNLOADED} downloaded, ${PIANO_FAILED} failed"
echo "Guitar: ${GUITAR_DOWNLOADED} downloaded, ${GUITAR_FAILED} failed"
echo ""
echo "Samples licensed under CC-BY 3.0 from nbrosowsky/tonejs-instruments"
echo "Original source: University of Iowa Electronic Music Studios"
