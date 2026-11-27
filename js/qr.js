// ---------- Make a QR code drawn on a canvas ----------
function makeQRCanvas(text, size) {
  const qr = qrcode(0, "M");   // auto type, medium error correction
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  const margin = 4;                       // white border around the QR
  const total = count + margin * 2;
  const cell = Math.max(1, Math.floor(size / total));

  const canvas = document.createElement("canvas");
  canvas.width = cell * total;
  canvas.height = cell * total;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#000000";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect((col + margin) * cell, (row + margin) * cell, cell, cell);
      }
    }
  }
  return canvas;
}

// ---------- Show the QR popup for a product ----------
function showQR(productId) {
  const p = getData("products", []).find(item => item.id === productId);
  if (!p) return;

  closeQR(); // remove an old popup if there is one

  const canvas = makeQRCanvas(p.code, 280);

  const overlay = document.createElement("div");
  overlay.id = "qrModal";
  overlay.className = "modal-backdrop";
  overlay.innerHTML = `
    <div class="modal qr-modal">
      <div class="modal-head">
        <h3>Product QR code</h3>
        <button class="modal-close" id="qrX" aria-label="Close">${icon("x")}</button>
      </div>
      <div id="qrHolder"></div>
      <p class="qr-name">${escapeHtml(p.name)}</p>
      <p class="qr-code">${escapeHtml(p.code)}</p>
      <div class="qr-actions">
        <button class="btn btn-primary btn-small" id="qrDownload">${icon("download")} Download PNG</button>
        <button class="btn btn-outline btn-small" id="qrPrint">${icon("printer")} Print</button>
        <button class="btn btn-soft btn-small" id="qrClose">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById("qrHolder").appendChild(canvas);

  const dataUrl = canvas.toDataURL("image/png");

  document.getElementById("qrDownload").addEventListener("click", function () {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = p.code + ".png";
    a.click();
  });

  document.getElementById("qrPrint").addEventListener("click", function () {
    const w = window.open("", "_blank");
    w.document.write(`
      <html>
        <head><title>${escapeHtml(p.code)}</title></head>
        <body style="text-align:center;font-family:Arial;">
          <img src="${dataUrl}" style="width:300px;">
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.code)}</p>
        </body>
      </html>
    `);
    w.document.close();
    setTimeout(function () { w.focus(); w.print(); }, 300);
  });

  document.getElementById("qrClose").addEventListener("click", closeQR);
  document.getElementById("qrX").addEventListener("click", closeQR);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeQR(); });
}

function closeQR() {
  const m = document.getElementById("qrModal");
  if (m) m.remove();
}