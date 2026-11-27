// =====================================================
// QR SCANNER PAGE
// =====================================================
let scannerStream = null;   // the camera stream
let scannerActive = false;  // true while the camera is scanning

function renderScanner() {
  document.getElementById("pageContent").innerHTML = `
    <div class="scanner-layout">

      <section class="panel">
        <div class="panel-head">
          <div><h3>Camera scanner</h3><p>Camera access is requested only when you start scanning.</p></div>
        </div>

        <div class="scanner-box">
          <video id="scanVideo" playsinline muted></video>
          <div id="scanPlaceholder" class="scanner-placeholder">
            <div class="scan-frame"></div>
            <strong>Ready to scan</strong>
            <span>Place the QR code inside your camera view.</span>
          </div>
        </div>

        <div class="scanner-actions">
          <button class="btn btn-primary" id="startScanBtn">${icon("play")} Start scanner</button>
          <button class="btn btn-outline hidden" id="stopScanBtn">${icon("square")} Stop</button>
        </div>
        <p id="scanStatus" class="scan-status"></p>

        <hr class="scan-divider">

        <label class="manual-label" for="manualCode">Or type the product code</label>
        <div class="manual-row">
          <input type="text" id="manualCode" placeholder="e.g. PP-0001">
          <button class="btn btn-primary" id="manualBtn">Find product</button>
        </div>
      </section>

      <section class="panel" id="scanResult">
        ${scanEmptyState()}
      </section>

    </div>

    <!-- Hidden canvas used to read camera frames -->
    <canvas id="scanCanvas" class="hidden"></canvas>
  `;

  document.getElementById("startScanBtn").addEventListener("click", startScanner);
  document.getElementById("stopScanBtn").addEventListener("click", stopScanner);
  document.getElementById("manualBtn").addEventListener("click", function () {
    const code = document.getElementById("manualCode").value.trim();
    if (code) handleScannedCode(code);
  });
  document.getElementById("manualCode").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      const code = e.target.value.trim();
      if (code) handleScannedCode(code);
    }
  });
}

function scanEmptyState() {
  return emptyState("scan-line", "No product selected", "Scan a QR code or type a product code to view its details.");
}

// ---------- Camera on ----------
async function startScanner() {
  const status = document.getElementById("scanStatus");
  status.textContent = "";

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    status.textContent =
      "Camera is not available here. Open the system using localhost or HTTPS, or type the code manually.";
    return;
  }

  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },  // back camera on phones
      audio: false
    });
  } catch (err) {
    status.textContent = "Cannot access the camera: " + err.message;
    return;
  }

  const video = document.getElementById("scanVideo");
  video.srcObject = scannerStream;
  await video.play();

  scannerActive = true;
  document.getElementById("scanPlaceholder").classList.add("hidden");
  document.getElementById("startScanBtn").classList.add("hidden");
  document.getElementById("stopScanBtn").classList.remove("hidden");
  status.textContent = "Point the camera at a product QR code...";

  requestAnimationFrame(scanLoop);
}

// ---------- Camera off (safe to call anytime, even when the page is not open) ----------
function stopScanner() {
  scannerActive = false;

  if (scannerStream) {
    scannerStream.getTracks().forEach(track => track.stop());
    scannerStream = null;
  }

  const video = document.getElementById("scanVideo");
  if (video) video.srcObject = null;

  const placeholder = document.getElementById("scanPlaceholder");
  const startBtn = document.getElementById("startScanBtn");
  const stopBtn = document.getElementById("stopScanBtn");
  if (placeholder) placeholder.classList.remove("hidden");
  if (startBtn) startBtn.classList.remove("hidden");
  if (stopBtn) stopBtn.classList.add("hidden");
}

// ---------- Read camera frames until a QR code is found ----------
function scanLoop() {
  if (!scannerActive) return;

  const video = document.getElementById("scanVideo");
  const canvas = document.getElementById("scanCanvas");
  if (!video || !canvas) return;

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(image.data, image.width, image.height, {
      inversionAttempts: "dontInvert"
    });

    if (result && result.data) {
      const code = result.data.trim();
      stopScanner();
      document.getElementById("scanStatus").textContent = "QR code detected: " + code;
      handleScannedCode(code);
      return;
    }
  }

  requestAnimationFrame(scanLoop);
}

// ---------- Look up the product for a scanned or typed code ----------
function handleScannedCode(code) {
  const product = getData("products", []).find(
    p => p.code.toLowerCase() === code.toLowerCase()
  );

  if (!product) {
    document.getElementById("scanResult").innerHTML = `
      <div class="panel-head"><div><h3>Product not found</h3></div></div>
      <div class="msg msg-error">No registered product matches the code "${escapeHtml(code)}".</div>
      <button class="btn btn-primary" onclick="scanNext()">Scan again</button>
    `;
    return;
  }

  showScanResult(product.id, null, false, false);
}

// ---------- Show product information + YES / NO question ----------
// message: text to show above the info (optional)
// isError: true = red message, false = green message
// done: true = the question was answered, so hide YES / NO
function showScanResult(productId, message, isError, done) {
  const p = getData("products", []).find(item => item.id === productId);
  if (!p) return;

  const status = getStockStatus(p);

  // Expiry note
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((new Date(p.expiryDate) - today) / (1000 * 60 * 60 * 24));
  let expiryNote = "";
  if (daysLeft < 0) {
    expiryNote = `<span class="badge expired">Expired</span>`;
  } else if (daysLeft <= 7) {
    expiryNote = `<span class="badge soon">Expires in ${daysLeft} day(s)</span>`;
  }

  const msgHtml = message
    ? `<div class="msg ${isError ? "msg-error" : "msg-ok"}">${escapeHtml(message)}</div>`
    : "";

  const actionHtml = done
    ? `<button class="btn btn-primary" onclick="scanNext()">Scan next product</button>`
    : `
      <div class="purchase-box">
        <h4>Has this product been purchased?</h4>
        <p>YES records a purchase and removes one unit. NO leaves inventory unchanged.</p>
        <div class="purchase-buttons">
          <button class="btn btn-primary" onclick="confirmPurchase(${p.id})">YES — purchased</button>
          <button class="btn btn-outline" onclick="declinePurchase(${p.id})">NO — not purchased</button>
        </div>
      </div>
    `;

  const details = [
    ["Category", escapeHtml(p.category)],
    ["Price", "₱" + Number(p.price).toFixed(2)],
    ["Initial stock", p.initialStock],
    ["Current stock", `<b>${p.currentStock}</b> ${badge(status.label, status.css)}`],
    ["Expiry date", `${escapeHtml(p.expiryDate)} ${expiryNote}`],
    ["Description", escapeHtml(p.description || "—")]
  ].map(([k, v]) => `<div class="detail-item"><small>${k}</small><strong>${v}</strong></div>`).join("");

  document.getElementById("scanResult").innerHTML = `
    <div class="panel-head"><div><h3>Product information</h3><p>Details for the scanned product</p></div></div>
    ${msgHtml}
    ${productCell(p)}
    <div class="detail-grid">${details}</div>
    ${actionHtml}
  `;
}

// ---------- YES: deduct 1 from stock and record it ----------
function confirmPurchase(productId) {
  const result = recordMovement(productId, "OUT", 1, "Purchased (QR scan)");
  if (result.ok) recordConfirmation(productId, 1, "YES");
  showScanResult(productId, result.message, !result.ok, true);
}

// ---------- NO: do nothing ----------
function declinePurchase(productId) {
  const p = getData("products", []).find(item => item.id === productId);
  recordConfirmation(productId, 1, "NO");
  showScanResult(productId, "No inventory change. Current Stock: " + p.currentStock, false, true);
}

// ---------- Ready for the next product ----------
function scanNext() {
  document.getElementById("scanResult").innerHTML = scanEmptyState();
  document.getElementById("scanStatus").textContent = "";
  document.getElementById("manualCode").value = "";
  startScanner();
}