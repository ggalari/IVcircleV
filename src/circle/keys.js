// Key data for the Circle of Fifths

const pitchPosition = {
  'F5': 0, 'E5': 2.5, 'D5': 5, 'C5': 7.5, 'B4': 10,
  'A4': 12.5, 'G4': 15, 'F4': 17.5, 'E4': 20, 'G5': -2.5
};

export const SHARPS_ORDER = [
  { name: '♯', pitch: 'F5', y: pitchPosition['F5'] },
  { name: '♯', pitch: 'C5', y: pitchPosition['C5'] },
  { name: '♯', pitch: 'G5', y: pitchPosition['G5'] },
  { name: '♯', pitch: 'D5', y: pitchPosition['D5'] },
  { name: '♯', pitch: 'A4', y: pitchPosition['A4'] },
  { name: '♯', pitch: 'E5', y: pitchPosition['E5'] },
  { name: '♯', pitch: 'B4', y: pitchPosition['B4'] }
];

export const FLATS_ORDER = [
  { name: '♭', pitch: 'B4', y: pitchPosition['B4'] },
  { name: '♭', pitch: 'E5', y: pitchPosition['E5'] },
  { name: '♭', pitch: 'A4', y: pitchPosition['A4'] },
  { name: '♭', pitch: 'D5', y: pitchPosition['D5'] },
  { name: '♭', pitch: 'G4', y: pitchPosition['G4'] },
  { name: '♭', pitch: 'C5', y: pitchPosition['C5'] },
  { name: '♭', pitch: 'F4', y: pitchPosition['F4'] }
];

export const SLICES = [
  { major: 'DO', minor: 'la', accidentals: 0, enharmonic: false },
  { major: 'SOL', minor: 'mi', accidentals: 1, enharmonic: false },
  { major: 'RE', minor: 'si', accidentals: 2, enharmonic: false },
  { major: 'LA', minor: 'fa#', accidentals: 3, enharmonic: false },
  { major: 'MI', minor: 'do#', accidentals: 4, enharmonic: false },
  { major: 'SI', minor: 'sol#', accidentals: 5, enharmonic: true },
  { major: 'SOL♭/FA#', minor: 'mi♭/ré#', accidentals: 6, enharmonic: true },
  { major: 'RE♭', minor: 'si♭', accidentals: -5, enharmonic: true },
  { major: 'LA♭', minor: 'fa', accidentals: -4, enharmonic: false },
  { major: 'MI♭', minor: 'do', accidentals: -3, enharmonic: false },
  { major: 'SI♭', minor: 'sol', accidentals: -2, enharmonic: false },
  { major: 'FA', minor: 'ré', accidentals: -1, enharmonic: false }
];

export const LEADING_TONE_MAP = {
  DO: 'SI', 'DO#': 'SI#', 'DO##': 'SI##',
  'RE♭': 'DO', RE: 'DO#', 'RE#': 'DO##',
  'MI♭': 'RE', MI: 'RE#',
  FA: 'MI', 'FA#': 'MI#', 'FA##': 'MI##',
  'SOL♭': 'FA', SOL: 'FA#', 'SOL#': 'FA##',
  'LA♭': 'SOL', LA: 'SOL#', 'LA#': 'SOL##',
  'SI♭': 'LA', SI: 'LA#', 'SI#': 'LA##',
  la: 'sol#', 'la#': 'sol##', 'si♭': 'la', si: 'la#',
  do: 'si', 'do#': 'si#', 'ré♭': 'do', ré: 'do#',
  'mi♭': 'ré', 'mi': 'ré#', 'fa': 'mi', 'fa#': 'mi#',
  'sol♭': 'fa', 'sol': 'fa#', 'sol#': 'fa##'
};

export function getLeadingTone(tonic, isMajor) {
  let key = tonic;
  if (key.includes('/')) {
    key = key.split('/')[0];
  }
  if (!isMajor) {
    key = key.toLowerCase();
  }
  const result = LEADING_TONE_MAP[key];
  return (result || key).replace(/##/g, '𝄪');
}
