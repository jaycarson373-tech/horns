const canvas = document.querySelector("#gumbus-canvas");
const context = canvas.getContext("2d");
const source = document.querySelector("#gumbus-source");

const controls = {
  background: document.querySelector("#bg-select"),
  hat: document.querySelector("#hat-select"),
  tie: document.querySelector("#tie-select"),
  glasses: document.querySelector("#glasses-select"),
};

let keyedGumbus;

function buildKeyedImage() {
  const buffer = document.createElement("canvas");
  buffer.width = canvas.width;
  buffer.height = canvas.height;
  const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
  bufferContext.drawImage(source, 0, 0, buffer.width, buffer.height);

  const pixels = bufferContext.getImageData(0, 0, buffer.width, buffer.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    const whiteness = Math.min(red, green, blue);
    if (whiteness > 235) {
      pixels.data[index + 3] = Math.max(0, 255 - ((whiteness - 235) * 13));
    }
  }
  bufferContext.putImageData(pixels, 0, 0);
  keyedGumbus = buffer;
}

function drawPartyHat() {
  context.save();
  context.beginPath();
  context.moveTo(500, 25);
  context.lineTo(305, 290);
  context.lineTo(695, 290);
  context.closePath();
  context.fillStyle = "#ff4f87";
  context.fill();
  context.lineWidth = 18;
  context.strokeStyle = "#0b0b0b";
  context.stroke();

  context.fillStyle = "#ffd73b";
  for (const [x, y] of [[465, 95], [390, 190], [565, 210]]) {
    context.beginPath();
    context.arc(x, y, 20, 0, Math.PI * 2);
    context.fill();
  }
  context.beginPath();
  context.arc(500, 25, 40, 0, Math.PI * 2);
  context.fillStyle = "#c8ff3d";
  context.fill();
  context.stroke();
  context.restore();
}

function drawCrown() {
  context.save();
  context.beginPath();
  context.moveTo(300, 270);
  context.lineTo(275, 75);
  context.lineTo(410, 175);
  context.lineTo(500, 45);
  context.lineTo(590, 175);
  context.lineTo(725, 75);
  context.lineTo(700, 270);
  context.closePath();
  context.fillStyle = "#ffd73b";
  context.fill();
  context.lineWidth = 18;
  context.strokeStyle = "#0b0b0b";
  context.stroke();
  context.fillStyle = "#ff4f87";
  for (const x of [370, 500, 630]) {
    context.beginPath();
    context.arc(x, 220, 18, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawTinfoilHat() {
  context.save();
  context.beginPath();
  context.moveTo(315, 285);
  context.quadraticCurveTo(360, 90, 500, 35);
  context.quadraticCurveTo(650, 120, 690, 285);
  context.quadraticCurveTo(500, 330, 315, 285);
  context.closePath();
  const foil = context.createLinearGradient(320, 40, 690, 300);
  foil.addColorStop(0, "#707070");
  foil.addColorStop(.2, "#f8f8f8");
  foil.addColorStop(.42, "#989898");
  foil.addColorStop(.65, "#ffffff");
  foil.addColorStop(1, "#666666");
  context.fillStyle = foil;
  context.fill();
  context.lineWidth = 18;
  context.strokeStyle = "#0b0b0b";
  context.stroke();
  context.restore();
}

function drawBowTie(color) {
  context.save();
  context.translate(500, 865);
  context.fillStyle = color;
  context.strokeStyle = "#0b0b0b";
  context.lineWidth = 16;
  context.beginPath();
  context.moveTo(-25, 0);
  context.bezierCurveTo(-85, -70, -190, -70, -180, 15);
  context.bezierCurveTo(-175, 90, -70, 65, -25, 20);
  context.closePath();
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(25, 0);
  context.bezierCurveTo(85, -70, 190, -70, 180, 15);
  context.bezierCurveTo(175, 90, 70, 65, 25, 20);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillRect(-38, -28, 76, 78);
  context.strokeRect(-38, -28, 76, 78);
  context.restore();
}

function drawGlasses(color) {
  context.save();
  context.strokeStyle = "#0b0b0b";
  context.lineWidth = 18;
  context.fillStyle = color;
  context.globalAlpha = .88;
  context.beginPath();
  context.roundRect(130, 345, 310, 185, 62);
  context.roundRect(560, 345, 310, 185, 62);
  context.fill();
  context.stroke();
  context.globalAlpha = 1;
  context.beginPath();
  context.moveTo(440, 410);
  context.quadraticCurveTo(500, 370, 560, 410);
  context.stroke();
  context.restore();
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = controls.background.value;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(controls.background.value === "#ffffff" ? source : keyedGumbus, 0, 0, canvas.width, canvas.height);

  if (controls.hat.value === "party") drawPartyHat();
  if (controls.hat.value === "crown") drawCrown();
  if (controls.hat.value === "tinfoil") drawTinfoilHat();

  const tieColors = { blue: "#1a55ff", pink: "#ff4f87", gold: "#ffd73b" };
  if (tieColors[controls.tie.value]) drawBowTie(tieColors[controls.tie.value]);

  const glassesColors = { black: "#0b0b0b", pink: "#ff4f87" };
  if (glassesColors[controls.glasses.value]) drawGlasses(glassesColors[controls.glasses.value]);
}

function randomize() {
  Object.values(controls).forEach((control) => {
    control.selectedIndex = Math.floor(Math.random() * control.options.length);
  });
  render();
}

function downloadPfp() {
  render();
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "gumbus-pfp.png";
  link.click();
}

function initialize() {
  buildKeyedImage();
  Object.values(controls).forEach((control) => control.addEventListener("change", render));
  document.querySelector("#random-button").addEventListener("click", randomize);
  document.querySelector("#download-button").addEventListener("click", downloadPfp);
  render();
}

if (source.complete) initialize();
else source.addEventListener("load", initialize, { once: true });

const copyCaButton = document.querySelector("#copy-ca");
copyCaButton?.addEventListener("click", async () => {
  const label = copyCaButton.querySelector("span");
  try {
    await navigator.clipboard.writeText(copyCaButton.dataset.ca);
    label.textContent = "COPIED";
    window.setTimeout(() => {
      label.textContent = "BMmv...pump";
    }, 1600);
  } catch {
    label.textContent = "COPY FAILED";
  }
});
