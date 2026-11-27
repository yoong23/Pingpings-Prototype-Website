// =====================================================
// INVENTORY PAGE
// =====================================================
function renderInventory() {
  const products = getData("products", []);
  const units = products.reduce((s, p) => s + p.currentStock, 0);
  const low = products.filter(p => p.currentStock > 0 && p.currentStock <= 5).length;
  const out = products.filter(p => p.currentStock === 0).length;

  document.getElementById("pageContent").innerHTML = `
    <div class="stats-grid">
      ${statCard("Total products", products.length, icon("package"))}
      ${statCard("Units on hand", units, icon("layers"))}
      ${statCard("Low stock", low, icon("trending-down"), "5 units or fewer", "warn")}
      ${statCard("Out of stock", out, icon("package-x"), out ? "Restock recommended" : "No empty items", "danger")}
    </div>
    <div class="panel">
      <div class="toolbar">
        <input type="text" id="invSearch" placeholder="Search by code, name, or category…" oninput="drawInventoryRows()">
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Product</th><th>Category</th><th>Current stock</th><th>Status</th><th>Expiry</th></tr>
          </thead>
          <tbody id="invBody"></tbody>
        </table>
      </div>
    </div>
  `;
  drawInventoryRows();
}

function drawInventoryRows() {
  const term = document.getElementById("invSearch").value.trim().toLowerCase();
  const products = getData("products", []).filter(p =>
    p.code.toLowerCase().includes(term) ||
    p.name.toLowerCase().includes(term) ||
    p.category.toLowerCase().includes(term)
  );

  let rows = "";
  if (products.length === 0) {
    rows = `<tr><td colspan="5" class="empty">No products found.</td></tr>`;
  } else {
    products.forEach(p => {
      const status = getStockStatus(p);
      rows += `
        <tr>
          <td>${productCell(p)}</td>
          <td>${escapeHtml(p.category)}</td>
          <td><strong>${p.currentStock}</strong></td>
          <td>${badge(status.label, status.css)}</td>
          <td>${escapeHtml(p.expiryDate)}</td>
        </tr>`;
    });
  }

  document.getElementById("invBody").innerHTML = rows;
}