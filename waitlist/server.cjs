// Zero-dependency waitlist server. Serves the page and saves emails to data/emails.csv
// Run:  node server.cjs        (default http://localhost:3000, set PORT to change)
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const FILE = path.join(DATA_DIR, "emails.csv");
const STATIC = { "/": "index.html", "/index.html": "index.html", "/logo.png": "logo.png", "/logo-sm.png": "logo-sm.png", "/icon.png": "icon.png", "/og.png": "og.png" };
const TYPES = { ".html": "text/html; charset=utf-8", ".png": "image/png" };

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "joined_at,email\n");

const seen = new Set(
  fs.readFileSync(FILE, "utf8").split("\n").slice(1).map(l => l.split(",")[1]).filter(Boolean)
);

const hits = new Map(); // naive per-IP rate limit: 10 requests / minute
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 10;
}

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  // Allow the page to be hosted elsewhere (e.g. Vercel) and still post signups here.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  if (req.method === "POST" && url === "/api/join") {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    if (limited(ip)) return json(res, 429, { error: "Too many requests" });
    let body = "";
    req.on("data", c => { body += c; if (body.length > 2000) req.destroy(); });
    req.on("end", () => {
      let email;
      try { email = String(JSON.parse(body).email || "").trim().toLowerCase(); } catch (_) {}
      if (!email || email.length > 254 || !/^[^@\s,"]+@[^@\s,"]+\.[^@\s,"]+$/.test(email))
        return json(res, 400, { error: "Invalid email" });
      if (!seen.has(email)) {
        fs.appendFileSync(FILE, `${new Date().toISOString()},${email}\n`);
        seen.add(email);
      }
      json(res, 200, { ok: true });
    });
    return;
  }

  const file = req.method === "GET" && STATIC[url];
  if (file) {
    fs.readFile(path.join(ROOT, file), (err, data) => {
      if (err) { res.writeHead(404); return res.end("Not found"); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] });
      res.end(data);
    });
    return;
  }
  res.writeHead(404); res.end("Not found");
}).listen(PORT, process.env.HOST || "0.0.0.0", () => console.log(`Waitlist running on http://localhost:${PORT}\nEmails saved to ${FILE}`));
