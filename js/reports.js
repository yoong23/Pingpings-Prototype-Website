// =====================================================
// REPORTS PAGE (Admin only)
// =====================================================
let reportTab = "inventory";   // inventory | movement | expiration
let reportData = { title: "", headers: [], rows: [] };  // what is currently shown (also used for CSV)

function renderReports() {
  reportTab = "inventory";

  document.getElementById("pageContent").innerHTML = `
    <div class="panel">
      <div class="pill-tabs" id="repTabs"></div>

      <div id="repFilters"></div>

      <div class="panel-head">
        <div>
          <h3 id="repTitle"></h3>
          <p id="repDate"></p>
        </div>
        <div class="actions">
          <button class="btn btn-outline btn-small" onclick="window.print()">${icon("printer")} Print</button>
          <button class="btn btn-primary btn-small" onclick="downloadReportCSV()">${icon("download")} Download CSV</button>
        </div>
      </div>

      <div id="repSummary" class="chips"></div>

      <div class="table-wrap">
        <table>
          <thead id="repHead"></thead>
          <tbody id="repBody"></tbody>
        </table>
      </div>
    </div>
  `;

  buildReportFilters();
  drawReport();
}

function setReportTab(tab) {
  reportTab = tab;
  buildReportFilters();
  drawReport();
}

// ---------- Filters (only the Stock Movement tab has them) ----------
function buildReportFilters() {
  const box = document.getElementById("repFilters");

  if (reportTab !== "movement") {
    box.innerHTML = "";
    return;
  }

  box.innerHTML = `
    <div class="rep-filter-row">
      <div>
        <label>From</label>
        <input type="date" id="repFrom" onchange="drawReport()">
      </div>
      <div>
        <label>To</label>
        <input type="date" id="repTo" onchange="drawReport()">
      </div>
      <div>
        <label>Type</label>
        <select id="repType" onchange="drawReport()">
          <option value="">All</option>
          <option value="IN">Stock-In</option>
          <option value="OUT">Stock-Out</option>
        </select>
      </div>
    </div>
  `;
}

// ---------- Helpers ----------
function localDateString(iso) {
  const d = new Date(iso);
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

// ---------- Build each report ----------
function buildInventoryReport() {
  const products = getData("products", []);
  const totalUnits = products.reduce((sum, p) => sum + p.currentStock, 0);

  return {
    title: "Inventory Report",
    summary: [
      products.length + " Products",
      totalUnits + " Units in stock"
    ],
    headers: ["Code", "Name", "Category", "Price", "Initial Stock", "Current Stock", "Status", "Expiry Date"],
    rows: products.map(p => [
      p.code, p.name, p.category, "₱" + Number(p.price).toFixed(2),
      p.initialStock, p.currentStock, getStockStatus(p).label, p.expiryDate
    ])
  };
}

function buildMovementReport() {
  const from = document.getElementById("repFrom") ? document.getElementById("repFrom").value : "";
  const to = document.getElementById("repTo") ? document.getElementById("repTo").value : "";
  const type = document.getElementById("repType") ? document.getElementById("repType").value : "";

  let movements = getData("movements", []).slice().reverse();   // newest first

  movements = movements.filter(m => {
    const day = localDateString(m.date);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (type && m.type !== type) return false;
    return true;
  });

  const totalIn = movements.filter(m => m.type === "IN").reduce((s, m) => s + m.quantity, 0);
  const totalOut = movements.filter(m => m.type === "OUT").reduce((s, m) => s + m.quantity, 0);

  return {
    title: "Stock Movement Report",
    summary: [
      movements.length + " Records",
      totalIn + " Units added (Stock-In)",
      totalOut + " Units removed (Stock-Out)"
    ],
    headers: ["Date and Time", "Code", "Product", "Type", "Quantity", "Remarks", "Recorded By"],
    rows: movements.map(m => [
      formatDateTime(m.date), m.code, m.name,
      m.type === "IN" ? "Stock-In" : "Stock-Out",
      m.quantity, m.remarks, m.user
    ])
  };
}

function buildExpirationReport() {
  const items = getData("products", [])
    .map(p => ({ p: p, info: getExpiryInfo(p) }))
    .sort((a, b) => a.info.daysLeft - b.info.daysLeft);

  const expired = items.filter(i => i.info.key === "expired").length;
  const near = items.filter(i => i.info.key === "near").length;
  const good = items.filter(i => i.info.key === "good").length;

  return {
    title: "Expiration Report",
    summary: [expired + " Expired", near + " Near Expiry", good + " Good"],
    headers: ["Code", "Name", "Category", "Current Stock", "Expiry Date", "Days Left", "Status"],
    rows: items.map(i => [
      i.p.code, i.p.name, i.p.category, i.p.currentStock,
      i.p.expiryDate, i.info.note, i.info.label
    ])
  };
}

// ---------- Draw ----------
function drawReport() {
  let report;
  if (reportTab === "inventory") report = buildInventoryReport();
  else if (reportTab === "movement") report = buildMovementReport();
  else report = buildExpirationReport();

  reportData = { title: report.title, headers: report.headers, rows: report.rows };

  // Tabs
  const tabs = [
    { key: "inventory",  label: "Inventory" },
    { key: "movement",   label: "Stock Movement" },
    { key: "expiration", label: "Expiration" }
  ];
  document.getElementById("repTabs").innerHTML = tabs.map(t => `
    <button class="pill-tab ${reportTab === t.key ? "active" : ""}"
            onclick="setReportTab('${t.key}')">${t.label}</button>
  `).join("");

  // Title, date, summary
  document.getElementById("repTitle").textContent = report.title;
  document.getElementById("repDate").textContent = "Generated: " + new Date().toLocaleString();
  document.getElementById("repSummary").innerHTML =
    report.summary.map(s => `<span class="chip">${escapeHtml(s)}</span>`).join("");

  // Table
  document.getElementById("repHead").innerHTML =
    "<tr>" + report.headers.map(h => `<th>${escapeHtml(h)}</th>`).join("") + "</tr>";

  let body = "";
  if (report.rows.length === 0) {
    body = `<tr><td colspan="${report.headers.length}" class="empty">No records found.</td></tr>`;
  } else {
    report.rows.forEach(row => {
      body += "<tr>" + row.map(cell => `<td>${escapeHtml(String(cell))}</td>`).join("") + "</tr>";
    });
  }
  document.getElementById("repBody").innerHTML = body;
}

// ---------- Download CSV (opens in Excel) ----------
function downloadReportCSV() {
  function csvCell(value) {
    return '"' + String(value).replace(/"/g, '""') + '"';
  }

  const lines = [reportData.headers.map(csvCell).join(",")];
  reportData.rows.forEach(row => lines.push(row.map(csvCell).join(",")));

  // "\ufeff" helps Excel read the peso sign correctly
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = reportData.title.replace(/\s+/g, "_") + "_" + localDateString(new Date().toISOString()) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}