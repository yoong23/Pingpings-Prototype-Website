// ---------- PRODUCTS PAGE ----------
const PRODUCT_CATEGORIES = ["Tinapa", "Dried Fish", "Pasalubong", "Snacks"];
function renderProducts() {
  const isAdmin = currentUser.role === "admin";
  const products = getData("products", []);

  let table;
  if (products.length === 0) {
    table = emptyState("package", "No products yet", isAdmin ? "Add a product to get started." : "Products will appear here once the owner adds them.");
  } else {
    const rows = products.map(p => {
      const st = getStockStatus(p);
      return `
        <tr>
          <td>${productCell(p)}</td>
          <td>${escapeHtml(p.category)}</td>
          <td>₱${Number(p.price).toFixed(2)}</td>
          <td>${p.initialStock}</td>
          <td><strong>${p.currentStock}</strong></td>
          <td>${escapeHtml(p.expiryDate)}</td>
          <td>${badge(st.label, st.css)}</td>
          ${isAdmin ? `
          <td>
            <div class="row-actions">
              <button class="icon-button" title="QR code" onclick="showQR(${p.id})">${icon("qr-code")}</button>
              <button class="icon-button" title="Edit" onclick="showProductForm(${p.id})">${icon("square-pen")}</button>
              <button class="icon-button" title="Delete" onclick="deleteProduct(${p.id})">${icon("trash-2")}</button>
            </div>
          </td>` : ""}
        </tr>`;
    }).join("");

    table = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Price</th><th>Initial</th>
              <th>Current</th><th>Expiry</th><th>Status</th>${isAdmin ? "<th>Actions</th>" : ""}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // The Add/Edit form is for Admin only
  const formHtml = isAdmin ? `
    <div id="productFormBox" class="panel form-panel hidden" style="margin-bottom:18px;">
      <h3 id="formTitle">Add Product</h3>
      <p class="sub">A unique code and QR label are created automatically for new products.</p>
      <form id="productForm" onsubmit="saveProduct(event)">
        <input type="hidden" id="pId">
        <div class="form-grid">
          <div class="field">
            <label>Product name</label>
            <input type="text" id="pName" required>
          </div>
          <div class="field">
            <label>Category</label>
            <div class="combo">
              <input type="text" id="pCategory" autocomplete="off" placeholder="Type or select a category" required
                onfocus="openCategoryList()" onclick="openCategoryList()" oninput="filterCategoryList()" onkeydown="categoryKeydown(event)">
              <button type="button" class="combo-toggle" tabindex="-1" aria-label="Show categories" onclick="toggleCategoryList()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <ul id="pCategoryList" class="combo-list hidden" role="listbox">
                ${PRODUCT_CATEGORIES.map(c => `<li role="option" onclick="pickCategory('${c}')">${c}</li>`).join("")}
              </ul>
            </div>
          </div>
          <div class="field">
            <label>Price (₱)</label>
            <input type="number" id="pPrice" min="0" step="0.01" required>
          </div>
          <div class="field">
            <label>Initial stock</label>
            <input type="number" id="pStock" min="0" step="1" required>
          </div>
          <div class="field">
            <label>Expiry date</label>
            <input type="date" id="pExpiry" required>
          </div>
          <div class="field">
            <label>Description</label>
            <input type="text" id="pDesc">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="hideProductForm()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save product ${icon("arrow-right")}</button>
        </div>
      </form>
    </div>
  ` : "";

  document.getElementById("pageContent").innerHTML = `
    ${formHtml}
    <div class="panel">
      <div class="toolbar">
        <input id="productSearch" placeholder="Search by name, code or category…" oninput="filterProductRows()">
        <div class="spacer"></div>
        <span class="muted" id="productCount">${products.length} products</span>
        ${isAdmin ? `<button class="btn btn-primary btn-small" onclick="showProductForm()">${icon("plus")} Add product</button>` : ""}
      </div>
      ${table}
    </div>
  `;
}

// ---------- Category combo box (type your own OR pick from the list) ----------
function openCategoryList() {
  filterCategoryList();
}

function closeCategoryList() {
  const list = document.getElementById("pCategoryList");
  if (list) {
    list.classList.add("hidden");
    list.querySelectorAll("li").forEach(li => li.classList.remove("active"));
  }
}

function toggleCategoryList() {
  const list = document.getElementById("pCategoryList");
  if (list.classList.contains("hidden")) {
    // Show every category when opened with the arrow
    list.querySelectorAll("li").forEach(li => li.classList.remove("hidden"));
    list.classList.remove("hidden");
    document.getElementById("pCategory").focus();
  } else {
    closeCategoryList();
  }
}

// Show only the categories that match what has been typed
function filterCategoryList() {
  const term = document.getElementById("pCategory").value.trim().toLowerCase();
  const list = document.getElementById("pCategoryList");
  let visible = 0;
  list.querySelectorAll("li").forEach(li => {
    const match = li.textContent.toLowerCase().includes(term);
    li.classList.toggle("hidden", !match);
    li.classList.remove("active");
    if (match) visible++;
  });
  list.classList.toggle("hidden", visible === 0);
}

function pickCategory(name) {
  document.getElementById("pCategory").value = name;
  closeCategoryList();
}

// Arrow keys / Enter / Escape support
function categoryKeydown(e) {
  const list = document.getElementById("pCategoryList");
  const items = [...list.querySelectorAll("li:not(.hidden)")];
  const current = items.findIndex(li => li.classList.contains("active"));

  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (list.classList.contains("hidden")) filterCategoryList();
    const visible = [...list.querySelectorAll("li:not(.hidden)")];
    if (visible.length === 0) return;
    visible.forEach(li => li.classList.remove("active"));
    const step = e.key === "ArrowDown" ? 1 : -1;
    const next = (current + step + visible.length) % visible.length;
    visible[next].classList.add("active");
  } else if (e.key === "Enter" && current >= 0 && !list.classList.contains("hidden")) {
    e.preventDefault();
    pickCategory(items[current].textContent);
  } else if (e.key === "Escape") {
    closeCategoryList();
  }
}

// Close the list when clicking anywhere outside the combo box
if (!window.__categoryComboBound) {
  window.__categoryComboBound = true;
  document.addEventListener("click", e => {
    if (!e.target.closest(".combo")) closeCategoryList();
  });
}

// Simple live search over the rendered rows
function filterProductRows() {
  const term = document.getElementById("productSearch").value.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll("#pageContent tbody tr").forEach(tr => {
    const match = tr.textContent.toLowerCase().includes(term);
    tr.classList.toggle("hidden", !match);
    if (match) shown++;
  });
  document.getElementById("productCount").textContent = shown + " products";
}

// ---------- Show / hide the form ----------
function showProductForm(id) {
  document.getElementById("productFormBox").classList.remove("hidden");
  document.getElementById("productForm").reset();
  closeCategoryList();
  document.getElementById("pId").value = "";
  document.getElementById("pStock").disabled = false;
  document.getElementById("formTitle").textContent = "Add Product";

  // If an id was given, we are editing
  if (id) {
    const p = getData("products", []).find(item => item.id === id);
    if (!p) return;

    document.getElementById("formTitle").textContent = "Edit Product (" + p.code + ")";
    document.getElementById("pId").value = p.id;
    document.getElementById("pName").value = p.name;
    document.getElementById("pCategory").value = p.category;
    document.getElementById("pPrice").value = p.price;
    document.getElementById("pStock").value = p.initialStock;
    document.getElementById("pStock").disabled = true; // stock changes only via Stock-In / Stock-Out
    document.getElementById("pExpiry").value = p.expiryDate;
    document.getElementById("pDesc").value = p.description;
  }

  document.getElementById("productFormBox").scrollIntoView({ behavior: "smooth" });
}

function hideProductForm() {
  document.getElementById("productFormBox").classList.add("hidden");
}

// ---------- Save (Add or Edit) ----------
function saveProduct(e) {
  e.preventDefault();

  const products = getData("products", []);
  const id = document.getElementById("pId").value;

  const name = document.getElementById("pName").value.trim();
  let category = document.getElementById("pCategory").value.trim().replace(/\s+/g, " ");
  if (!category) { toast("Please enter a category."); return; }
  // If it matches a preset ignoring upper/lower case (e.g. "tinapa"), use the preset spelling
  const preset = PRODUCT_CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase());
  if (preset) category = preset;
  const price = parseFloat(document.getElementById("pPrice").value);
  const expiryDate = document.getElementById("pExpiry").value;
  const description = document.getElementById("pDesc").value.trim();

  let newProductId = null; // will hold the id only when a NEW product is added

  if (id) {
    // ----- EDIT -----
    const p = products.find(item => item.id === Number(id));
    p.name = name;
    p.category = category;
    p.price = price;
    p.expiryDate = expiryDate;
    p.description = description;
  } else {
    // ----- ADD -----
    const stock = parseInt(document.getElementById("pStock").value, 10);
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;

    products.push({
      id: newId,
      code: "PP-" + String(newId).padStart(4, "0"), // unique code, used for the QR
      name: name,
      category: category,
      price: price,
      initialStock: stock,
      currentStock: stock,
      expiryDate: expiryDate,
      description: description
    });
    newProductId = newId;
  }

  setData("products", products);
  renderProducts();
  toast(id ? "Product updated." : "Product saved.");

  // SRS: after saving a new product, generate its QR code
  if (newProductId) showQR(newProductId);
}

// ---------- Delete ----------
function deleteProduct(id) {
  if (!confirm("Delete this product? This cannot be undone.")) return;

  const products = getData("products", []).filter(p => p.id !== id);
  setData("products", products);
  renderProducts();
  toast("Product deleted.");
}