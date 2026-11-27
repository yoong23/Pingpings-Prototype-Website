// ---------- Storage helpers (shared SQLite database on the server) ----------
// All devices (laptop + phone) read and write the same database through the server,
// after logging in. If the server cannot be reached (e.g. the page was opened as a plain file),
// the system falls back to this browser's localStorage so it still works.
const DB_KEYS = ["users", "products", "movements"];
let dbCache = {};
let serverOnline = false;

// The login token the server gave us (cleared when the browser tab is closed)
function authToken() {
  return sessionStorage.getItem("authToken") || "";
}

function authHeaders() {
  return { "Content-Type": "application/json", "Authorization": "Bearer " + authToken() };
}

// The login is no longer valid (for example the server was restarted): go back to the login page
function handleUnauthorized() {
  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("authToken");
  const onLoginPage = /index\.html$/.test(window.location.pathname) || window.location.pathname.endsWith("/");
  if (!onLoginPage) window.location.href = "index.html";
}

// Load the whole database from the server (synchronous so the pages can keep using getData right away)
function loadFromServer() {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/db", false);
    if (authToken()) xhr.setRequestHeader("Authorization", "Bearer " + authToken());
    xhr.send();
    if (xhr.status === 200) {
      dbCache = JSON.parse(xhr.responseText);
      serverOnline = true;
      return true;
    }
    if (xhr.status === 401) {
      // The server is there, but nobody is logged in (normal on the login page)
      dbCache = {};
      serverOnline = true;
      if (authToken() || sessionStorage.getItem("currentUser")) handleUnauthorized();
      return true;
    }
  } catch (e) { /* no server */ }
  serverOnline = false;
  return false;
}

// Pull the newest data (used when the user opens a page, so changes from the other device show up)
function refreshData() {
  if (serverOnline) loadFromServer();
}

// Writes are sent one after another so they always arrive in order
let saveQueue = Promise.resolve();

function queueRequest(url, method, body) {
  saveQueue = saveQueue
    .then(() => fetch(url, { method: method, headers: authHeaders(), body: JSON.stringify(body) }))
    .then(res => {
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) {
        return res.json().catch(() => ({})).then(data => {
          throw new Error(data.error || "Save failed");
        });
      }
    })
    .catch(err => {
      if (typeof toast === "function") toast("Could not save: " + (err && err.message ? err.message : "check the connection."), "error");
    });
}

function getData(key, defaultValue) {
  if (serverOnline) {
    return dbCache[key] !== undefined ? JSON.parse(JSON.stringify(dbCache[key])) : defaultValue;
  }
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultValue;
}

function setData(key, value) {
  if (serverOnline) {
    const copy = JSON.parse(JSON.stringify(value));
    // Passwords are only sent to the server once; they are never kept in the page
    if (key === "users") copy.forEach(u => { delete u.password; });
    dbCache[key] = copy;
    queueRequest("/api/db/" + key, "PUT", value);
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// Save several lists in ONE step (all of them are saved, or none)
function setDataMany(values) {
  if (serverOnline) {
    Object.keys(values).forEach(key => { dbCache[key] = JSON.parse(JSON.stringify(values[key])); });
    queueRequest("/api/db/batch", "PUT", values);
  } else {
    Object.keys(values).forEach(key => localStorage.setItem(key, JSON.stringify(values[key])));
  }
}

// Tell the server whether a QR-scan purchase was confirmed (YES) or declined (NO)
function recordConfirmation(productId, quantity, status) {
  if (!serverOnline) return;
  queueRequest("/api/confirmations", "POST", { productId: productId, quantity: quantity, status: status });
}

// End the login on the server too
function serverLogout() {
  if (serverOnline && authToken()) {
    try {
      fetch("/api/logout", { method: "POST", headers: authHeaders(), keepalive: true });
    } catch (e) { /* ignore */ }
  }
  sessionStorage.removeItem("authToken");
}

loadFromServer();

// ---------- Default users (offline fallback only; the server creates them otherwise) ----------
if (!serverOnline && !localStorage.getItem("users")) {
  setData("users", [
    { id: 1, name: "Owner", username: "admin", password: "admin123", role: "admin" },
    { id: 2, name: "Staff 1", username: "staff", password: "staff123", role: "staff" }
  ]);
}

// ---------- Safe text for HTML (prevents broken layout from special characters) ----------
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---------- Stock status (used by Inventory page) ----------
function getStockStatus(product) {
  if (product.currentStock === 0) return { label: "Out of Stock", css: "out" };
  if (product.currentStock <= 5) return { label: "Low Stock", css: "low" };
  return { label: "In Stock", css: "" };
}

// ---------- Date and time for display ----------
function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString();
}

// ---------- Record a Stock-In or Stock-Out ----------
// type: "IN" or "OUT". Updates the product's current stock AND saves a movement record.
// Returns { ok: true/false, message: "..." }
// The QR Scanner (Step 6) will reuse this function.
function recordMovement(productId, type, quantity, remarks) {
  const products = getData("products", []);
  const p = products.find(item => item.id === productId);

  if (!p) {
    return { ok: false, message: "Product not found." };
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, message: "Quantity must be a whole number greater than 0." };
  }
  if (type === "OUT" && quantity > p.currentStock) {
    return { ok: false, message: "Not enough stock. Only " + p.currentStock + " available." };
  }

  const oldStock = p.currentStock;
  p.currentStock = type === "IN" ? oldStock + quantity : oldStock - quantity;

  const movements = getData("movements", []);
  const user = JSON.parse(sessionStorage.getItem("currentUser"));
  const newId = movements.length > 0 ? Math.max(...movements.map(m => m.id)) + 1 : 1;

  movements.push({
    id: newId,
    productId: p.id,
    code: p.code,
    name: p.name,
    type: type,
    quantity: quantity,
    remarks: remarks || "",
    user: user ? user.name : "",
    date: new Date().toISOString()
  });

  // The new stock level and the movement are saved together, so they can never get out of step
  setDataMany({ products: products, movements: movements });

  return {
    ok: true,
    message: p.name + ": stock updated (" + oldStock + " → " + p.currentStock + ")."
  };
}