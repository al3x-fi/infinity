// INFINITY profiles + social API.
//  - Profiles: a username and a small picture per wallet.
//  - Follows: who follows whom, with counts.
//  - Feed: public activity events (for example "opened a position") for the wallets someone follows.
// Every write that acts for a wallet carries a signature, so only that wallet's owner can do it.
// No private keys are involved: the wallet signs a plain-text message in the user's own wallet app.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { verifyMessage, getAddress, isAddress } from "ethers";

const PORT = Number(process.env.PORT ?? 3101);
const FILE = process.env.DATA_FILE ?? "/var/lib/infinity-profiles/profiles.json";
const SOCIAL_FILE = process.env.SOCIAL_FILE ?? path.join(path.dirname(FILE), "social.json");
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN ?? ""; // empty = the event hook is disabled
const ORIGINS = new Set((process.env.ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const AVATAR_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
const MAX_AVATAR = 60_000;
const MAX_BODY = 100_000;
const SKEW_MS = 10 * 60 * 1000;
const MAX_FOLLOWS = 500;
const MAX_EVENTS = 5000;

/** @type {Record<string, {username: string, avatar: string|null, updated: number}>} keyed by lowercase address */
let profiles = {};
try { profiles = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { /* first run */ }

/** @type {{follows: Record<string, string[]>, lastIssued: Record<string, number>, events: any[], referrals: Record<string, {referrer: string, ts: number}>, announcements: any[]}} */
let social = { follows: {}, lastIssued: {}, events: [], referrals: {}, announcements: [] };
try { social = { ...social, ...JSON.parse(fs.readFileSync(SOCIAL_FILE, "utf8")) }; } catch { /* first run */ }

const byName = () => Object.fromEntries(Object.entries(profiles).map(([a, p]) => [p.username, a]));

function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}
const persist = () => write(FILE, profiles);
const persistSocial = () => write(SOCIAL_FILE, social);

// Very small per-IP limiter for writes.
const hits = new Map();
function limited(ip, max = 20) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  return list.length > max;
}

export const messageFor = (address, username, avatarHash, issued) =>
  `INFINITY profile\nAddress: ${address.toLowerCase()}\nUsername: ${username}\nAvatar: ${avatarHash}\nIssued: ${issued}`;
// Profile messages that also name the referrer (or "none"). Older clients send the message without it.
export const messageForV2 = (address, username, avatarHash, referrer, issued) =>
  `INFINITY profile
Address: ${address.toLowerCase()}
Username: ${username}
Avatar: ${avatarHash}
Referrer: ${referrer ?? "none"}
Issued: ${issued}`;

// A referrer code is a wallet address or a username. Returns a lowercase address, or null when unknown.
function resolveReferrer(code) {
  if (typeof code !== "string") return null;
  if (isAddress(code)) return code.toLowerCase();
  const c = code.toLowerCase();
  return USERNAME_RE.test(c) ? byName()[c] ?? null : null;
}

export const followMessage = (address, action, target, issued) =>
  `INFINITY follow\nAddress: ${address.toLowerCase()}\nAction: ${action}\nTarget: ${target.toLowerCase()}\nIssued: ${issued}`;

const send = (res, code, body, origin) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (origin && ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  res.writeHead(code, headers);
  res.end(JSON.stringify(body));
};

function readBody(req, res, origin, onJson) {
  let size = 0;
  const chunks = [];
  req.on("data", (c) => { size += c.length; if (size > MAX_BODY) req.destroy(); else chunks.push(c); });
  req.on("end", () => {
    try { onJson(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
    catch { send(res, 400, { error: "Bad request" }, origin); }
  });
}

const followers = (a) => Object.keys(social.follows).filter((w) => social.follows[w].includes(a));
const brief = (a) => ({ address: getAddress(a), username: profiles[a]?.username ?? null, avatar: profiles[a]?.avatar ?? null });

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
  const addrParam = () => (parts[1] && isAddress(parts[1]) ? parts[1].toLowerCase() : null);

  if (req.method === "GET" && parts[0] === "health") {
    return send(res, 200, { ok: true, profiles: Object.keys(profiles).length, events: social.events.length }, origin);
  }

  /* ---------- profiles ---------- */

  if (req.method === "GET" && parts[0] === "address" && parts[1]) {
    const a = addrParam();
    if (!a) return send(res, 400, { error: "Invalid address" }, origin);
    const p = profiles[a];
    return p ? send(res, 200, { address: getAddress(a), username: p.username, avatar: p.avatar }, origin) : send(res, 404, { error: "Not found" }, origin);
  }

  if (req.method === "GET" && parts[0] === "username" && parts[1]) {
    const name = parts[1].toLowerCase();
    if (!USERNAME_RE.test(name)) return send(res, 400, { error: "Invalid username" }, origin);
    const a = byName()[name];
    return a ? send(res, 200, { address: getAddress(a), username: name, avatar: profiles[a].avatar }, origin) : send(res, 404, { error: "Not found" }, origin);
  }

  // Many profiles at once: /profiles?addresses=0x..,0x..
  if (req.method === "GET" && parts[0] === "profiles") {
    const list = (url.searchParams.get("addresses") ?? "").split(",").filter((x) => isAddress(x)).slice(0, 100);
    return send(res, 200, { profiles: list.map((x) => brief(x.toLowerCase())) }, origin);
  }

  // Username search by prefix: /search?q=su
  if (req.method === "GET" && parts[0] === "search") {
    const q = (url.searchParams.get("q") ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    if (q.length < 2) return send(res, 200, { profiles: [] }, origin);
    const hits = Object.entries(profiles).filter(([, p]) => p.username.startsWith(q)).slice(0, 8).map(([a]) => brief(a));
    return send(res, 200, { profiles: hits }, origin);
  }

  if (req.method === "POST" && parts[0] === "profile") {
    if (limited(ip)) return send(res, 429, { error: "Too many updates. Try again in a few minutes." }, origin);
    return readBody(req, res, origin, (b) => {
      const { address, username, avatar = null, issued, signature } = b;
      const hasRef = Object.prototype.hasOwnProperty.call(b, "referrer");
      const referrer = typeof b.referrer === "string" ? b.referrer.slice(0, 60) : null;
      if (!isAddress(address)) return send(res, 400, { error: "Invalid address" }, origin);
      if (typeof username !== "string" || !USERNAME_RE.test(username)) return send(res, 400, { error: "Username must be 3 to 20 characters: a-z, 0-9, _" }, origin);
      if (avatar !== null && (typeof avatar !== "string" || avatar.length > MAX_AVATAR || !AVATAR_RE.test(avatar))) return send(res, 400, { error: "Picture must be a small JPEG" }, origin);
      if (typeof issued !== "number" || Math.abs(Date.now() - issued) > SKEW_MS) return send(res, 400, { error: "Signature expired. Try again." }, origin);
      if (typeof signature !== "string") return send(res, 400, { error: "Missing signature" }, origin);

      const hash = avatar ? crypto.createHash("sha256").update(avatar).digest("hex") : "none";
      let signer;
      try { signer = verifyMessage(hasRef ? messageForV2(address, username, hash, referrer, issued) : messageFor(address, username, hash, issued), signature); } catch { return send(res, 400, { error: "Bad signature" }, origin); }
      if (signer.toLowerCase() !== address.toLowerCase()) return send(res, 401, { error: "Signature does not match this wallet" }, origin);

      const owner = byName()[username];
      if (owner && owner !== address.toLowerCase()) return send(res, 409, { error: "That username is taken" }, origin);

      const me = address.toLowerCase();
      const isNew = !profiles[me];
      profiles[me] = { username, avatar, updated: Date.now() };
      persist();
      // A referral counts once, only when a brand-new profile is created, never for yourself.
      if (isNew && referrer && !social.referrals[me]) {
        const r = resolveReferrer(referrer);
        if (r && r !== me) { social.referrals[me] = { referrer: r, ts: Date.now() }; persistSocial(); }
      }
      return send(res, 200, { ok: true, address: getAddress(address), username, avatar }, origin);
    });
  }

  /* ---------- follows ---------- */

  if (req.method === "GET" && parts[0] === "counts") {
    const a = addrParam();
    if (!a) return send(res, 400, { error: "Invalid address" }, origin);
    return send(res, 200, { following: (social.follows[a] ?? []).length, followers: followers(a).length }, origin);
  }

  if (req.method === "GET" && (parts[0] === "following" || parts[0] === "followers")) {
    const a = addrParam();
    if (!a) return send(res, 400, { error: "Invalid address" }, origin);
    const list = (parts[0] === "following" ? social.follows[a] ?? [] : followers(a)).slice(0, 200);
    return send(res, 200, { count: list.length, profiles: list.map(brief) }, origin);
  }

  if (req.method === "POST" && parts[0] === "follow") {
    if (limited(ip, 40)) return send(res, 429, { error: "Too many follow changes. Try again in a few minutes." }, origin);
    return readBody(req, res, origin, (b) => {
      const { address, target, action, issued, signature } = b;
      if (!isAddress(address) || !isAddress(target)) return send(res, 400, { error: "Invalid address" }, origin);
      if (action !== "follow" && action !== "unfollow") return send(res, 400, { error: "Invalid action" }, origin);
      if (address.toLowerCase() === target.toLowerCase()) return send(res, 400, { error: "You cannot follow yourself" }, origin);
      if (typeof issued !== "number" || Math.abs(Date.now() - issued) > SKEW_MS) return send(res, 400, { error: "Signature expired. Try again." }, origin);
      if (typeof signature !== "string") return send(res, 400, { error: "Missing signature" }, origin);

      let signer;
      try { signer = verifyMessage(followMessage(address, action, target, issued), signature); } catch { return send(res, 400, { error: "Bad signature" }, origin); }
      const me = address.toLowerCase(), t = target.toLowerCase();
      if (signer.toLowerCase() !== me) return send(res, 401, { error: "Signature does not match this wallet" }, origin);
      // Each signed action must be newer than the last one, so an old signature cannot be replayed.
      if (issued <= (social.lastIssued[me] ?? 0)) return send(res, 409, { error: "Stale request. Try again." }, origin);

      const list = social.follows[me] ?? [];
      if (action === "follow" && !list.includes(t)) {
        if (list.length >= MAX_FOLLOWS) return send(res, 400, { error: `You can follow up to ${MAX_FOLLOWS} wallets.` }, origin);
        list.push(t);
      }
      if (action === "unfollow") list.splice(0, list.length, ...list.filter((x) => x !== t));
      social.follows[me] = list;
      social.lastIssued[me] = issued;
      persistSocial();
      return send(res, 200, { ok: true, following: list.includes(t), followers: followers(t).length }, origin);
    });
  }

  /* ---------- referrals ---------- */

  const referredBy = (a) => Object.entries(social.referrals).filter(([, v]) => v.referrer === a).map(([w, v]) => ({ wallet: w, ts: v.ts }));

  if (req.method === "GET" && parts[0] === "referrals") {
    const a = addrParam();
    if (!a) return send(res, 400, { error: "Invalid address" }, origin);
    const list = referredBy(a).sort((x, y) => y.ts - x.ts);
    return send(res, 200, { count: list.length, referred: list.slice(0, 50).map((x) => ({ ...brief(x.wallet), ts: x.ts })), referrer: social.referrals[a] ? brief(social.referrals[a].referrer) : null }, origin);
  }

  if (req.method === "GET" && parts[0] === "leaderboard") {
    const tally = {};
    for (const v of Object.values(social.referrals)) tally[v.referrer] = (tally[v.referrer] ?? 0) + 1;
    const top = Object.entries(tally).sort((x, y) => y[1] - x[1]).slice(0, 20).map(([a, n]) => ({ ...brief(a), count: n }));
    return send(res, 200, { leaders: top, total: Object.keys(social.referrals).length }, origin);
  }

  /* ---------- feed ---------- */

  // Public activity of the wallets `addr` follows. The activity itself is already public on chain.
  if (req.method === "GET" && parts[0] === "feed") {
    const a = addrParam();
    if (!a) return send(res, 400, { error: "Invalid address" }, origin);
    const since = Number(url.searchParams.get("since") ?? 0) || 0;
    const set = new Set(social.follows[a] ?? []);
    const events = social.events.filter((e) => set.has(e.actor) && e.ts > since).slice(-100).reverse();
    return send(res, 200, { events: events.map((e) => ({ ...e, actorProfile: brief(e.actor) })) }, origin);
  }

  // Messages from the INFINITY team, shown to everyone in the notification bell.
  if (req.method === "GET" && parts[0] === "announcements") {
    return send(res, 200, { announcements: (social.announcements ?? []).slice(-20).reverse() }, origin);
  }

  // Post or remove a team message. Same secret as the event hook; never exposed to the browser.
  if (req.method === "POST" && parts[0] === "internal" && (parts[1] === "announcement" || parts[1] === "announcement-delete")) {
    const token = String(req.headers["x-internal-token"] ?? "");
    const ok = INTERNAL_TOKEN.length >= 24 && token.length === INTERNAL_TOKEN.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(INTERNAL_TOKEN));
    if (!ok) return send(res, 403, { error: "Forbidden" }, origin);
    return readBody(req, res, origin, (b) => {
      social.announcements ??= [];
      if (parts[1] === "announcement-delete") {
        social.announcements = social.announcements.filter((a) => a.id !== b.id);
      } else {
        if (typeof b.title !== "string" || !b.title.trim() || typeof b.body !== "string") return send(res, 400, { error: "Need a title and body" }, origin);
        social.announcements.push({ id: crypto.randomUUID(), title: b.title.trim().slice(0, 100), body: b.body.trim().slice(0, 600), ts: Date.now() });
        if (social.announcements.length > 100) social.announcements.splice(0, social.announcements.length - 100);
      }
      persistSocial();
      return send(res, 200, { ok: true }, origin);
    });
  }

  // Hook for the future position detector. Disabled unless INTERNAL_TOKEN is set, and needs that token.
  if (req.method === "POST" && parts[0] === "internal" && parts[1] === "event") {
    const token = String(req.headers["x-internal-token"] ?? "");
    const ok = INTERNAL_TOKEN.length >= 24 && token.length === INTERNAL_TOKEN.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(INTERNAL_TOKEN));
    if (!ok) return send(res, 403, { error: "Forbidden" }, origin);
    return readBody(req, res, origin, (b) => {
      const { actor, type, pool = null, detail = null } = b;
      if (!isAddress(actor) || !["position_opened", "position_closed"].includes(type)) return send(res, 400, { error: "Bad event" }, origin);
      social.events.push({ id: crypto.randomUUID(), actor: actor.toLowerCase(), type, pool: typeof pool === "string" ? pool.slice(0, 80) : null, detail: typeof detail === "string" ? detail.slice(0, 200) : null, ts: Date.now() });
      if (social.events.length > MAX_EVENTS) social.events.splice(0, social.events.length - MAX_EVENTS);
      persistSocial();
      return send(res, 200, { ok: true }, origin);
    });
  }

  return send(res, 404, { error: "Not found" }, origin);
});

server.listen(PORT, "127.0.0.1", () => console.log(`profiles api on 127.0.0.1:${PORT}`));
