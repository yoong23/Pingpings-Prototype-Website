// ---------- Small UI helpers shared by every page (Stockwise design) ----------
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function toast(msg, type = "success") {
  const root = $("#toastRoot");
  if (!root) return;
  const t = document.createElement("div");
  t.className = "toast " + (type === "error" ? "error" : type === "info" ? "info" : "");
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function badge(text, cls = "") {
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}

function statCard(label, value, iconSvg, foot = "Updated just now", tone = "") {
  return `
    <div class="stat-card ${tone}">
      <div class="stat-head">${label}<span class="stat-icon">${iconSvg}</span></div>
      <div class="stat-value">${value}</div>
      <div class="stat-foot">${foot}</div>
    </div>`;
}

function productCell(p) {
  return `
    <div class="product-cell">
      <div class="product-thumb">${escapeHtml(p.name.slice(0, 1).toUpperCase())}</div>
      <div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.code)}</small></div>
    </div>`;
}

function emptyState(iconName, title, text) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon(iconName)}</div>
      <strong>${title}</strong>
      <p>${text}</p>
    </div>`;
}

function openModal(title, content, extraClass = "") {
  const root = $("#modalRoot");
  if (!root) return;
  root.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this)closeModal()">
      <div class="modal ${extraClass}">
        <div class="modal-head">
          <h3>${title}</h3>
          <button class="modal-close" onclick="closeModal()" aria-label="Close">${icon("x")}</button>
        </div>
        ${content}
      </div>
    </div>`;
}

function closeModal() {
  const root = $("#modalRoot");
  if (root) root.innerHTML = "";
}
