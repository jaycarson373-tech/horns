const svg = document.querySelector("#gumbus-svg");
const controls = {
  bg: document.querySelector("#bg-select"),
  fur: document.querySelector("#fur-select"),
  hat: document.querySelector("#hat-select"),
  tie: document.querySelector("#tie-select"),
  face: document.querySelector("#face-select"),
};

const layers = {
  bg: document.querySelector("#svg-bg"),
  sparkles: document.querySelector("#sparkles"),
  fur: document.querySelector("#fur-body"),
  ears: document.querySelectorAll(".ear-shape"),
  hat: document.querySelector("#hat-layer"),
  hatTop: document.querySelector("#hat-top"),
  hatBrim: document.querySelector("#hat-brim"),
  tie: document.querySelector("#tie-layer"),
  tieKnot: document.querySelector("#tie-knot"),
  tieBody: document.querySelector("#tie-body"),
  smile: document.querySelector("#mouth-smile"),
  blep: document.querySelector("#mouth-blep"),
};

function fill(nodes, color) {
  nodes.forEach((node) => node.setAttribute("fill", color));
}

function updatePreview() {
  const sparkling = controls.bg.value === "sparkle";
  layers.bg.setAttribute("fill", sparkling ? "#f7f1e6" : controls.bg.value);
  layers.sparkles.setAttribute("opacity", sparkling ? "1" : "0");
  layers.fur.setAttribute("fill", controls.fur.value);
  fill(layers.ears, controls.fur.value);

  const hasHat = controls.hat.value !== "none";
  layers.hat.setAttribute("opacity", hasHat ? "1" : "0");
  if (hasHat) {
    layers.hatTop.setAttribute("fill", controls.hat.value);
    layers.hatBrim.setAttribute("fill", controls.hat.value);
  }

  const hasTie = controls.tie.value !== "none";
  layers.tie.setAttribute("opacity", hasTie ? "1" : "0");
  if (hasTie) {
    layers.tieKnot.setAttribute("fill", controls.tie.value);
    layers.tieBody.setAttribute("fill", controls.tie.value);
  }

  const blep = controls.face.value === "blep";
  layers.smile.setAttribute("opacity", blep ? "0" : "1");
  layers.blep.setAttribute("opacity", blep ? "1" : "0");
}

function randomize() {
  Object.values(controls).forEach((control) => {
    control.selectedIndex = Math.floor(Math.random() * control.options.length);
  });
  updatePreview();
}

function downloadPfp() {
  updatePreview();
  const source = new XMLSerializer().serializeToString(svg);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 1000;
    canvas.getContext("2d").drawImage(image, 0, 0);
    canvas.toBlob((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "gumbus-pfp.png";
      link.click();
      URL.revokeObjectURL(link.href);
    }, "image/png");
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
}

Object.values(controls).forEach((control) => control.addEventListener("change", updatePreview));
document.querySelector("#random-button").addEventListener("click", randomize);
document.querySelector("#download-button").addEventListener("click", downloadPfp);
updatePreview();
