// =====================================================
// EXPIRATION MONITORING PAGE
// =====================================================
const NEAR_EXPIRY_DAYS = 7;   // same rule as the Dashboard
let expiryFilter = "all";     // all | expired | near | good

// ---------- Work out the expiry status of one product ----------
function getExpiryInfo(product) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Read "YYYY-MM-DD" as a local date (avoids timezone shifts)
  const parts = product.expiryDate.split("-");
  const expiry = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

  const daysLeft = Math.round((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      key: "expired", label: "Expired", css: "expired",
      daysLeft: daysLeft, note: Math.abs(daysLeft) + " day(s) ago"
    };
  }
  if (daysLeft <= NEAR_EXPIRY_DAYS) {
    return {
      key: "near", label: "Near Expiry", css: "soon",
      daysLeft: daysLeft, note: daysLeft === 0 ? "Expires today" : daysLeft + " day(s) left"
    };
  }
  return {
    key: "good", label: "Good", css: "",
    daysLeft: daysLeft, note: daysLeft + " day(s) left"
  };
}

// ---------- Page ----------
function renderExpiration() {
  expiryFilter = "all";

  document.getElementById("pageContent").innerHTML = `
    <div class="stats-grid" id="expStats"></div>
    <div class="panel">
      <div class="pill-tabs" id="expFilters"></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Stock</th>
              <th>Expiry date</th><th>Days left</th><th>Status</th>
            </tr>
          </thead>
          <tbody id="expBody"></tbody>
        </table>
      </div>
    </div>
  `;

  drawExpiration();
}

function setExpiryFilter(filter) {
  expiryFilter = filter;
  drawExpiration();
}

function drawExpiration() {
  // Attach the expiry info to each product, then sort: nearest expiry first
  const items = getData("products", [])
    .map(p => ({ product: p, info: getExpiryInfo(p) }))
    .sort((a, b) => a.info.daysLeft - b.info.daysLeft);

  // Counts
  const counts = {
    all: items.length,
    expired: items.filter(i => i.info.key === "expired").length,
    near: items.filter(i => i.info.key === "near").length,
    good: items.filter(i => i.info.key === "good").length
  };

  // Summary cards
  document.getElementById("expStats").innerHTML =
    statCard("Expired", counts.expired, icon("triangle-alert"), "Past the expiry date", "danger") +
    statCard("Near expiry", counts.near, icon("clock"), "Within " + NEAR_EXPIRY_DAYS + " days", "warn") +
    statCard("Good", counts.good, icon("circle-check"), "More than " + NEAR_EXPIRY_DAYS + " days left") +
    statCard("All products", counts.all, icon("package"), "Tracked in the system");

  // Filter buttons
  const tabs = [
    { key: "all",     label: "All" },
    { key: "expired", label: "Expired" },
    { key: "near",    label: "Near Expiry" },
    { key: "good",    label: "Good" }
  ];

  document.getElementById("expFilters").innerHTML = tabs.map(t => `
    <button class="pill-tab ${expiryFilter === t.key ? "active" : ""}"
            onclick="setExpiryFilter('${t.key}')">
      ${t.label} (${counts[t.key]})
    </button>
  `).join("");

  // Table rows
  const shown = expiryFilter === "all"
    ? items
    : items.filter(i => i.info.key === expiryFilter);

  let rows = "";
  if (shown.length === 0) {
    rows = `<tr><td colspan="6" class="empty">No products to show.</td></tr>`;
  } else {
    shown.forEach(i => {
      const p = i.product;
      rows += `
        <tr class="row-${i.info.key === "expired" ? "expired" : i.info.key === "near" ? "near" : "good"}">
          <td>${productCell(p)}</td>
          <td>${escapeHtml(p.category)}</td>
          <td>${p.currentStock}</td>
          <td>${escapeHtml(p.expiryDate)}</td>
          <td>${i.info.note}</td>
          <td>${badge(i.info.label, i.info.css)}</td>
        </tr>`;
    });
  }

  document.getElementById("expBody").innerHTML = rows;
}