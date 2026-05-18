let currentKeyInfo = null;

function updateSvgCode() {
  const container = document.getElementById("circle-container");
  if (!container) return;
  const textarea = document.getElementById("svgCodeArea");
  const svgElement = container.querySelector("svg");
  if (svgElement && textarea) {
    textarea.value = svgElement.outerHTML;
  }
}

function attachToggleCodeHandler() {
  const toggleButton = document.getElementById("toggleCode");
  if (!toggleButton) return;

  toggleButton.addEventListener("click", () => {
    const area = document.getElementById("svgCodeArea");
    if (!area) return;
    area.hidden = !area.hidden;
  });
}

function createNeighborOverlay(svg) {
  if (!svg) return null;
  const ns = 'http://www.w3.org/2000/svg';
  let overlay = svg.querySelector('.neighbor-overlay');
  if (overlay) return overlay;
  overlay = document.createElementNS(ns, 'g');
  overlay.classList.add('neighbor-overlay');
  svg.appendChild(overlay);
  return overlay;
}

function clearNeighborOverlay() {
  const svg = document.querySelector('#circle-container svg');
  if (!svg) return;
  const overlay = svg.querySelector('.neighbor-overlay');
  if (overlay) overlay.innerHTML = '';
}

// Neighbor scale degrees for a major key (circle-of-fifths order):
// Selected key = I, clockwise neighbor = V, counter-clockwise = IV
// Relative minors: same index = vi, cw = iii, ccw = ii
const NEIGHBOR_DEGREES = {
  major: {
    outer: { self: 'I', cw: 'V', ccw: 'IV' },
    inner: { self: 'vi', cw: 'iii', ccw: 'ii' }
  },
  // For a minor key: selected = i, cw = v, ccw = iv
  // Relative majors: same index = III, cw = VII, ccw = VI
  minor: {
    outer: { self: 'III', cw: 'VII', ccw: 'VI' },
    inner: { self: 'i', cw: 'v', ccw: 'iv' }
  }
};

function getNeighborDegrees(type) {
  return NEIGHBOR_DEGREES[type];
}

function addRomanNumeralLabel(index, numeral, type, ring) {
  const svg = document.querySelector('#circle-container svg');
  if (!svg) return;
  const center = svg.querySelector('circle.ring-outer');
  if (!center) return;
  const cx = parseFloat(center.getAttribute('cx'));
  const cy = parseFloat(center.getAttribute('cy'));
  const outerRadius = parseFloat(svg.querySelector('circle.ring-outer').getAttribute('r'));
  const middleRadius = parseFloat(svg.querySelector('circle.ring-middle').getAttribute('r'));
  const innerRadius = parseFloat(svg.querySelector('circle.ring-inner').getAttribute('r'));
  // Position in the top-right corner of the sector:
  // - Use the clockwise edge of the sector (angle + 12°) for "right"
  // - Use a radius near the outer boundary of the ring for "top"
  let labelRadius;
  if (ring === 'outer') {
    labelRadius = outerRadius - 18;
  } else {
    labelRadius = middleRadius - 18;
  }
  // Offset angle clockwise by ~10° to place in the "top-right" corner
  const angle = (-90 + index * 30 + 10) * Math.PI / 180;
  const x = cx + labelRadius * Math.cos(angle);
  const y = cy + labelRadius * Math.sin(angle);
  const ns = 'http://www.w3.org/2000/svg';
  const text = document.createElementNS(ns, 'text');
  text.setAttribute('x', x);
  text.setAttribute('y', y);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('font-size', ring === 'outer' ? '15px' : '13px');
  text.setAttribute('font-family', 'Georgia, serif');
  text.setAttribute('font-weight', '700');
  text.setAttribute('fill', type === 'minor' ? '#2E6B2E' : '#8B0000');
  text.setAttribute('class', 'roman-numeral fade-in');
  text.setAttribute('pointer-events', 'none');
  text.textContent = numeral;
  const overlay = createNeighborOverlay(svg);
  overlay.appendChild(text);
}

function handleShowNeighbors(keyInfo) {
  clearNeighborOverlay();
  const degrees = getNeighborDegrees(keyInfo.type);
  const idx = keyInfo.index;
  const cwIdx = (idx + 1) % 12;
  const ccwIdx = (idx + 11) % 12;
  const highlightType = keyInfo.type; // color scheme based on selected key

  // Determine which ring the selected key is on
  const tonicRing = keyInfo.type === 'major' ? 'outer' : 'inner';
  const relativeRing = keyInfo.type === 'major' ? 'inner' : 'outer';

  // Draw sectors on the tonic's ring (3 sectors: self + 2 neighbors)
  addNeighborSectorByIndex(idx, { type: highlightType, ring: tonicRing, isTonic: true });
  addNeighborSectorByIndex(cwIdx, { type: highlightType, ring: tonicRing });
  addNeighborSectorByIndex(ccwIdx, { type: highlightType, ring: tonicRing });

  // Draw sectors on the relative ring (3 sectors at same indices)
  addNeighborSectorByIndex(idx, { type: highlightType, ring: relativeRing });
  addNeighborSectorByIndex(cwIdx, { type: highlightType, ring: relativeRing });
  addNeighborSectorByIndex(ccwIdx, { type: highlightType, ring: relativeRing });

  // Add roman numeral labels on the tonic's ring
  const tonicDegrees = keyInfo.type === 'major' ? degrees.outer : degrees.inner;
  addRomanNumeralLabel(idx, tonicDegrees.self, highlightType, tonicRing);
  addRomanNumeralLabel(cwIdx, tonicDegrees.cw, highlightType, tonicRing);
  addRomanNumeralLabel(ccwIdx, tonicDegrees.ccw, highlightType, tonicRing);

  // Add roman numeral labels on the relative ring
  const relativeDegrees = keyInfo.type === 'major' ? degrees.inner : degrees.outer;
  addRomanNumeralLabel(idx, relativeDegrees.self, highlightType, relativeRing);
  addRomanNumeralLabel(cwIdx, relativeDegrees.cw, highlightType, relativeRing);
  addRomanNumeralLabel(ccwIdx, relativeDegrees.ccw, highlightType, relativeRing);

  hideContextMenu();
}

function handleClearNeighbors() {
  clearNeighborOverlay();
  hideContextMenu();
}

function addNeighborSectorByIndex(index, options = {}) {
  const svg = document.querySelector('#circle-container svg');
  if (!svg) return;
  const center = svg.querySelector('circle.ring-outer');
  if (!center) return;
  const cx = parseFloat(center.getAttribute('cx'));
  const cy = parseFloat(center.getAttribute('cy'));
  const outerRadius = parseFloat(svg.querySelector('circle.ring-outer').getAttribute('r'));
  const middleRadius = parseFloat(svg.querySelector('circle.ring-middle').getAttribute('r'));
  const innerRadius = parseFloat(svg.querySelector('circle.ring-inner').getAttribute('r'));
  // Use exact radii based on which ring the sector belongs to
  let outerR, innerR;
  if (options.ring === 'inner') {
    outerR = middleRadius;
    innerR = innerRadius;
  } else {
    // outer ring (default)
    outerR = outerRadius;
    innerR = middleRadius;
  }
  const start = -90 + index * 30 - 15;
  const end = start + 30;
  function s(d) { return d * Math.PI / 180; }
  const ox1 = cx + outerR * Math.cos(s(start));
  const oy1 = cy + outerR * Math.sin(s(start));
  const ox2 = cx + outerR * Math.cos(s(end));
  const oy2 = cy + outerR * Math.sin(s(end));
  const ix2 = cx + innerR * Math.cos(s(end));
  const iy2 = cy + innerR * Math.sin(s(end));
  const ix1 = cx + innerR * Math.cos(s(start));
  const iy1 = cy + innerR * Math.sin(s(start));
  const d = `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 0 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1} Z`;
  const ns = 'http://www.w3.org/2000/svg';
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d);
  // choose class based on requested type (major/minor) and add fade-in
  const type = options.type || 'major';
  let cls;
  if (type === 'minor') cls = 'highlight-minor fade-in';
  else if (type === 'major') cls = 'highlight-major fade-in';
  else cls = 'highlight-neighbor fade-in';
  path.setAttribute('class', cls);
  // Different opacity: tonic sector at full, neighbors at reduced
  if (options.isTonic) {
    path.style.opacity = '1';
  } else {
    path.style.opacity = '0.45';
  }
  const overlay = createNeighborOverlay(svg);
  overlay.appendChild(path);
}

function resolveKeyIndex(target) {
  const svg = document.querySelector('#circle-container svg');
  if (!svg || !target) return -1;
  const isMinor = target.classList && target.classList.contains('minor-key');
  const selector = isMinor ? 'text.minor-key' : 'text.major-key';
  const labels = Array.from(svg.querySelectorAll(selector));
  const targetText = target.textContent.trim();
  const idx = labels.findIndex(t => t.textContent.trim() === targetText);
  return idx >= 0 ? idx : -1;
}

function showContextMenu(x, y, keyInfo) {
  const menu = document.getElementById('ctx-menu');
  if (!menu) return;
  const clampedX = Math.min(x, window.innerWidth - menu.offsetWidth);
  const clampedY = Math.min(y, window.innerHeight - menu.offsetHeight);
  menu.style.left = clampedX + 'px';
  menu.style.top = clampedY + 'px';
  menu.removeAttribute('hidden');
  const overlay = document.querySelector('.neighbor-overlay');
  const clearBtn = menu.querySelector('[data-action="clear"]');
  if (clearBtn) {
    clearBtn.disabled = !overlay || overlay.children.length === 0;
  }
  currentKeyInfo = keyInfo;
}

function hideContextMenu() {
  const menu = document.getElementById('ctx-menu');
  if (!menu) return;
  menu.hidden = true;
}

function attachRightClickLabels() {
  const svg = document.querySelector('#circle-container svg');
  if (!svg) return;
  svg.addEventListener('contextmenu', (ev) => {
    const target = ev.target;
    if (!target || !target.classList) return;
    if (target.classList.contains('major-key') || target.classList.contains('minor-key')) {
      ev.preventDefault();
      const type = target.classList.contains('minor-key') ? 'minor' : 'major';
      const index = resolveKeyIndex(target);
      if (index === -1) return;
      const keyInfo = { index, type };
      showContextMenu(ev.clientX, ev.clientY, keyInfo);
    }
  });
}

window.printCircle = function () {
  const svgElement = document.querySelector("#circle-container svg");
  if (!svgElement) return;

  const clone = svgElement.cloneNode(true);
  const win = window.open("", "_blank");
  win.document.write(`
    <!DOCTYPE html><html><head><title>Circle of Fifths</title></head><body>${clone.outerHTML}</body></html>
  `);
  win.document.close();
  win.onafterprint = () => win.close();
  win.print();
  setTimeout(() => win.close(), 10000);
};

window.saveSVG = function () {
  const svgElement = document.querySelector("#circle-container svg");
  if (!svgElement) {
    console.error("SVG element not found");
    return;
  }

  const clone = svgElement.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const originalWidth = svgElement.getAttribute("width");
  const originalHeight = svgElement.getAttribute("height");
  if (originalWidth) clone.setAttribute("width", originalWidth);
  if (originalHeight) clone.setAttribute("height", originalHeight);

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);
  svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = "circle_of_fifths.svg";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

window.addEventListener("DOMContentLoaded", () => {
  const area = document.getElementById("svgCodeArea");
  if (area) {
    area.hidden = true;
  }

  if (typeof window.renderCircleOfFifths === "function") {
    window.renderCircleOfFifths("circle-container");
    updateSvgCode();
  } else {
    console.error("renderCircleOfFifths not found");
  }

    attachToggleCodeHandler();
    attachRightClickLabels();

    document.addEventListener('click', (event) => {
      const menu = document.getElementById('ctx-menu');
      if (!menu) return;
      if (!menu.hidden && !menu.contains(event.target)) {
        hideContextMenu();
      }
    });

    const ctxMenu = document.getElementById('ctx-menu');
    if (ctxMenu) {
      ctxMenu.addEventListener('click', (event) => {
        const action = event.target.getAttribute('data-action');
        if (!action) return;
        if (event.target.disabled) return;
        if (action === 'show') {
          if (currentKeyInfo) {
            handleShowNeighbors(currentKeyInfo);
          }
        } else if (action === 'clear') {
          handleClearNeighbors();
        }
      });
    }
});
