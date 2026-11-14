// INFINITY profiles API. Stores a username and a small picture per wallet.
// Writes must carry a wallet signature, so only the owner of an address can change its profile.
// No private keys are ever involved: the wallet signs a plain-text message in the user's own wallet app.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { verifyMessage, getAddress, isAddress } from "ethers";

const PORT = Number(process.env.PORT ?? 3101);
const FILE = process.env.DATA_FILE ?? "/var/lib/infinity-profiles/profiles.json";
const ORIGINS = new Set((process.env.ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const AVATAR_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
const MAX_AVATAR = 60_000;
const MAX_BODY = 100_000;
const SKEW_MS = 10 * 60 * 1000;

/** @type {Record<string, {username: string, avatar: string|null, updated: number}>} keyed by lowercase address */
let profiles = {};
try { profiles = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { /* first run */ }

const byName = () => Object.fromEntries(Object.entries(profiles).map(([a, p]) => [p.username, a]));

function persist() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(profiles));
  fs.renameSync(tmp, FILE);
}

// Very small per-IP limiter for writes.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 20;
}

export const messageFor = (address, username, avatarHash, issued) =>
  `INFINITY profile\nAddress: ${address.toLowerCase()}\nUsername: ${username}\nAvatar: ${avatarHash}\nIssued: ${issued}`;

const send = (res, code, body, origin) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (origin && ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  res.writeHead(code, headers);
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...(origin && ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    });
    return res.end();
  }

  const url = new URL(req.url ?? "/", "http://x");
  const parts = url.pathname.split("/").filter(Boolean);

  if (req.method === "GET" && parts[0] === "health") return send(res, 200, { ok: true, profiles: Object.keys(profiles).length }, origin);

  if (req.method === "GET" && parts[0] === "address" && parts[1]) {
    if (!isAddress(parts[1])) return send(res, 400, { error: "Invalid address" }, origin);
    const a = parts[1].toLowerCase();
    const p = profiles[a];
    return p ? send(res, 200, { address: getAddress(a), username: p.username, avatar: p.avatar }, origin) : send(res, 404, { error: "Not found" }, origin);
  }

  if (req.method === "GET" && parts[0] === "username" && parts[1]) {
    const name = parts[1].toLowerCase();
    if (!USERNAME_RE.test(name)) return send(res, 400, { error: "Invalid username" }, origin);
    const a = byName()[name];
    return a ? send(res, 200, { address: getAddress(a), username: name, avatar: profiles[a].avatar }, origin) : send(res, 404, { error: "Not found" }, origin);
  }

  if (req.method === "POST" && parts[0] === "profile") {
    if (limited(ip)) return send(res, 429, { error: "Too many updates. Try again in a few minutes." }, origin);
    let size = 0;
    const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > MAX_BODY) req.destroy(); else chunks.push(c); });
    req.on("end", () => {
      try {
        const b = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const { address, username, avatar = null, issued, signature } = b;
        if (!isAddress(address)) return send(res, 400, { error: "Invalid address" }, origin);
        if (typeof username !== "string" || !USERNAME_RE.test(username)) return send(res, 400, { error: "Username must be 3 to 20 characters: a-z, 0-9, _" }, origin);
        if (avatar !== null && (typeof avatar !== "string" || avatar.length > MAX_AVATAR || !AVATAR_RE.test(avatar))) return send(res, 400, { error: "Picture must be a small JPEG" }, origin);
        if (typeof issued !== "number" || Math.abs(Date.now() - issued) > SKEW_MS) return send(res, 400, { error: "Signature expired. Try again." }, origin);
        if (typeof signature !== "string") return send(res, 400, { error: "Missing signature" }, origin);

        const hash = avatar ? crypto.createHash("sha256").update(avatar).digest("hex") : "none";
        const signer = verifyMessage(messageFor(address, username, hash, issued), signature);
        if (signer.toLowerCase() !== address.toLowerCase()) return send(res, 401, { error: "Signature does not match this wallet" }, origin);

        const owner = byName()[username];
        if (owner && owner !== address.toLowerCase()) return send(res, 409, { error: "That username is taken" }, origin);

        profiles[address.toLowerCase()] = { username, avatar, updated: Date.now() };
        persist();
        return send(res, 200, { ok: true, address: getAddress(address), username, avatar }, origin);
      } catch {
        return send(res, 400, { error: "Bad request" }, origin);
      }
    });
    return;
  }

  return send(res, 404, { error: "Not found" }, origin);
});

server.listen(PORT, "127.0.0.1", () => console.log(`profiles api on 127.0.0.1:${PORT}`));
