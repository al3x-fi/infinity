import { useCallback, useEffect, useState } from "react";
import { API } from "./profile";

/** Follows, followers and the activity feed. The server holds the data; every change is wallet-signed. */
export interface Brief { address: string; username: string | null; avatar: string | null }
export interface FeedEvent {
  id: string; actor: string; type: "position_opened" | "position_closed";
  pool: string | null; detail: string | null; ts: number; actorProfile: Brief;
}

const ALERTS_KEY = "infinity-alerts-off";
const seenKey = (a: string) => `infinity-feed-seen-${a.toLowerCase()}`;
const EVENT = "infinity-social-change";

export async function fetchCounts(address: string): Promise<{ following: number; followers: number } | null> {
  try { const r = await fetch(`${API}/counts/${address}`); return r.ok ? await r.json() : null; } catch { return null; }
}

export async function fetchList(kind: "following" | "followers", address: string): Promise<Brief[] | null> {
  try { const r = await fetch(`${API}/${kind}/${address}`); return r.ok ? (await r.json()).profiles : null; } catch { return null; }
}

export async function fetchFeed(address: string, since = 0): Promise<FeedEvent[] | null> {
  try { const r = await fetch(`${API}/feed/${address}?since=${since}`); return r.ok ? (await r.json()).events : null; } catch { return null; }
}

/** Signs a plain-text message in the wallet (free, no transaction) and applies the follow change. */
export async function setFollow(
  address: string, target: string, action: "follow" | "unfollow", sign: (message: string) => Promise<string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const issued = Date.now();
    const message = `INFINITY follow\nAddress: ${address.toLowerCase()}\nAction: ${action}\nTarget: ${target.toLowerCase()}\nIssued: ${issued}`;
    const signature = await sign(message);
    const r = await fetch(`${API}/follow`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, target, action, issued, signature }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j.error ?? "Could not update." };
    window.dispatchEvent(new Event(EVENT));
    return { ok: true };
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    return { ok: false, error: /reject|denied|cancel/i.test(msg) ? "Signature cancelled." : "Could not reach the server. Try again." };
  }
}

/** Lowercase addresses this wallet follows. */
export function useFollowing(address?: string) {
  const [list, setList] = useState<Brief[] | null>(null);
  const load = useCallback(() => {
    if (!address) return setList(null);
    fetchList("following", address).then(setList);
  }, [address]);
  useEffect(() => {
    load();
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, [load]);
  const set = new Set((list ?? []).map((p) => p.address.toLowerCase()));
  return { list, has: (a: string) => set.has(a.toLowerCase()), reload: load };
}

/* ---------- referrals ---------- */

export interface Referral extends Brief { ts: number }
export async function fetchReferrals(address: string): Promise<{ count: number; referred: Referral[]; referrer: Brief | null } | null> {
  try { const r = await fetch(`${API}/referrals/${address}`); return r.ok ? await r.json() : null; } catch { return null; }
}
export async function fetchLeaderboard(): Promise<{ leaders: (Brief & { count: number })[]; total: number } | null> {
  try { const r = await fetch(`${API}/leaderboard`); return r.ok ? await r.json() : null; } catch { return null; }
}

/* ---------- team messages and search ---------- */

export interface Announcement { id: string; title: string; body: string; ts: number }
const ANN_SEEN = "infinity-ann-seen";

export async function fetchAnnouncements(): Promise<Announcement[] | null> {
  try { const r = await fetch(`${API}/announcements`); return r.ok ? (await r.json()).announcements : null; } catch { return null; }
}
export const annSeen = () => { try { return Number(localStorage.getItem(ANN_SEEN) ?? 0) || 0; } catch { return 0; } };
export const markAnnSeen = () => { try { localStorage.setItem(ANN_SEEN, String(Date.now())); } catch { /* ignore */ } window.dispatchEvent(new Event(EVENT)); };
export const feedSeen = (address: string) => { try { return Number(localStorage.getItem(seenKey(address)) ?? 0) || 0; } catch { return 0; } };

export async function searchProfiles(q: string): Promise<Brief[]> {
  try { const r = await fetch(`${API}/search?q=${encodeURIComponent(q)}`); return r.ok ? (await r.json()).profiles : []; } catch { return []; }
}

/* ---------- in-app alerts ---------- */

export const alertsOn = () => { try { return localStorage.getItem(ALERTS_KEY) !== "1"; } catch { return true; } };
export function setAlerts(on: boolean) {
  try { if (on) localStorage.removeItem(ALERTS_KEY); else localStorage.setItem(ALERTS_KEY, "1"); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
}
export const markFeedSeen = (address: string) => {
  try { localStorage.setItem(seenKey(address), String(Date.now())); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
};

/** Number of new activity events from followed wallets since the Following page was last opened. */
export function useUnread(address?: string): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!address) return setN(0);
    let stale = false;
    const check = async () => {
      if (!alertsOn()) return !stale && setN(0);
      let seen = 0;
      try { seen = Number(localStorage.getItem(seenKey(address)) ?? 0) || 0; } catch { /* ignore */ }
      const ev = await fetchFeed(address, seen);
      if (!stale && ev) setN(ev.length);
    };
    check();
    const t = setInterval(check, 60_000);
    window.addEventListener(EVENT, check);
    return () => { stale = true; clearInterval(t); window.removeEventListener(EVENT, check); };
  }, [address]);
  return n;
}
