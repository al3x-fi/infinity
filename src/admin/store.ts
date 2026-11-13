// Wallet types and display helpers. Data itself lives in Supabase (see api.ts).
import { formatEther } from "ethers";
import type { NetworkKey } from "./rpc";

/** A recorded balance/nonce. A new one is only added when something changed. */
export interface Snapshot { t: number; wei: string; nonce: number }

export interface TrackedWallet {
  id: number;
  address: string;
  network: NetworkKey;
  label: string;
  tags: string[];
  notes: string;
  ens?: string;
  addedAt: number;
  isContract?: boolean;
  delegated?: boolean; // EIP-7702 smart account
  lastChecked?: number;
  lastError?: string;
  history: Snapshot[];
}

export const MAX_HISTORY = 100;

// The first version kept the watchlist in localStorage. These read it once so it can be uploaded.
const LEGACY_KEY = "infinity-admin-wallets";
export function loadLegacy(): { address: string; network: NetworkKey; label: string; tags: string[]; notes: string; ens?: string }[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export function clearLegacy() {
  try { localStorage.removeItem(LEGACY_KEY); } catch { /* blocked */ }
}

export const current = (w: TrackedWallet) => w.history[w.history.length - 1];

/** Change between the latest snapshot and the one before it. */
export function lastMove(w: TrackedWallet): { delta: bigint; t: number } | null {
  const n = w.history.length;
  if (n < 2) return null;
  return { delta: BigInt(w.history[n - 1].wei) - BigInt(w.history[n - 2].wei), t: w.history[n - 1].t };
}

export function fmtEth(wei: bigint | string, digits = 4) {
  const v = Number(formatEther(BigInt(wei)));
  return v.toLocaleString(undefined, { maximumFractionDigits: v !== 0 && Math.abs(v) < 0.0001 ? 8 : digits });
}

export function ago(t?: number) {
  if (!t) return "never";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

// ---- CSV ----

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCsv(ws: TrackedWallet[]) {
  const rows = [["label", "address", "network", "tags", "notes", "balance", "tx_count", "last_checked"]];
  for (const w of ws) {
    const c = current(w);
    rows.push([
      w.label, w.address, w.network, w.tags.join(";"), w.notes,
      c ? formatEther(BigInt(c.wei)) : "", c ? String(c.nonce) : "",
      w.lastChecked ? new Date(w.lastChecked).toISOString() : "",
    ]);
  }
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) out.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) out.push(row);
  return out;
}
