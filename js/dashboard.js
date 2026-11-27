function renderDashboard() {
  const products = getData("products", []);
  const movements = getData("movements", []);

  const totalProducts = products.length;
  const lowStock = products.filter(p => p.currentStock <= 5 && p.currentStock > 0).length;
  const outOfStock = products.filter(p => p.currentStock === 0).length;

  // Use the same expiry rule as the Expiration Monitoring page
  let nearExpiry = 0;
  let expired = 0;
  products.forEach(p => {
    const info = getExpiryInfo(p);
    if (info.key === "expired") expired++;
    else if (info.key === "near") nearExpiry++;
  });

  // Stock movement chart: last 6 months of Stock-In vs Stock-Out units
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 5 + i);
    return { label: d.toLocaleDateString("en-US", { month: "short" }), y: d.getFullYear(), m: d.getMonth() };
  });
  const sums = months.map(mo => {
    let ins = 0, outs = 0;
    movements.forEach(m => {
      const d = new Date(m.date);
      if (d.getFullYear() === mo.y && d.getMonth() === mo.m) {
        if (m.type === "IN") ins += m.quantity; else outs += m.quantity;
      }
    });
    return { ins, outs };
  });
  const max = Math.max(1, ...sums.map(s => Math.max(s.ins, s.outs)));
  const bars = months.map((mo, i) => `
    <div class="bar-group">
      <div class="bar-pair">
        <div class="bar" style="height:${Math.max(3, (sums[i].ins / max) * 200)}px" title="Stock-in ${sums[i].ins}"></div>
        <div class="bar out" style="height:${Math.max(3, (sums[i].outs / max) * 200)}px" title="Stock-out ${sums[i].outs}"></div>
      </div>
      <div class="bar-label">${mo.label}</div>
    </div>`).join("");

  // Recent movements table
  const recent = movements.slice(-6).reverse();
  const recentHtml = recent.length === 0
    ? emptyState("package", "No stock movement yet", "Stock-in and stock-out records will appear here.")
    : `<div class="table-wrap"><table>
        <thead><tr><th>Product</th><th>Type</th><th>Quantity</th><th>Date</th><th>Remarks</th><th>Recorded by</th></tr></thead>
        <tbody>${recent.map(m => `
          <tr>
            <td>${productCell({ name: m.name, code: m.code })}</td>
            <td>${badge(m.type === "IN" ? "Stock-in" : "Stock-out", m.type === "IN" ? "" : "low")}</td>
            <td><strong>${m.type === "IN" ? "+" : "−"}${m.quantity}</strong></td>
            <td>${formatDateTime(m.date)}</td>
            <td>${escapeHtml(m.remarks || "—")}</td>
            <td>${escapeHtml(m.user || "—")}</td>
          </tr>`).join("")}
        </tbody></table></div>`;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const isAdmin = currentUser.role === "admin";
  const today = new Date().toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });

  document.getElementById("pageContent").innerHTML = `
    <div class="welcome-row">
      <div>
        <div class="welcome-date">${today}</div>
        <h2>Good ${greet}, ${escapeHtml(currentUser.name.split(" ")[0])} 👋</h2>
      </div>
      <div class="actions">
        <button class="btn btn-outline" onclick="navigate('inventory')">View inventory</button>
      </div>
    </div>

    <div class="stats-grid five">
      ${statCard("Total products", totalProducts, icon("package"), "Across all categories")}
      ${statCard("Low stock", lowStock, icon("trending-down"), lowStock ? lowStock + " need attention" : "All good", "warn")}
      ${statCard("Out of stock", outOfStock, icon("package-x"), outOfStock ? "Restock recommended" : "No empty items", "danger")}
      ${statCard("Near expiry (7 days)", nearExpiry, icon("clock"), "Check the Expiration page", "warn")}
      ${statCard("Expired", expired, icon("triangle-alert"), expired ? "Remove from shelves" : "Nothing expired", "danger")}
    </div>

    <div class="dashboard-grid single">
      <section class="panel">
        <div class="panel-head">
          <div><h3>Stock movement</h3><p>Units moved across the last six months</p></div>
          <span class="badge">Live data</span>
        </div>
        <div class="mini-bars">${bars}</div>
        <div class="legend"><span>Stock-in</span><span>Stock-out</span></div>
      </section>

    </div>

    <div class="panel">
      <div class="panel-head">
        <div><h3>Recent stock movement</h3><p>Latest inventory transactions</p></div>
        ${isAdmin ? `<button class="link-button" onclick="navigate('reports')">View reports ${icon("arrow-right")}</button>` : ""}
      </div>
      ${recentHtml}
    </div>
  `;
}
