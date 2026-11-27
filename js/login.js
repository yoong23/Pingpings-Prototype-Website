const loginForm = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");

// Already signed in? go straight to the system
if (sessionStorage.getItem("currentUser")) {
  window.location.href = "app.html";
}

function showLoginError(text) {
  errorMsg.textContent = text;
  errorMsg.classList.remove("hidden");
}

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  // Normal case: the server checks the username and password
  if (serverOnline) {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // Save who is logged in (cleared when the browser tab is closed)
        sessionStorage.setItem("authToken", data.token);
        sessionStorage.setItem("currentUser", JSON.stringify(data.user));
        window.location.href = "app.html";
      } else {
        showLoginError(data.error || "Invalid username or password.");
      }
    } catch (err) {
      showLoginError("Cannot reach the server. Please check the connection.");
    }
    return;
  }

  // Offline fallback (page opened without the server)
  const users = getData("users", []);
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    sessionStorage.setItem("currentUser", JSON.stringify({
      name: user.name,
      username: user.username,
      role: user.role
    }));
    window.location.href = "app.html";
  } else {
    showLoginError("Invalid username or password.");
  }
});

// Show / Hide password
const toggleBtn = document.getElementById("togglePassword");
const pwInput = document.getElementById("password");
toggleBtn.addEventListener("click", function () {
  const hidden = pwInput.type === "password";
  pwInput.type = hidden ? "text" : "password";
  toggleBtn.textContent = hidden ? "Hide" : "Show";
});
