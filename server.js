// =====================================================
// Ping-Ping's Local Server (HTTPS + SQLite database + login)
// =====================================================
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const selfsigned = require("selfsigned");

const database = require("./db");   // the SQLite database (see db.js)

const PORT = 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const CERT_DIR = path.join(ROOT, "cert");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

// ---------- Local IP addresses (what the phone will type) ----------
function getLocalIPs() {
  const list = [];
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach(name => {
    nets[name].forEach(n => {
      if (n.family === "IPv4" && !n.internal) list.push(n.address);
    });
  });
  return list;
}

// ---------- HTTPS certificate ----------
// Best case: "mkcert" is installed -> the certificate is TRUSTED by the browser (no "Not secure" warning).
// Fallback:  no mkcert -> a self-signed certificate is made (works, but browsers show a warning).
const KEY_FILE = path.join(CERT_DIR, "key.pem");
const CERT_FILE = path.join(CERT_DIR, "cert.pem");
const INFO_FILE = path.join(CERT_DIR, "info.txt");   // remembers how/for what the certificate was made

// Find the mkcert program (PATH, the WinGet folder, or a mkcert.exe placed next to server.js)
function findMkcert() {
  const candidates = [
    "mkcert",
    path.join(ROOT, "mkcert.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links", "mkcert.exe")
  ];
  for (const exe of candidates) {
    try {
      const caRoot = execFileSync(exe, ["-CAROOT"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      if (caRoot && fs.existsSync(path.join(caRoot, "rootCA.pem"))) return { exe, caRoot };
    } catch (e) { /* try the next one */ }
  }
  return null;
}

function makeSelfSigned(names, ips) {
  const altNames = [{ type: 2, value: "localhost" }, { type: 7, ip: "127.0.0.1" }];
  ips.forEach(ip => altNames.push({ type: 7, ip: ip }));

  const pems = selfsigned.generate(
    [{ name: "commonName", value: "pingping.local" }],
    {
      days: 365,
      keySize: 2048,
      algorithm: "sha256",
      extensions: [{ name: "subjectAltName", altNames: altNames }]
    }
  );
  fs.writeFileSync(KEY_FILE, pems.private);
  fs.writeFileSync(CERT_FILE, pems.cert);
}

// Returns { key, cert, trusted, caRoot }
function getCert(ips) {
  fs.mkdirSync(CERT_DIR, { recursive: true });

  const mk = findMkcert();
  const names = ["localhost", "127.0.0.1", "::1"].concat(ips);
  const wanted = (mk ? "mkcert" : "selfsigned") + "|" + names.join(",");
  const current = fs.existsSync(INFO_FILE) ? fs.readFileSync(INFO_FILE, "utf8").trim() : "";
  const haveFiles = fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE);

  // (Re)make the certificate when it is missing, or the laptop's IP address / the method changed
  if (!haveFiles || current !== wanted) {
    if (mk) {
      execFileSync(mk.exe, ["-key-file", KEY_FILE, "-cert-file", CERT_FILE].concat(names), { stdio: "ignore" });
      console.log("New TRUSTED HTTPS certificate created (mkcert).");
    } else {
      makeSelfSigned(names, ips);
      console.log("New self-signed HTTPS certificate created.");
    }
    fs.writeFileSync(INFO_FILE, wanted);
  }

  return {
    key: fs.readFileSync(KEY_FILE),
    cert: fs.readFileSync(CERT_FILE),
    trusted: !!mk,
    caRoot: mk ? mk.caRoot : null
  };
}

// ---------- Helpers ----------
function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function readBody(req, callback) {
  let body = "";
  req.on("data", chunk => {
    body += chunk;
    if (body.length > 5 * 1024 * 1024) req.destroy();   // 5 MB limit
  });
  req.on("end", () => callback(body));
}

// ---------- Serve the website files ----------
function serveStatic(pathname, res) {
  if (pathname === "/") pathname = "/index.html";

  // Only the website files (pages, css, js, images) are public. server.js, data/ and cert/ are never served.
  const allowed =
    pathname === "/index.html" ||
    pathname === "/app.html" ||
    pathname.startsWith("/css/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/js/");

  const filePath = path.join(ROOT, pathname);
  const safe = filePath.startsWith(ROOT + path.sep);

  if (!allowed || !safe) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(content);
  });
}

// ---------- API (needs a login) ----------
const failedLogins = new Map();   // ip -> { count, until }

function sendError(res, e) {
  const status = e && e.status ? e.status : 400;
  sendJson(res, status, { error: e && e.message ? e.message : "Something went wrong." });
}

function getToken(req) {
  const header = req.headers["authorization"] || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function handleApi(req, res, pathname) {
  // POST /api/login  ->  check the username and password (the only API that needs no login)
  if (req.method === "POST" && pathname === "/api/login") {
    const ip = req.socket.remoteAddress || "";
    const record = failedLogins.get(ip);
    if (record && record.until > Date.now()) {
      sendJson(res, 429, { error: "Too many failed attempts. Please wait a minute and try again." });
      return;
    }

    readBody(req, body => {
      let data = {};
      try { data = JSON.parse(body); } catch (e) { /* treated as a failed login */ }
      const result = database.login(data.username, data.password);

      if (!result) {
        const count = (record ? record.count : 0) + 1;
        failedLogins.set(ip, { count: count, until: count >= 5 ? Date.now() + 60 * 1000 : 0 });
        if (count >= 5) failedLogins.set(ip, { count: 0, until: Date.now() + 60 * 1000 });
        sendJson(res, 401, { error: "Invalid username or password." });
        return;
      }
      failedLogins.delete(ip);
      sendJson(res, 200, result);
    });
    return;
  }

  // Every other API call needs a valid login
  const token = getToken(req);
  const session = database.getSession(token);
  if (!session) {
    sendJson(res, 401, { error: "Please log in." });
    return;
  }

  // POST /api/logout
  if (req.method === "POST" && pathname === "/api/logout") {
    database.logout(token);
    sendJson(res, 200, { ok: true });
    return;
  }

  // GET /api/db  ->  users, products and movements
  if (req.method === "GET" && pathname === "/api/db") {
    try {
      sendJson(res, 200, database.loadAll(session));
    } catch (e) {
      sendError(res, e);
    }
    return;
  }

  // PUT /api/db/batch  ->  products + movements saved together (Stock-In / Stock-Out)
  // PUT /api/db/<users|products|movements>  ->  save one list
  if (req.method === "PUT" && pathname.startsWith("/api/db/")) {
    const key = pathname.replace("/api/db/", "");
    if (!["users", "products", "movements", "batch"].includes(key)) {
      sendJson(res, 400, { error: "Unknown key" });
      return;
    }

    readBody(req, body => {
      try {
        const value = JSON.parse(body);
        if (key === "batch") database.saveBatch(value, session);
        else database.saveKey(key, value, session);
        sendJson(res, 200, { ok: true });
      } catch (e) {
        console.log("Save refused (" + key + "): " + (e && e.message));
        sendError(res, e instanceof SyntaxError ? new database.HttpError(400, "Invalid data.") : e);
      }
    });
    return;
  }

  // POST /api/confirmations  ->  QR scan: purchase YES / NO
  if (req.method === "POST" && pathname === "/api/confirmations") {
    readBody(req, body => {
      try {
        const id = database.addConfirmation(JSON.parse(body), session);
        sendJson(res, 200, { ok: true, id: id });
      } catch (e) {
        sendError(res, e instanceof SyntaxError ? new database.HttpError(400, "Invalid data.") : e);
      }
    });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

// ---------- Request handler ----------
function handle(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "https://localhost").pathname);
  } catch (e) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  // GET /PingPings-CA.crt  ->  the public certificate the phone must trust once (never the private key)
  if (req.method === "GET" && pathname === "/PingPings-CA.crt" && caRootFile && fs.existsSync(caRootFile)) {
    res.writeHead(200, {
      "Content-Type": "application/x-x509-ca-cert",
      "Content-Disposition": 'attachment; filename="PingPings-CA.crt"',
      "Cache-Control": "no-store"
    });
    res.end(fs.readFileSync(caRootFile));
    return;
  }

  // Everything under /api/ is handled separately (and needs a login, except /api/login)
  if (pathname.startsWith("/api/")) {
    handleApi(req, res, pathname);
    return;
  }

  if (req.method === "GET") {
    serveStatic(pathname, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
}

// ---------- Start ----------
const ips = getLocalIPs();
const dbNote = database.openDatabase(DATA_DIR);   // creates data/pingpings.db on the first run
if (dbNote) console.log(dbNote);
database.dailyBackup();
setInterval(database.dailyBackup, 6 * 60 * 60 * 1000);   // one automatic backup per day

const tls = getCert(ips);
const caRootFile = tls.caRoot ? path.join(tls.caRoot, "rootCA.pem") : null;

https.createServer({ key: tls.key, cert: tls.cert }, handle).listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("Ping-Ping's server is running.");
  console.log("  On this laptop:  https://localhost:" + PORT);
  ips.forEach(ip => console.log("  On the phone:    https://" + ip + ":" + PORT));
  console.log("");
  if (tls.trusted) {
    console.log("Secure: trusted certificate (mkcert). The laptop shows the padlock.");
    ips.forEach(ip => console.log("Phone, one time only: open https://" + ip + ":" + PORT + "/PingPings-CA.crt and install it."));
  } else {
    console.log("Browsers will say \"Not secure\" because the certificate is not trusted yet.");
    console.log("To fix it, run setup-secure.bat once (see README-SECURE.txt), then start the server again.");
  }
  console.log("");
  console.log("Database: data/pingpings.db (SQLite). Daily backups: data/backups");
  console.log("Press Ctrl+C to stop.");
});

// Close the database cleanly when the server is stopped
function shutdown() {
  database.closeDatabase();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
