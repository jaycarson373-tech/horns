const svg = document.querySelector("#gumbus-svg");
const bgSelect = document.querySelector("#bg-select");
const furSelect = document.querySelector("#fur-select");
const hatSelect = document.querySelector("#hat-select");
const tieSelect = document.querySelector("#tie-select");
const faceSelect = document.querySelector("#face-select");
const downloadButton = document.querySelector("#download-button");

const bg = document.querySelector("#svg-bg");
const sparkles = document.querySelector("#sparkles");
const furBody = document.querySelector("#fur-body");
const ears = document.querySelectorAll(".ear-shape");
const hatLayer = document.querySelector("#hat-layer");
const hatTop = document.querySelector("#hat-top");
const hatBrim = document.querySelector("#hat-brim");
const tieLayer = document.querySelector("#tie-layer");
const tieKnot = document.querySelector("#tie-knot");
const tieBody = document.querySelector("#tie-body");
const mouthSmile = document.querySelector("#mouth-smile");
const mouthBlep = document.querySelector("#mouth-blep");

function setFill(nodes, color) {
  nodes.forEach((node) => node.setAttribute("fill", color));
}

function updatePreview() {
  const background = bgSelect.value;
  if (background === "sparkle") {
    bg.setAttribute("fill", "#ffffff");
    sparkles.setAttribute("opacity", "1");
  } else {
    bg.setAttribute("fill", background);
    sparkles.setAttribute("opacity", "0");
  }

  furBody.setAttribute("fill", furSelect.value);
  setFill(ears, furSelect.value);

  const hat = hatSelect.value;
  hatLayer.setAttribute("opacity", hat === "none" ? "0" : "1");
  if (hat !== "none") {
    hatTop.setAttribute("fill", hat);
    hatBrim.setAttribute("fill", hat);
  }

  const tie = tieSelect.value;
  tieLayer.setAttribute("opacity", tie === "none" ? "0" : "1");
  if (tie !== "none") {
    tieKnot.setAttribute("fill", tie);
    tieBody.setAttribute("fill", tie);
  }

  const isBlep = faceSelect.value === "blep";
  mouthSmile.setAttribute("opacity", isBlep ? "0" : "1");
  mouthBlep.setAttribute("opacity", isBlep ? "1" : "0");
}

function downloadPfp() {
  updatePreview();

  const source = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "gumbus-pfp.svg";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

[bgSelect, furSelect, hatSelect, tieSelect, faceSelect].forEach((control) => {
  control.addEventListener("change", updatePreview);
});

downloadButton.addEventListener("click", downloadPfp);
updatePreview();
