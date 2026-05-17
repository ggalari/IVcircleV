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
});
