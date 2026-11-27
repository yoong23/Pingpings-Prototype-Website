// =====================================================
// USER MANAGEMENT PAGE (Admin only)
// =====================================================
function renderUsers() {
  const users = getData("users", []);

  let rows = "";
  users.forEach(u => {
    const isSelf = u.username === currentUser.username;
    rows += `
      <tr>
        <td>${productCell({ name: u.name, code: "@" + u.username })}${isSelf ? `<span class="you-tag">(You)</span>` : ""}</td>
        <td>${escapeHtml(u.username)}</td>
        <td>${badge(u.role === "admin" ? "Administrator" : "Staff", u.role === "admin" ? "soon" : "")}</td>
        <td>
          <div class="row-actions">
            <button class="icon-button" title="Edit" onclick="showUserForm(${u.id})">${icon("square-pen")}</button>
            ${isSelf ? "" : `<button class="icon-button" title="Delete" onclick="deleteUser(${u.id})">${icon("trash-2")}</button>`}
          </div>
        </td>
      </tr>`;
  });

  document.getElementById("pageContent").innerHTML = `
    <div id="userFormBox" class="panel form-panel hidden" style="margin-bottom:18px;">
      <h3 id="userFormTitle">Add User</h3>
      <p class="sub">Administrators have full access. Staff can manage stock but not users or reports.</p>
      <div id="userMsg" class="msg msg-error hidden"></div>

      <form onsubmit="saveUser(event)">
        <input type="hidden" id="uId">
        <div class="form-grid">
          <div class="field">
            <label>Full name</label>
            <input type="text" id="uName" required>
          </div>
          <div class="field">
            <label>Username</label>
            <input type="text" id="uUsername" required>
          </div>
          <div class="field">
            <label id="uPassLabel">Password</label>
            <input type="password" id="uPassword">
          </div>
          <div class="field">
            <label>Role</label>
            <select id="uRole" required>
              <option value="staff">Staff</option>
              <option value="admin">Administrator / Owner</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="hideUserForm()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save user ${icon("arrow-right")}</button>
        </div>
      </form>
    </div>

    <div class="panel">
      <div class="toolbar">
        <span class="muted">${users.length} user${users.length === 1 ? "" : "s"}</span>
        <div class="spacer"></div>
        <button class="btn btn-primary btn-small" onclick="showUserForm()">${icon("plus")} Add user</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Username</th><th>Role</th><th>Actions</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------- Form ----------
function showUserForm(id) {
  document.getElementById("userFormBox").classList.remove("hidden");
  document.getElementById("uId").value = "";
  document.getElementById("uName").value = "";
  document.getElementById("uUsername").value = "";
  document.getElementById("uPassword").value = "";
  document.getElementById("uRole").value = "staff";
  document.getElementById("uRole").disabled = false;
  document.getElementById("userMsg").classList.add("hidden");
  document.getElementById("userFormTitle").textContent = "Add User";
  document.getElementById("uPassLabel").textContent = "Password";

  if (id) {
    const u = getData("users", []).find(item => item.id === id);
    if (!u) return;

    document.getElementById("userFormTitle").textContent = "Edit User";
    document.getElementById("uPassLabel").textContent = "New Password (leave blank to keep the current one)";
    document.getElementById("uId").value = u.id;
    document.getElementById("uName").value = u.name;
    document.getElementById("uUsername").value = u.username;
    document.getElementById("uRole").value = u.role;

    // You cannot change your own role
    if (u.username === currentUser.username) {
      document.getElementById("uRole").disabled = true;
    }
  }

  document.getElementById("userFormBox").scrollIntoView({ behavior: "smooth" });
}

function hideUserForm() {
  document.getElementById("userFormBox").classList.add("hidden");
}

function showUserError(text) {
  const box = document.getElementById("userMsg");
  box.textContent = text;
  box.classList.remove("hidden");
}

// ---------- Save (Add or Edit) ----------
function saveUser(e) {
  e.preventDefault();

  const users = getData("users", []);
  const id = document.getElementById("uId").value;

  const name = document.getElementById("uName").value.trim();
  const username = document.getElementById("uUsername").value.trim();
  const password = document.getElementById("uPassword").value;
  const role = document.getElementById("uRole").value;

  // Username must be unique
  const duplicate = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== Number(id));
  if (duplicate) {
    showUserError("That username is already taken.");
    return;
  }

  if (id) {
    // ----- EDIT -----
    const u = users.find(item => item.id === Number(id));
    const wasSelf = u.username === currentUser.username;

    // Do not remove the last Administrator
    const adminCount = users.filter(x => x.role === "admin").length;
    if (u.role === "admin" && role !== "admin" && adminCount === 1) {
      showUserError("There must be at least one Administrator.");
      return;
    }

    u.name = name;
    u.username = username;
    u.role = wasSelf ? u.role : role;
    if (password) u.password = password;

    // Keep the logged-in session in sync if you edited yourself
    if (wasSelf) {
      currentUser.name = u.name;
      currentUser.username = u.username;
      sessionStorage.setItem("currentUser", JSON.stringify(currentUser));
      updateUserBox();
    }
  } else {
    // ----- ADD -----
    if (!password) {
      showUserError("Password is required for a new user.");
      return;
    }
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    users.push({ id: newId, name: name, username: username, password: password, role: role });
  }

  setData("users", users);
  renderUsers();
  toast(id ? "User updated." : "User added.");
}

// ---------- Delete ----------
function deleteUser(id) {
  const users = getData("users", []);
  const u = users.find(item => item.id === id);
  if (!u) return;

  if (u.username === currentUser.username) {
    toast("You cannot delete your own account.", "error");
    return;
  }

  const adminCount = users.filter(x => x.role === "admin").length;
  if (u.role === "admin" && adminCount === 1) {
    toast("You cannot delete the last Administrator.", "error");
    return;
  }

  if (!confirm("Delete user \"" + u.name + "\"?")) return;

  setData("users", users.filter(item => item.id !== id));
  renderUsers();
  toast("User deleted.");
}