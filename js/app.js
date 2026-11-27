// ---------- 1. Check login ----------
const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
if (!currentUser) {
  window.location.href = "index.html";
}

// ---------- 2. Pages, titles and role access (from SRS 2.3) ----------
const allPages = [
  { id: "dashboard",  label: "Dashboard",             roles: ["admin", "staff"], sub: "Monitor stock levels, movements, and items that need attention." },
  { id: "products",   label: "Product list",          roles: ["admin", "staff"], sub: "Browse, search, and manage every registered product." },
  { id: "inventory",  label: "Inventory",             roles: ["admin", "staff"], sub: "Check current stock levels across all products." },
  { id: "stockin",    label: "Stock-in",              roles: ["admin", "staff"], sub: "Record products received into your inventory." },
  { id: "stockout",   label: "Stock-out",             roles: ["admin", "staff"], sub: "Record products taken out of your inventory." },
  { id: "scanner",    label: "QR scanner",            roles: ["admin", "staff"], sub: "Scan a product QR code to look it up quickly." },
  { id: "expiration", label: "Expiration",            roles: ["admin", "staff"], sub: "Track products that are expiring soon or already expired." },
  { id: "reports",    label: "Reports",               roles: ["admin"],          sub: "Review stock movements and export your records." },
  { id: "users",      label: "User management",       roles: ["admin"],          sub: "Manage staff accounts and access roles." }
];

// ---------- 3. Page renderers ----------
const renderers = {
  dashboard: renderDashboard,
  products: renderProducts,
  inventory: renderInventory,
  stockin: renderStockIn,
  stockout: renderStockOut,
  scanner: renderScanner,
  expiration: renderExpiration,
  reports: renderReports,
  users: renderUsers
};

function renderPlaceholder(page) {
  document.getElementById("pageContent").innerHTML = `
    <div class="panel">${emptyState("package", "Page not available", "The " + page.label + " page is not available.")}</div>
  `;
}

// ---------- 4. Navigation ----------
function showPage(pageId) {
  const page = allPages.find(p => p.id === pageId);

  // Role check: block pages the user is not allowed to open
  if (!page || !page.roles.includes(currentUser.role)) {
    toast("You do not have access to this page.", "error");
    return;
  }

  // Turn the camera off when leaving the scanner page
  stopScanner();

  // Get the newest data from the server (shows changes made on the other device)
  refreshData();

  // Header banner: title, subtitle and the same icon the sidebar uses
  document.getElementById("pageTitle").textContent = page.label;
  document.getElementById("pageSubtitle").textContent = page.sub;

  document.querySelectorAll(".nav-item[data-page]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });
  const navIcon = document.querySelector('.nav-item[data-page="' + pageId + '"] .nav-icon');
  if (navIcon) document.getElementById("pageBannerIcon").innerHTML = navIcon.innerHTML;

  // Close the mobile menu
  document.getElementById("sidebar").classList.remove("open");
  const overlay = document.querySelector(".mobile-overlay");
  if (overlay) overlay.classList.remove("show");

  // Show the page
  if (renderers[pageId]) {
    renderers[pageId]();
  } else {
    renderPlaceholder(page);
  }
  window.scrollTo(0, 0);
}

// Kept for the dashboard buttons
function navigate(pageId) { showPage(pageId); }

// ---------- 5. Wire up the sidebar ----------
document.getElementById("mainNav").addEventListener("click", function (e) {
  const b = e.target.closest("[data-page]");
  if (b) showPage(b.dataset.page);
});

// Admin-only menu items are hidden for staff
document.querySelectorAll(".admin-only").forEach(el => {
  el.classList.toggle("hidden", currentUser.role !== "admin");
});

// ---------- 6. Mobile menu ----------
document.getElementById("mobileMenu").addEventListener("click", function () {
  document.getElementById("sidebar").classList.toggle("open");
  let overlay = document.querySelector(".mobile-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "mobile-overlay";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function () {
      document.getElementById("sidebar").classList.remove("open");
      overlay.classList.remove("show");
    });
  }
  overlay.classList.toggle("show");
});

// ---------- 7. Start ----------
function updateUserBox() {
  document.getElementById("userName").textContent = currentUser.name;
  document.getElementById("userRole").textContent =
    currentUser.role === "admin" ? "Administrator" : "Staff";
}
updateUserBox();

document.getElementById("logoutBtn").addEventListener("click", function () {
  stopScanner();
  serverLogout();
  sessionStorage.removeItem("currentUser");
  window.location.href = "index.html";
});

showPage("dashboard");
