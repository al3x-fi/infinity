// Supabase backend for the admin wallet tracker. Schema and access rules: supabase-admin.sql.
// The anon key is public by design; the database's Row Level Security is what keeps data admin-only.
import { createClient } from "@supabase/supabase-js";
import type { NetworkKey } from "./rpc";
import type { ChainState } from "./rpc";
import type { TrackedWallet } from "./store";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const backendReady = Boolean(url && key);
export const supabase = backendReady ? createClient(url!, key!) : null;
const db = () => {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
};

const HISTORY = 100;

interface Row {
  id: number;
  network: NetworkKey;
  address: string;
  label: string;
  tags: string[];
  notes: string;
  ens: string | null;
  is_contract: boolean | null;
  delegated: boolean | null;
  last_checked: string | null;
  last_error: string | null;
  created_at: string;
  admin_wallet_snapshots?: { checked_at: string; wei: string; nonce: number }[];
}

const fromRow = (r: Row): TrackedWallet => ({
  id: r.id,
  network: r.network,
  address: r.address,
  label: r.label,
  tags: r.tags ?? [],
  notes: r.notes ?? "",
  ens: r.ens ?? undefined,
  isContract: r.is_contract ?? undefined,
  delegated: r.delegated ?? undefined,
  lastChecked: r.last_checked ? Date.parse(r.last_checked) : undefined,
  lastError: r.last_error ?? undefined,
  addedAt: Date.parse(r.created_at),
  history: (r.admin_wallet_snapshots ?? [])
    .map((s) => ({ t: Date.parse(s.checked_at), wei: s.wei, nonce: Number(s.nonce) }))
    .sort((a, b) => a.t - b.t),
});

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function isAdmin(): Promise<boolean> {
  return Boolean(check(await db().rpc("is_admin")));
}

export async function listWallets(): Promise<TrackedWallet[]> {
  const rows = check(
    await db()
      .from("admin_wallets")
      .select("*, admin_wallet_snapshots(checked_at, wei, nonce)")
      .order("created_at")
      .order("checked_at", { referencedTable: "admin_wallet_snapshots", ascending: false })
      .limit(HISTORY, { referencedTable: "admin_wallet_snapshots" }),
  );
  return (rows as Row[]).map(fromRow);
}

export interface NewWallet { network: NetworkKey; address: string; label: string; tags: string[]; notes: string; ens?: string }

/** Inserts wallets; ones already tracked (same network + address) are skipped. Returns only the new ones. */
export async function addWallets(ws: NewWallet[]): Promise<TrackedWallet[]> {
  if (!ws.length) return [];
  const rows = check(
    await db()
      .from("admin_wallets")
      .upsert(ws.map((w) => ({ ...w, ens: w.ens ?? null })), { onConflict: "network,address", ignoreDuplicates: true })
      .select(),
  );
  return (rows as Row[]).map(fromRow);
}

export async function updateWallet(id: number, patch: Partial<Pick<TrackedWallet, "label" | "tags" | "notes">>) {
  check(await db().from("admin_wallets").update(patch).eq("id", id));
}

export async function deleteWallet(id: number) {
  check(await db().from("admin_wallets").delete().eq("id", id));
}

/** Saves a balance check; a history point is added server-side only if something changed. */
export async function recordCheck(id: number, s: ChainState): Promise<{ changed: boolean; t: number }> {
  const r = check(
    await db().rpc("record_wallet_check", {
      p_wallet_id: id, p_wei: s.wei.toString(), p_nonce: s.nonce, p_is_contract: s.isContract, p_delegated: s.delegated,
    }),
  ) as { changed: boolean; checked_at: string };
  return { changed: r.changed, t: Date.parse(r.checked_at) };
}

export async function recordError(id: number, message: string) {
  check(await db().from("admin_wallets").update({ last_error: message, last_checked: new Date().toISOString() }).eq("id", id));
}
