(() => {
  "use strict";

  // Same ramp as a.py's ASCII_CHARS, plus two extra sets for variety.
  const CHARSETS = {
    classic: [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"],
    dense: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$".split(""),
    blocks: [" ", "░", "▒", "▓", "█"],
  };

  const stage = document.getElementById("stage");
  const dropHint = document.getElementById("dropHint");
  const fileInput = document.getElementById("fileInput");
  const canvas = document.getElementById("output");
  const ctx = canvas.getContext("2d");
  const statusLine = document.getElementById("statusLine");
  const controls = document.getElementById("controls");

  const widthRange = document.getElementById("widthRange");
  const widthVal = document.getElementById("widthVal");
  const charsetSelect = document.getElementById("charsetSelect");
  const colorToggle = document.getElementById("colorToggle");
  const downloadPngBtn = document.getElementById("downloadPng");
  const downloadTxtBtn = document.getElementById("downloadTxt");
  const resetBtn = document.getElementById("resetBtn");

  let sourceImage = null;   // HTMLImageElement currently loaded
  let lastGrid = null;      // { chars, cols, rows } for txt export
  let renderToken = 0;      // cancels stale animations when re-rendering

  function setStatus(msg) {
    statusLine.textContent = msg;
  }

  // ---- Load an image file ----
  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("That doesn't look like an image — try a JPG or PNG.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        sourceImage = img;
        stage.classList.add("has-image");
        controls.hidden = false;
        convertAndRender();
      };
      img.onerror = () => setStatus("Couldn't read that file as an image.");
      img.src = e.target.result;
    };
    reader.onerror = () => setStatus("Couldn't read that file.");
    reader.readAsDataURL(file);
  }

  // ---- Downsample the image to a small pixel grid (mirrors PIL resize) ----
  function getPixelGrid(img, cols) {
    const aspect = img.naturalHeight / img.naturalWidth;
    const rows = Math.max(Math.round(cols * aspect * 0.5), 1); // same 0.5 correction as a.py

    const sample = document.createElement("canvas");
    sample.width = cols;
    sample.height = rows;
    const sctx = sample.getContext("2d");
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(img, 0, 0, cols, rows);

    const { data } = sctx.getImageData(0, 0, cols, rows);
    return { data, cols, rows };
  }

  function brightnessToChar(r, g, b, ramp) {
    // Same luma weights PIL uses for convert("L")
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    const idx = Math.min(ramp.length - 1, Math.floor((gray * ramp.length) / 256));
    return ramp[idx];
  }

  function buildGrid(img, cols, charsetKey) {
    const ramp = CHARSETS[charsetKey] || CHARSETS.classic;
    const { data, rows } = getPixelGrid(img, cols);
    const chars = new Array(rows);
    for (let y = 0; y < rows; y++) {
      const row = new Array(cols);
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        row[x] = { ch: brightnessToChar(r, g, b, ramp), r, g, b };
      }
      chars[y] = row;
    }
    return { chars, cols, rows };
  }

  // ---- Render the grid onto the canvas with a printer-style reveal ----
  function renderGrid(grid) {
    const token = ++renderToken;
    const { chars, cols, rows } = grid;

    const stageW = stage.clientWidth;
    const stageH = stage.clientHeight;
    const cellW = stageW / cols;
    const cellH = stageH / rows;
    const fontSize = Math.max(cellH * 0.92, 1);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = stageW * dpr;
    canvas.height = stageH * dpr;
    canvas.style.width = stageW + "px";
    canvas.style.height = stageH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#0f0c08";
    ctx.fillRect(0, 0, stageW, stageH);
    ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
    ctx.textBaseline = "top";

    const useColor = colorToggle.checked;
    const rowsPerFrame = Math.max(1, Math.ceil(rows / 40)); // ~40 animation steps total
    let y = 0;

    function drawChunk() {
      if (token !== renderToken) return; // a newer render superseded this one
      const end = Math.min(y + rowsPerFrame, rows);
      for (; y < end; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = chars[y][x];
          ctx.fillStyle = useColor ? `rgb(${cell.r},${cell.g},${cell.b})` : "#e8a33d";
          ctx.fillText(cell.ch, x * cellW, y * cellH);
        }
      }
      if (y < rows) {
        requestAnimationFrame(drawChunk);
      }
    }
    requestAnimationFrame(drawChunk);
  }

  function convertAndRender() {
    if (!sourceImage) return;
    const cols = parseInt(widthRange.value, 10);
    setStatus("converting…");
    // Let the browser paint the status update before the (synchronous) crunch
    requestAnimationFrame(() => {
      const grid = buildGrid(sourceImage, cols, charsetSelect.value);
      lastGrid = grid;
      renderGrid(grid);
      setStatus(`${grid.cols} × ${grid.rows} characters`);
    });
  }

  // ---- Downloads ----
  function downloadPng() {
    if (!lastGrid) return;
    const link = document.createElement("a");
    link.download = "ascii-art.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function downloadTxt() {
    if (!lastGrid) return;
    const text = lastGrid.chars.map((row) => row.map((c) => c.ch).join("")).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.download = "ascii-art.txt";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function reset() {
    sourceImage = null;
    lastGrid = null;
    stage.classList.remove("has-image");
    controls.hidden = true;
    fileInput.value = "";
    setStatus("");
  }

  // ---- Wire up events ----
  stage.addEventListener("click", () => fileInput.click());
  stage.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });

  ["dragenter", "dragover"].forEach((evt) =>
    stage.addEventListener(evt, (e) => { e.preventDefault(); stage.classList.add("drag-over"); })
  );
  ["dragleave", "drop"].forEach((evt) =>
    stage.addEventListener(evt, (e) => { e.preventDefault(); stage.classList.remove("drag-over"); })
  );
  stage.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadFile(file);
  });

  widthRange.addEventListener("input", () => {
    widthVal.textContent = widthRange.value;
  });
  widthRange.addEventListener("change", convertAndRender);
  charsetSelect.addEventListener("change", convertAndRender);
  colorToggle.addEventListener("change", convertAndRender);

  downloadPngBtn.addEventListener("click", downloadPng);
  downloadTxtBtn.addEventListener("click", downloadTxt);
  resetBtn.addEventListener("click", reset);

  window.addEventListener("resize", () => {
    if (lastGrid) renderGrid(lastGrid);
  });
})();
