import { useCallback, useEffect, useState } from "react";

/**
 * Username and picture for a wallet. The server (server/profiles) is the source of truth, so other
 * people can see them. A copy is kept in this browser so the page renders instantly and still works offline.
 */
export interface Profile { username: string; avatar: string | null }

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const API = (import.meta.env.VITE_PROFILE_API as string | undefined) ?? "https://infinity0.xyz/pf";
const EVENT = "infinity-profile-change";
const key = (a: string) => `infinity-profile-${a.toLowerCase()}`;
const skipKey = (a: string) => `infinity-profile-skip-${a.toLowerCase()}`;

/* ---------- local cache ---------- */

export function loadProfile(address: string): Profile | null {
  try {
    const v = JSON.parse(localStorage.getItem(key(address)) ?? "null");
    if (v && typeof v.username === "string" && USERNAME_RE.test(v.username)) {
      return { username: v.username, avatar: typeof v.avatar === "string" ? v.avatar : null };
    }
  } catch { /* ignore */ }
  return null;
}

function cache(address: string, p: Profile | null) {
  try {
    if (p) localStorage.setItem(key(address), JSON.stringify(p));
    else localStorage.removeItem(key(address));
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVENT));
}

export const wasSkipped = (a: string) => { try { return localStorage.getItem(skipKey(a)) === "1"; } catch { return false; } };
export const markSkipped = (a: string) => { try { localStorage.setItem(skipKey(a), "1"); window.dispatchEvent(new Event(EVENT)); } catch { /* ignore */ } };

/* ---------- server ---------- */

/** null = no profile; undefined = server could not be reached. */
export async function fetchProfile(address: string): Promise<Profile | null | undefined> {
  try {
    const r = await fetch(`${API}/address/${address}`);
    if (r.status === 404) return null;
    if (!r.ok) return undefined;
    const j = await r.json();
    return { username: j.username, avatar: j.avatar ?? null };
  } catch { return undefined; }
}

export async function fetchByUsername(name: string): Promise<{ address: string; profile: Profile } | null> {
  try {
    const r = await fetch(`${API}/username/${name.toLowerCase()}`);
    if (!r.ok) return null;
    const j = await r.json();
    return { address: j.address, profile: { username: j.username, avatar: j.avatar ?? null } };
  } catch { return null; }
}

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Signs a plain-text message in the user's wallet (no transaction, no cost) and saves the profile. */
export async function saveProfile(
  address: string, p: Profile, sign: (message: string) => Promise<string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const issued = Date.now();
    const hash = p.avatar ? await sha256(p.avatar) : "none";
    const message = `INFINITY profile\nAddress: ${address.toLowerCase()}\nUsername: ${p.username}\nAvatar: ${hash}\nIssued: ${issued}`;
    const signature = await sign(message);
    const r = await fetch(`${API}/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, username: p.username, avatar: p.avatar, issued, signature }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j.error ?? "Could not save your profile." };
    cache(address, p);
    return { ok: true };
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    return { ok: false, error: /reject|denied|cancel/i.test(msg) ? "Signature cancelled." : "Could not reach the server. Try again." };
  }
}

/** undefined while loading, null when the wallet has no profile. */
export function useProfile(address?: string): Profile | null | undefined {
  const [p, setP] = useState<Profile | null | undefined>(() => (address ? loadProfile(address) ?? undefined : null));
  const refresh = useCallback(() => {
    if (!address) return setP(null);
    const local = loadProfile(address);
    if (local) setP(local);
  }, [address]);

  useEffect(() => {
    if (!address) { setP(null); return; }
    let stale = false;
    setP(loadProfile(address) ?? undefined);
    fetchProfile(address).then((remote) => {
      if (stale) return;
      if (remote === undefined) setP(loadProfile(address)); // offline: fall back to the local copy
      else { cache(address, remote); setP(remote); }
    });
    window.addEventListener(EVENT, refresh);
    return () => { stale = true; window.removeEventListener(EVENT, refresh); };
  }, [address, refresh]);

  return p;
}

/** Centre-crops an image file to a small square JPEG data URL so it stays tiny. */
export function resizeImage(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Choose an image file."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      canvas.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
    img.src = url;
  });
}
