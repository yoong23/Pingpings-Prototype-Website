// =====================================================
// Stock-In PAGE
// Needs: data.js (getData, recordMovement, escapeHtml, formatDateTime)
//        and ui.js (productCell, emptyState)
// =====================================================
function renderStockIn(message, isError) {
  const products = getData("products", []);

  // No products yet: nothing to record
  if (products.length === 0) {
    document.getElementById("pageContent").innerHTML = `
      <div class="panel">${emptyState("package", "No products yet", "Please add a product first in the Product list page.")}</div>
    `;
    return;
  }

  // Dropdown options
  let options = `<option value="">Select a product</option>`;
  products.forEach(p => {
    options += `<option value="${p.id}">${escapeHtml(p.code)} - ${escapeHtml(p.name)} (Stock: ${p.currentStock})</option>`;
  });

  // Last 10 movements of this type (newest first)
  const history = getData("movements", [])
    .filter(m => m.type === "IN")
    .slice(-10)
    .reverse();

  let historyRows = "";
  if (history.length === 0) {
    historyRows = `<tr><td colspan="5" class="empty">No Stock-In records yet.</td></tr>`;
  } else {
    history.forEach(m => {
      historyRows += `
        <tr>
          <td>${formatDateTime(m.date)}</td>
          <td>${productCell({ name: m.name, code: m.code })}</td>
          <td><strong>+${m.quantity}</strong></td>
          <td>${escapeHtml(m.remarks || "—")}</td>
          <td>${escapeHtml(m.user)}</td>
        </tr>`;
    });
  }

  const msgHtml = message
    ? `<div class="msg ${isError ? "msg-error" : "msg-ok"}">${escapeHtml(message)}</div>`
    : "";

  document.getElementById("pageContent").innerHTML = `
    <div class="form-layout stock-layout">
      <section class="panel form-panel">
        <h3>Incoming stock transaction</h3>
        <p class="sub">Inventory quantities update immediately after a valid transaction.</p>
        ${msgHtml}
        <form onsubmit="saveStockIn(event)">
          <div class="form-grid">
            <div class="field full">
              <label>Product</label>
              <select id="sProduct" required>${options}</select>
            </div>
            <div class="field">
              <label>Quantity added</label>
              <input type="number" id="sQty" min="1" step="1" required placeholder="Enter whole quantity">
            </div>
            <div class="field">
              <label>Remarks (optional)</label>
              <input type="text" id="sRemarks" placeholder="e.g. New batch delivered">
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save stock-in ${icon("arrow-right")}</button>
          </div>
        </form>
      </section>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><h3>Recent Stock-In records</h3><p>Last 10 entries, newest first</p></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Date and time</th><th>Product</th><th>Quantity</th><th>Remarks</th><th>Recorded by</th></tr>
          </thead>
          <tbody>${historyRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function saveStockIn(e) {
  e.preventDefault();

  const productId = Number(document.getElementById("sProduct").value);
  const quantity = parseInt(document.getElementById("sQty").value, 10);
  const remarks = document.getElementById("sRemarks").value.trim();

  const result = recordMovement(productId, "IN", quantity, remarks);
  renderStockIn(result.message, !result.ok);
}