// circle_of_fifths.js
// Circle of Fifths generator – fully parameterized with CSS styles

(function () {
  console.log('circle_of_fifths.js loaded');
  // ========== GEOMETRY CONSTANTS ==========
  const centerX = 490;
  const centerY = 490;
  const outerRadius = 320;
  const middleRadius = 215;
  const innerRadius = 110;
  const staffRadius = 380;
  const majorRadius = 268;
  const minorRadius = 168;

  // Staff drawing parameters
  const baselineOffset = 3.5;   // vertical adjustment for accidentals (11px font)

  // Arrow parameters (flattened left curve)
  const arrowStart = { x: 475, y: 235 };
  const arrowEnd = { x: 480, y: 310 };
  const arrowCtrl = { x1: 470, y1: 265, x2: 470, y2: 290 };
  const labelPos = { x: 460, y: 269, rotate: -95 };

  // Pitch to line/space y (staff lines at 0,5,10,15,20)
  const pitchPosition = {
    'F5': 0, 'E5': 2.5, 'D5': 5, 'C5': 7.5, 'B4': 10,
    'A4': 12.5, 'G4': 15, 'F4': 17.5, 'E4': 20, 'G5': -2.5
  };

  const sharpsOrder = [
    { name: '♯', pitch: 'F5', y: pitchPosition['F5'] },
    { name: '♯', pitch: 'C5', y: pitchPosition['C5'] },
    { name: '♯', pitch: 'G5', y: pitchPosition['G5'] },
    { name: '♯', pitch: 'D5', y: pitchPosition['D5'] },
    { name: '♯', pitch: 'A4', y: pitchPosition['A4'] },
    { name: '♯', pitch: 'E5', y: pitchPosition['E5'] },
    { name: '♯', pitch: 'B4', y: pitchPosition['B4'] }
  ];

  const flatsOrder = [
    { name: '♭', pitch: 'B4', y: pitchPosition['B4'] },
    { name: '♭', pitch: 'E5', y: pitchPosition['E5'] },
    { name: '♭', pitch: 'A4', y: pitchPosition['A4'] },
    { name: '♭', pitch: 'D5', y: pitchPosition['D5'] },
    { name: '♭', pitch: 'G4', y: pitchPosition['G4'] },
    { name: '♭', pitch: 'C5', y: pitchPosition['C5'] },
    { name: '♭', pitch: 'F4', y: pitchPosition['F4'] }
  ];

  // Slices – enharmonic: true for keys that need double staves
  const slices = [
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

  // Compute positions for staves (radius staffRadius)
  const angles = [-90, -60, -30, 0, 30, 60, 90, 120, 150, 180, 210, 240].map(deg => deg * Math.PI / 180);
  const positions = angles.map(angle => ({
    cx: centerX + staffRadius * Math.cos(angle),
    cy: centerY + staffRadius * Math.sin(angle)
  }));

  // ---------- Leading tone computation ----------
  function getLeadingTone(tonic, isMajor) {
    let key = tonic;
    if (key.includes('/')) key = key.split('/')[0];
    if (!isMajor) key = key.toLowerCase();

    const mapping = {
      'DO': 'SI', 'DO#': 'SI#', 'DO##': 'SI##',
      'RE♭': 'DO', 'RE': 'DO#', 'RE#': 'DO##',
      'MI♭': 'RE', 'MI': 'RE#',
      'FA': 'MI', 'FA#': 'MI#', 'FA##': 'MI##',
      'SOL♭': 'FA', 'SOL': 'FA#', 'SOL#': 'FA##',
      'LA♭': 'SOL', 'LA': 'SOL#', 'LA#': 'SOL##',
      'SI♭': 'LA', 'SI': 'LA#', 'SI#': 'LA##',
      'la': 'sol#', 'la#': 'sol##', 'si♭': 'la', 'si': 'la#',
      'do': 'si', 'do#': 'si#', 'ré♭': 'do', 'ré': 'do#',
      'mi♭': 'ré', 'mi': 'ré#', 'fa': 'mi', 'fa#': 'mi#',
      'sol♭': 'fa', 'sol': 'fa#', 'sol#': 'fa##'
    };
    let result = mapping[key] || key;
    return result.replace(/##/g, '𝄪');
  }

  function generateAccidentals(acc) {
    const accidentalLeftOffset = 14; // horizontal offset for first accidental
    const accidentalSpacing = 7; // horizontal spacing between accidentals

    if (acc === 0) return '';
    let items = [];
    if (acc > 0) {
      for (let i = 0; i < acc; i++) {
        const s = sharpsOrder[i];
        const x = accidentalLeftOffset + (i * accidentalSpacing);
        const y = s.y + baselineOffset;
        items.push(`<text class="accidental" x="${x}" y="${y}">${s.name}</text>`);
      }
    } else {
      const count = -acc;
      for (let i = 0; i < count; i++) {
        const f = flatsOrder[i];
        const x = accidentalLeftOffset + (i * accidentalSpacing);
        const y = f.y + baselineOffset;
        items.push(`<text class="accidental" x="${x}" y="${y}">${f.name}</text>`);
      }
    }
    return items.join('');
  }

  function buildSVG() {
    // CSS styles
    const styles = `
      <style>
        .major-key { fill: #8B0000; font-family: Georgia, serif; font-size: 23px; font-weight: 700; text-anchor: middle; }
        .minor-key { fill: #2E6B2E; font-family: Georgia, serif; font-size: 19px; text-anchor: middle; }
        .leading-tone { fill: #666; font-family: Georgia, serif; font-size: 11px; text-anchor: middle; }
        .accidental-count { fill: #444; font-family: Georgia, serif; font-size: 13px; text-anchor: middle; }
        .clef { fill: #555; font-family: serif; font-size: 40px; text-anchor: start; }
        .accidental { fill: #000; font-family: Georgia, serif; font-size: 10px; font-weight: 700; text-anchor: middle; }
        .staff-line { fill: #888; height: 0.8px; }
        .ring-outer { fill: #f4f2ec; stroke: #bbb; stroke-width: 1.2; }
        .ring-middle { fill: #dedad0; stroke: #aaa; stroke-width: 1.5; }
        .ring-inner { fill: #d0cdc4; stroke: #999; stroke-width: 1; }
        .radial-line { stroke: #aaa; stroke-width: 1.2; }
        .label-majeur { fill: #555; font-family: Georgia, serif; font-size: 15px; text-anchor: middle; }
        .label-mineur { fill: #777; font-family: Georgia, serif; font-size: 13px; font-style: italic; text-anchor: middle; }
        .label-naturel { fill: #888; font-family: Georgia, serif; font-size: 18px; text-anchor: middle; dominant-baseline: central; }
        .arrow-path { fill: none; stroke: #8B0000; stroke-width: 2.2; }
        .arrow-label { fill: #8B0000; font-family: Georgia, serif; font-size: 13px; font-style: italic; letter-spacing: 0.3px; text-anchor: middle; }
      </style>
    `;

    let svg = `<svg width="980" height="980" xmlns="http://www.w3.org/2000/svg">
${styles}
<defs>
  <marker id="arrowRed" markerHeight="7" markerWidth="7" orient="auto" refX="8" refY="5" viewBox="0 0 10 10">
    <path d="m2,1l6,4l-6,4" fill="none" stroke="#8B0000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>
  </marker>
</defs>
<!-- Rings -->
<circle cx="${centerX}" cy="${centerY}" r="${outerRadius}" class="ring-outer"/>
<circle cx="${centerX}" cy="${centerY}" r="${middleRadius}" class="ring-middle"/>
<circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" class="ring-inner"/>
`;

    // Radial lines (pie slices) – from inner to outer circle
    for (let i = 0; i < slices.length; i++) {
      const boundaryDeg = -90 + 15 + i * 30;
      const angleRad = boundaryDeg * Math.PI / 180;
      const x1 = centerX + innerRadius * Math.cos(angleRad);
      const y1 = centerY + innerRadius * Math.sin(angleRad);
      const x2 = centerX + outerRadius * Math.cos(angleRad);
      const y2 = centerY + outerRadius * Math.sin(angleRad);
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="radial-line" />\n`;
    }

    svg += `<text x="${centerX}" y="${centerY - 302}" class="label-majeur">Majeur</text>
<text x="${centerX}" y="${centerY}" class="label-mineur">Mineur</text>
<text x="${centerX}" y="${centerY - 198}" class="label-naturel">♮</text>
`;

    for (let i = 0; i < slices.length; i++) {
      const s = slices[i];
      const pos = positions[i];

      if (s.enharmonic) {
        let leftAcc, rightAcc, label;
        const acc = s.accidentals;
        if (acc === 5) {
          leftAcc = generateAccidentals(5);
          rightAcc = generateAccidentals(-7);
          label = "5♯/7♭";
        } else if (acc === -5) {
          leftAcc = generateAccidentals(-5);
          rightAcc = generateAccidentals(7);
          label = "5♭/7♯";
        } else if (acc === 6) {
          leftAcc = generateAccidentals(6);
          rightAcc = generateAccidentals(-6);
          label = "6♯/6♭";
        } else {
          leftAcc = generateAccidentals(acc);
          rightAcc = generateAccidentals(-acc);
          label = `${Math.abs(acc)}♯/${Math.abs(acc)}♭`;
        }
        const leftCx = pos.cx - 45;
        const rightCx = pos.cx + 45;
        svg += `<g transform="translate(${leftCx - 32}, ${pos.cy - 10})">
  <rect class="staff-line" width="64" x="0" y="0"/><rect class="staff-line" width="64" x="0" y="5"/>
  <rect class="staff-line" width="64" x="0" y="10"/><rect class="staff-line" width="64" x="0" y="15"/>
  <rect class="staff-line" width="64" x="0" y="20"/>
  <text class="clef" x="-11" y="20">𝄞</text>${leftAcc}</g>`;
        svg += `<g transform="translate(${rightCx - 32}, ${pos.cy - 10})">
  <rect class="staff-line" width="64" x="0" y="0"/><rect class="staff-line" width="64" x="0" y="5"/>
  <rect class="staff-line" width="64" x="0" y="10"/><rect class="staff-line" width="64" x="0" y="15"/>
  <rect class="staff-line" width="64" x="0" y="20"/>
  <text class="clef" x="-11" y="20">𝄞</text>${rightAcc}</g>`;
        svg += `<text x="${pos.cx}" y="${pos.cy - 35}" class="accidental-count">${label}</text>`;
      } else {
        const acc = generateAccidentals(s.accidentals);
        svg += `<g transform="translate(${pos.cx - 32}, ${pos.cy - 10})">
  <rect class="staff-line" width="64" x="0" y="0"/><rect class="staff-line" width="64" x="0" y="5"/>
  <rect class="staff-line" width="64" x="0" y="10"/><rect class="staff-line" width="64" x="0" y="15"/>
  <rect class="staff-line" width="64" x="0" y="20"/>
  <text class="clef" x="-11" y="20">𝄞</text>${acc}</g>`;
        // Empty label if accidentaions are 0, else show accidentals count with appropriate symbol
        let label = s.accidentals === 0 ? '' : (s.accidentals > 0 ? `${s.accidentals}♯` : `${-s.accidentals}♭`);
        svg += `<text x="${pos.cx}" y="${pos.cy - 30}" class="accidental-count">${label}</text>`;
      }

      // Key names using computed radii
      const angleRad = angles[i];
      const majX = centerX + majorRadius * Math.cos(angleRad);
      const majY = centerY + majorRadius * Math.sin(angleRad);
      const minX = centerX + minorRadius * Math.cos(angleRad);
      const minY = centerY + minorRadius * Math.sin(angleRad);

      svg += `<text x="${majX}" y="${majY + 5}" class="major-key">${s.major}</text>`;
      svg += `<text x="${minX}" y="${minY + 5}" class="minor-key">${s.minor}</text>`;

      // Leading tones
      let leadingMajor, leadingMinor;
      if (s.enharmonic) {
        const firstMajor = s.major.split('/')[0];
        leadingMajor = getLeadingTone(firstMajor, true);
        leadingMinor = getLeadingTone(s.minor, false);
      } else {
        leadingMajor = getLeadingTone(s.major, true);
        leadingMinor = getLeadingTone(s.minor, false);
      }
      svg += `<text x="${majX}" y="${majY + 24}" class="leading-tone">(${leadingMajor})</text>`;
      svg += `<text x="${minX}" y="${minY + 24}" class="leading-tone">(${leadingMinor})</text>`;
    }

    // Arrow and label (using constants)
    svg += `<path d="M ${arrowStart.x} ${arrowStart.y} C ${arrowCtrl.x1} ${arrowCtrl.y1}, ${arrowCtrl.x2} ${arrowCtrl.y2}, ${arrowEnd.x} ${arrowEnd.y}" class="arrow-path" marker-end="url(#arrowRed)"/>
<text class="arrow-label" transform="translate(${labelPos.x},${labelPos.y}) rotate(${labelPos.rotate})">tierce mineure</text>`;

    svg += `</svg>`;
    return svg;
  }

  window.renderCircleOfFifths = function (containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = buildSVG();
    } else {
      console.error(`Container with id "${containerId}" not found.`);
    }
  };
})();