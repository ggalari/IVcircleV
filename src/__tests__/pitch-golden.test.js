// Golden characterization of the composed pitch decision.
//
// CHARACTERIZATION test: the fixture was captured from the pre-refactor
// implementation to make drift during the pitch-identity refactor visible. It is
// not an independent source of truth — the drift it surfaces is reviewed
// deliberately. It currently matches the theory/pitch.js path with zero drift.
import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAllScales } from '../theory/scales.js';
import { getDiatonicTriads, getDiatonicSevenths, getChordStaffPositions } from '../theory/chords.js';
import { notesToSampleKeys, staffPositionOctave } from '../theory/pitch.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, '__fixtures__', 'pitch-golden.json');

const SLICES = 12;
const TYPES = ['major', 'minor'];

function pitchDecision(keyIndex, keyType) {
  const scales = getAllScales(keyIndex, keyType).map((scale) =>
    notesToSampleKeys(scale.notes, scale.staffPositions, 3)
  );
  const chordKeys = (chords) =>
    chords.map((chord) => {
      const positions = getChordStaffPositions(keyIndex, keyType, chord);
      return notesToSampleKeys(chord.noteNames, positions, staffPositionOctave(positions[0]));
    });
  return {
    scales,
    triads: chordKeys(getDiatonicTriads(keyIndex, keyType)),
    sevenths: chordKeys(getDiatonicSevenths(keyIndex, keyType)),
  };
}

function buildGolden() {
  const golden = {};
  for (let s = 0; s < SLICES; s++) {
    for (const t of TYPES) {
      golden[`${s}:${t}`] = pitchDecision(s, t);
    }
  }
  return golden;
}

describe('pitch decision golden (characterization)', () => {
  it('matches the frozen sample-key baseline for all 24 keys', () => {
    const golden = buildGolden();

    if (!existsSync(fixturePath)) {
      mkdirSync(dirname(fixturePath), { recursive: true });
      writeFileSync(fixturePath, JSON.stringify(golden, null, 2) + '\n');
      console.info(`[pitch-golden] baseline created at ${fixturePath}; review and commit it.`);
      return;
    }

    const expected = JSON.parse(readFileSync(fixturePath, 'utf8'));
    expect(golden).toEqual(expected);
  });
});
