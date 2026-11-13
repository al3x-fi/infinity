import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEther } from "ethers";
import type { Session } from "@supabase/supabase-js";
import { Badge, Notice, Panel, Stat } from "../components/ui";
import { short } from "../components/ConnectButton";
import { walletReady } from "../wallet/appkit";
import { NETWORKS, explorerUrl, fetchWallet, resolveInput, type NetworkKey } from "../admin/rpc";
import {
  MAX_HISTORY, ago, clearLegacy, current, fmtEth, lastMove, loadLegacy, parseCsv, toCsv, type TrackedWallet,
} from "../admin/store";
import * as api from "../admin/api";

type SortKey = "label" | "balance" | "moved" | "added";
const DAY = 86_400_000;
const AUTO_MS = 60_000;
const tip = { background: "var(--color-panel)", border: "1px solid var(--color-line)", fontSize: 12 };
const btn = "rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-ink/5 disabled:opacity-50";
const solid = "rounded-lg bg-violet px-3 py-1.5 text-sm font-medium disabled:opacity-50";
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/** Runs `fn` over items with at most `n` in flight, so public RPCs are not flooded. */
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!);
  }));
}

// ---------- access ----------

function Setup() {
  const code = "rounded bg-ink/5 px-1";
  return (
    <Panel title="Connect the admin database">
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>In your Supabase project, open <span className="font-medium">SQL Editor</span> and run <code className={code}>supabase-admin.sql</code> from the project folder.</li>
        <li>Under <span className="font-medium">Authentication → Users</span>, add a user with your email and a strong password. Then turn off public sign-ups under <span className="font-medium">Authentication → Sign In / Providers</span>.</li>
        <li>Make that user an admin by running the last line of the SQL file with your email.</li>
        <li>From <span className="font-medium">Project Settings → API</span>, add to <code className={code}>.env.local</code>:<br />
          <code className={code}>VITE_SUPABASE_URL=https://xxxx.supabase.co</code><br />
          <code className={code}>VITE_SUPABASE_ANON_KEY=your-anon-public-key</code></li>
        <li>Restart <code className={code}>npm run dev</code>. For the live site, add the same two variables in Vercel and redeploy.</li>
      </ol>
      <p className="mt-3 text-xs text-mute">The anon key is public by design. Never put the service_role key in this app.</p>
    </Panel>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await api.supabase!.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message);
  }
  return (
    <div className="mx-auto max-w-sm py-10">
      <Panel title="Admin sign in">
        <form onSubmit={submit} className="space-y-3">
          <input type="email" required autoComplete="username" placeholder="Email" className="w-full" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <input type="password" required autoComplete="current-password" placeholder="Password" className="w-full" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
          <button className={`${solid} w-full py-2`} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          {error && <p className="text-sm text-down">{error}</p>}
        </form>
      </Panel>
    </div>
  );
}

export default function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    const sb = api.supabase;
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  useEffect(() => {
    setAdmin(null);
    setAdminError("");
    if (!uid) return;
    api.isAdmin().then(setAdmin).catch((e) => { setAdmin(false); setAdminError(errText(e, "Could not check access")); });
  }, [uid]);

  if (!api.backendReady) {
    return (<><h1 className="text-2xl font-medium">Admin</h1><Setup /></>);
  }
  if (session === undefined || (session && admin === null)) return <p className="py-10 text-center text-sm text-mute">Loading…</p>;
  if (!session) return <Login />;
  if (!admin) {
    return (
      <div className="mx-auto max-w-md py-10">
        <Panel title="No admin access">
          <p className="text-sm">{session.user.email} is signed in but is not an admin.</p>
          {adminError && <p className="mt-2 text-sm text-down">{adminError}</p>}
          <p className="mt-2 text-xs text-mute">An existing admin can grant access by adding this account to admin_users (see supabase-admin.sql).</p>
          <button className={`${btn} mt-3`} onClick={() => api.supabase!.auth.signOut()}>Sign out</button>
        </Panel>
      </div>
    );
  }
  return <Tracker email={session.user.email ?? ""} />;
}

// ---------- tracker ----------

function Sparkline({ w }: { w: TrackedWallet }) {
  if (w.history.length < 2) return <span className="text-xs text-mute">—</span>;
  const data = w.history.map((s) => ({ v: Number(formatEther(BigInt(s.wei))) }));
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area dataKey="v" stroke="var(--color-ink)" fill="var(--color-ink)" fillOpacity={0.08} isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Delta({ w }: { w: TrackedWallet }) {
  const m = lastMove(w);
  if (!m) return <span className="text-xs text-mute">no change seen</span>;
  const sym = NETWORKS[w.network].symbol;
  const up = m.delta > 0n;
  return (
    <span className={`text-xs ${m.delta === 0n ? "text-mute" : up ? "text-up" : "text-down"}`} title={new Date(m.t).toLocaleString()}>
      {m.delta === 0n ? "nonce only" : `${up ? "+" : "−"}${fmtEth(up ? m.delta : -m.delta)} ${sym}`} · {ago(m.t)}
    </span>
  );
}

function AddConnected({ onAdd }: { onAdd: (input: string, n: NetworkKey, label: string) => void }) {
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  if (!isConnected || !address) return null;
  const n: NetworkKey = Number(chainId) === 11155111 ? "sepolia" : "mainnet";
  return (
    <button type="button" className={btn} onClick={() => onAdd(address, n, "My connected wallet")}>
      + Add connected wallet ({short(address)})
    </button>
  );
}

const splitTags = (s: string) => [...new Set(s.split(/[;,]/).map((t) => t.trim()).filter(Boolean))];

function Detail({ w, onSave, onClose, onRemove, onRefresh, busy }: {
  w: TrackedWallet;
  onSave: (patch: Partial<Pick<TrackedWallet, "label" | "tags" | "notes">>) => void;
  onClose: () => void;
  onRemove: () => void;
  onRefresh: () => void;
  busy: boolean;
}) {
  const sym = NETWORKS[w.network].symbol;
  const [copied, setCopied] = useState(false);
  const data = w.history.map((s) => ({ t: new Date(s.t).toLocaleString(), v: Number(formatEther(BigInt(s.wei))) }));
  return (
    <Panel title="Wallet details" right={<button onClick={onClose} className="text-xs text-mute hover:text-ink">Close</button>}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-xs text-mute">Label
            <input className="mt-1 w-full" defaultValue={w.label} maxLength={100}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== w.label) onSave({ label: v }); }} />
          </label>
          <label className="block text-xs text-mute">Tags (comma separated)
            <input className="mt-1 w-full" defaultValue={w.tags.join(", ")}
              onBlur={(e) => { const t = splitTags(e.target.value); if (t.join() !== w.tags.join()) onSave({ tags: t }); }} />
          </label>
          <label className="block text-xs text-mute">Notes (saved when you click away)
            <textarea className="mt-1 h-24 w-full rounded-lg border border-line bg-panel p-2 text-sm text-ink" defaultValue={w.notes} maxLength={5000}
              onBlur={(e) => { if (e.target.value !== w.notes) onSave({ notes: e.target.value }); }} />
          </label>
          <div className="break-all text-xs text-mute">
            {w.address}{w.ens && <> · {w.ens}</>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={() => { navigator.clipboard?.writeText(w.address); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
              {copied ? "Copied" : "Copy address"}
            </button>
            <a className={btn} href={explorerUrl(w.network, w.address)} target="_blank" rel="noreferrer">Explorer ↗</a>
            <button className={btn} onClick={onRefresh} disabled={busy}>{busy ? "Checking…" : "Refresh"}</button>
            <button className={`${btn} text-down`} onClick={() => { if (confirm(`Stop tracking ${w.label || w.address}? Its history will be deleted for all admins.`)) onRemove(); }}>Remove</button>
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs text-mute">Balance at each recorded change ({sym})</div>
          {data.length < 2 ? (
            <p className="text-sm text-mute">Not enough history yet. A point is recorded each time a refresh sees the balance or transaction count change.</p>
          ) : (
            <div className="h-44">
              <ResponsiveContainer>
                <AreaChart data={data}>
                  <XAxis dataKey="t" hide />
                  <YAxis width={70} stroke="var(--color-mute)" domain={["auto", "auto"]} tickFormatter={(v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 })} />
                  <Tooltip contentStyle={tip} />
                  <Area dataKey="v" name={sym} stroke="var(--color-ink)" fill="var(--color-ink)" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="mt-3 max-h-40 divide-y divide-line overflow-auto text-xs">
            {[...w.history].reverse().map((s, i, arr) => {
              const prev = arr[i + 1];
              const d = prev ? BigInt(s.wei) - BigInt(prev.wei) : null;
              return (
                <li key={s.t} className="flex justify-between gap-2 py-1.5">
                  <span className="text-mute">{new Date(s.t).toLocaleString()}</span>
                  <span>
                    {fmtEth(s.wei)} {sym} · {s.nonce} tx
                    {d !== null && d !== 0n && <span className={d > 0n ? "text-up" : "text-down"}> ({d > 0n ? "+" : "−"}{fmtEth(d > 0n ? d : -d)})</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

function Tracker({ email }: { email: string }) {
  const [wallets, setWallets] = useState<TrackedWallet[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ tone: "up" | "down"; text: string } | null>(null);
  const [legacy, setLegacy] = useState(loadLegacy);

  // add form
  const [input, setInput] = useState("");
  const [label, setLabel] = useState("");
  const [tags, setTags] = useState("");
  const [net, setNet] = useState<NetworkKey>("mainnet");
  const [adding, setAdding] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [fNet, setFNet] = useState<"all" | NetworkKey>("all");
  const [fTag, setFTag] = useState("all");
  const [sort, setSort] = useState<SortKey>("balance");
  const [auto, setAuto] = useState(false);
  const [, tick] = useState(0);

  const walletsRef = useRef<TrackedWallet[]>([]);
  walletsRef.current = wallets ?? [];

  const reload = useCallback(async () => {
    try {
      const ws = await api.listWallets();
      setWallets(ws);
      walletsRef.current = ws;
      setLoadError("");
    } catch (e) {
      setLoadError(errText(e, "Could not load wallets"));
      setWallets((w) => w ?? []);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  // Re-render every 30s so "x ago" labels stay current.
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(t); }, []);

  const patchLocal = (id: number, f: (w: TrackedWallet) => TrackedWallet) =>
    setWallets((ws) => ws && ws.map((w) => (w.id === id ? f(w) : w)));

  const refresh = useCallback(async (ids?: number[]) => {
    const targets = walletsRef.current.filter((w) => !ids || ids.includes(w.id));
    if (!targets.length) return;
    setBusy((b) => new Set([...b, ...targets.map((w) => w.id)]));
    await pool(targets, 4, async (w) => {
      try {
        let s;
        try {
          s = await fetchWallet(w.network, w.address);
        } catch (e) {
          const err = errText(e, "RPC error").slice(0, 200);
          patchLocal(w.id, (x) => ({ ...x, lastError: err, lastChecked: Date.now() }));
          await api.recordError(w.id, err).catch(() => {});
          return;
        }
        const r = await api.recordCheck(w.id, s);
        patchLocal(w.id, (x) => ({
          ...x,
          isContract: s.isContract,
          delegated: s.delegated,
          lastChecked: r.t,
          lastError: undefined,
          history: r.changed ? [...x.history, { t: r.t, wei: s.wei.toString(), nonce: s.nonce }].slice(-MAX_HISTORY) : x.history,
        }));
      } catch (e) {
        setMsg({ tone: "down", text: `Could not save check for ${w.label}: ${errText(e, "database error")}` });
      } finally {
        setBusy((b) => { const n = new Set(b); n.delete(w.id); return n; });
      }
    });
  }, []);

  useEffect(() => {
    if (!auto) return;
    const run = async () => { await reload(); await refresh(); };
    run();
    const t = setInterval(run, AUTO_MS);
    return () => clearInterval(t);
  }, [auto, reload, refresh]);

  /** Inserts new wallets, then fetches their balances. Returns how many were new. */
  const insert = useCallback(async (ws: api.NewWallet[]) => {
    const added = await api.addWallets(ws);
    if (added.length) {
      setWallets((cur) => [...(cur ?? []), ...added]);
      walletsRef.current = [...walletsRef.current, ...added];
      refresh(added.map((w) => w.id));
    }
    return added;
  }, [refresh]);

  const addWallet = useCallback(async (raw: string, n: NetworkKey, lbl: string, tagList: string[] = []) => {
    setMsg(null);
    try {
      const { address, ens } = await resolveInput(raw);
      const existing = walletsRef.current.find((w) => w.network === n && w.address === address);
      if (existing) {
        setMsg({ tone: "down", text: `${short(address)} on ${NETWORKS[n].name} is already tracked.` });
        setSelected(existing.id);
        return false;
      }
      const added = await insert([{ network: n, address, ens, label: lbl.trim() || ens || short(address), tags: tagList, notes: "" }]);
      if (!added.length) {
        setMsg({ tone: "down", text: "Another admin already added this wallet. Reloading." });
        reload();
        return false;
      }
      setMsg({ tone: "up", text: `Now tracking ${added[0].label}.` });
      return true;
    } catch (e) {
      setMsg({ tone: "down", text: errText(e, "Could not add wallet") });
      return false;
    }
  }, [insert, reload]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setAdding(true);
    const ok = await addWallet(input, net, label, splitTags(tags));
    setAdding(false);
    if (ok) { setInput(""); setLabel(""); setTags(""); }
  }

  async function bulkAdd(items: { raw: string; network: NetworkKey; label: string; tags: string[]; notes: string }[], source: string) {
    setMsg(null);
    const ok: api.NewWallet[] = [];
    let invalid = 0;
    for (const it of items) {
      try {
        const { address, ens } = await resolveInput(it.raw);
        ok.push({ network: it.network, address, ens, label: it.label.trim().slice(0, 100) || ens || short(address), tags: it.tags, notes: it.notes.slice(0, 5000) });
      } catch { invalid++; }
    }
    // De-duplicate within the batch, as the database rejects a batch that repeats a row.
    const unique = [...new Map(ok.map((w) => [`${w.network}:${w.address}`, w])).values()];
    try {
      const added = await insert(unique);
      const skipped = items.length - added.length - invalid;
      setMsg({
        tone: added.length ? "up" : "down",
        text: `${source}: added ${added.length}${skipped ? `, ${skipped} already tracked` : ""}${invalid ? `, ${invalid} invalid` : ""}.`,
      });
      return true;
    } catch (e) {
      setMsg({ tone: "down", text: `${source} failed: ${errText(e, "database error")}` });
      return false;
    }
  }

  const fileRef = useRef<HTMLInputElement>(null);
  async function onImport(file: File) {
    const rows = parseCsv(await file.text());
    const head = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
    const hasHeader = head.includes("address");
    const col = (name: string, fallback: number) => (hasHeader ? head.indexOf(name) : fallback);
    const [ci, cl, cn, ct, cno] = [col("address", 0), col("label", 1), col("network", 2), col("tags", 3), col("notes", 4)];
    await bulkAdd(rows.slice(hasHeader ? 1 : 0).map((r) => ({
      raw: r[ci] ?? "",
      network: r[cn]?.trim().toLowerCase() === "sepolia" ? "sepolia" : "mainnet",
      label: r[cl] ?? "",
      tags: splitTags(r[ct] ?? ""),
      notes: cno >= 0 ? r[cno] ?? "" : "",
    })), "Import");
  }

  async function uploadLegacy() {
    const ok = await bulkAdd(legacy.map((w) => ({ raw: w.address, network: w.network, label: w.label, tags: w.tags ?? [], notes: w.notes ?? "" })), "Upload");
    if (ok) { clearLegacy(); setLegacy([]); }
  }

  function onExport() {
    const blob = new Blob([toCsv(wallets ?? [])], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `infinity-wallets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function save(id: number, patch: Partial<Pick<TrackedWallet, "label" | "tags" | "notes">>) {
    patchLocal(id, (w) => ({ ...w, ...patch }));
    try {
      await api.updateWallet(id, patch);
    } catch (e) {
      setMsg({ tone: "down", text: `Not saved: ${errText(e, "database error")}` });
      reload();
    }
  }

  async function remove(id: number) {
    try {
      await api.deleteWallet(id);
      setWallets((ws) => ws && ws.filter((w) => w.id !== id));
      setSelected(null);
    } catch (e) {
      setMsg({ tone: "down", text: `Could not remove: ${errText(e, "database error")}` });
    }
  }

  const list = wallets ?? [];
  const allTags = useMemo(() => [...new Set(list.flatMap((w) => w.tags))].sort(), [list]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const bal = (w: TrackedWallet) => BigInt(current(w)?.wei ?? "0");
    return list
      .filter((w) => fNet === "all" || w.network === fNet)
      .filter((w) => fTag === "all" || w.tags.includes(fTag))
      .filter((w) => !s || [w.label, w.address, w.ens ?? "", w.notes, ...w.tags].some((v) => v.toLowerCase().includes(s)))
      .sort((a, b) => {
        if (sort === "label") return a.label.localeCompare(b.label);
        if (sort === "added") return b.addedAt - a.addedAt;
        if (sort === "moved") return (lastMove(b)?.t ?? 0) - (lastMove(a)?.t ?? 0);
        const d = bal(b) - bal(a);
        return d > 0n ? 1 : d < 0n ? -1 : 0;
      });
  }, [list, q, fNet, fTag, sort]);

  const stats = useMemo(() => {
    const total = (n: NetworkKey) => list.filter((w) => w.network === n).reduce((s, w) => s + BigInt(current(w)?.wei ?? "0"), 0n);
    const moved = list.filter((w) => { const m = lastMove(w); return m && Date.now() - m.t < DAY; }).length;
    const errors = list.filter((w) => w.lastError).length;
    const last = Math.max(0, ...list.map((w) => w.lastChecked ?? 0));
    return { main: total("mainnet"), sep: total("sepolia"), moved, errors, last };
  }, [list]);

  const sel = list.find((w) => w.id === selected);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium">Admin · Wallet tracker</h1>
          <p className="text-sm text-mute">
            Signed in as {email} · <button className="underline hover:text-ink" onClick={() => api.supabase!.auth.signOut()}>Sign out</button>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-mute">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="!p-0" />
            Auto-refresh (60s)
          </label>
          <button className={solid} onClick={() => refresh()} disabled={!list.length || busy.size > 0}>
            {busy.size ? `Checking ${busy.size}…` : "Refresh all"}
          </button>
        </div>
      </div>

      {loadError && <Notice>Could not load the watchlist: {loadError}</Notice>}
      {legacy.length > 0 && (
        <Notice>
          This browser still has {legacy.length} wallet{legacy.length === 1 ? "" : "s"} from before the database was set up.{" "}
          <button className="underline" onClick={uploadLegacy}>Upload them</button> or{" "}
          <button className="underline" onClick={() => { if (confirm("Discard the wallets saved in this browser?")) { clearLegacy(); setLegacy([]); } }}>discard</button>.
        </Notice>
      )}

      <Panel>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
          <Stat label="Wallets tracked" value={wallets ? String(list.length) : "…"} />
          <Stat label="Total ETH (mainnet)" value={fmtEth(stats.main)} />
          <Stat label="Total SepoliaETH" value={fmtEth(stats.sep)} />
          <Stat label="Moved in last 24h" value={String(stats.moved)} />
          <Stat label="Lookup errors" value={String(stats.errors)} />
          <Stat label="Last refresh" value={stats.last ? ago(stats.last) : "never"} />
        </div>
      </Panel>

      <Panel title="Track a wallet">
        <form onSubmit={onSubmit} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto_auto]">
          <input placeholder="0x… address or name.eth" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Address or ENS name" />
          <input placeholder="Label (optional)" value={label} maxLength={100} onChange={(e) => setLabel(e.target.value)} aria-label="Label" />
          <input placeholder="Tags, comma separated" value={tags} onChange={(e) => setTags(e.target.value)} aria-label="Tags" />
          <select value={net} onChange={(e) => setNet(e.target.value as NetworkKey)} aria-label="Network">
            {Object.entries(NETWORKS).map(([k, n]) => <option key={k} value={k}>{n.name}</option>)}
          </select>
          <button className={solid} disabled={adding || !input.trim()}>{adding ? "Adding…" : "Track"}</button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {walletReady && <AddConnected onAdd={(a, n, l) => addWallet(a, n, l)} />}
          <button className={btn} onClick={() => fileRef.current?.click()}>Import CSV</button>
          <button className={btn} onClick={onExport} disabled={!list.length}>Export CSV</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
          {msg && <span className={`text-sm ${msg.tone === "up" ? "text-up" : "text-down"}`}>{msg.text}</span>}
        </div>
        <p className="mt-2 text-xs text-mute">CSV columns: address, label, network (mainnet/sepolia), tags (separated by ;), notes. A header row is optional.</p>
      </Panel>

      {sel && (
        <Detail key={sel.id} w={sel} busy={busy.has(sel.id)}
          onSave={(p) => save(sel.id, p)} onClose={() => setSelected(null)}
          onRemove={() => remove(sel.id)} onRefresh={() => refresh([sel.id])} />
      )}

      <Panel title={`Watchlist (${shown.length}${shown.length !== list.length ? ` of ${list.length}` : ""})`}>
        <div className="mb-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          <input placeholder="Search label, address, tag, notes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          <select value={fNet} onChange={(e) => setFNet(e.target.value as "all" | NetworkKey)} aria-label="Filter network">
            <option value="all">All networks</option>
            {Object.entries(NETWORKS).map(([k, n]) => <option key={k} value={k}>{n.name}</option>)}
          </select>
          <select value={fTag} onChange={(e) => setFTag(e.target.value)} aria-label="Filter tag">
            <option value="all">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort">
            <option value="balance">Sort: balance</option>
            <option value="moved">Sort: most recent movement</option>
            <option value="label">Sort: label</option>
            <option value="added">Sort: newest added</option>
          </select>
        </div>

        {wallets === null ? (
          <p className="py-6 text-center text-sm text-mute">Loading…</p>
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-mute">No wallets tracked yet. Add an address or ENS name above, or import a CSV.</p>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-mute">No wallets match these filters.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-mute">
                  <th className="py-2 pr-3 font-normal">Wallet</th>
                  <th className="py-2 pr-3 font-normal">Network</th>
                  <th className="py-2 pr-3 text-right font-normal">Balance</th>
                  <th className="py-2 pr-3 text-right font-normal">Tx sent</th>
                  <th className="py-2 pr-3 font-normal">Last movement</th>
                  <th className="py-2 pr-3 font-normal">Trend</th>
                  <th className="py-2 font-normal">Checked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((w) => {
                  const c = current(w);
                  const isBusy = busy.has(w.id);
                  return (
                    <tr key={w.id} onClick={() => setSelected(w.id === selected ? null : w.id)}
                      className={`cursor-pointer hover:bg-ink/5 ${w.id === selected ? "bg-ink/5" : ""}`}>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{w.label}</div>
                        <div className="flex flex-wrap items-center gap-1 text-xs text-mute">
                          <span className="font-mono">{short(w.address)}</span>
                          {w.isContract && <Badge tone="warn">contract</Badge>}
                          {w.delegated && <span title="Regular wallet with an EIP-7702 delegation"><Badge>7702</Badge></span>}
                          {w.tags.map((t) => <Badge key={t}>{t}</Badge>)}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-mute">{NETWORKS[w.network].name}</td>
                      <td className="py-2 pr-3 text-right font-medium tabular-nums">
                        {c ? `${fmtEth(c.wei)} ${NETWORKS[w.network].symbol}` : <span className="text-mute">{isBusy ? "…" : "N/A"}</span>}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{c ? c.nonce : "—"}</td>
                      <td className="py-2 pr-3"><Delta w={w} /></td>
                      <td className="py-2 pr-3"><Sparkline w={w} /></td>
                      <td className="py-2 text-xs">
                        {isBusy ? <span className="text-mute">checking…</span>
                          : w.lastError ? <span className="text-down" title={w.lastError}>error · {ago(w.lastChecked)}</span>
                          : <span className="text-mute">{ago(w.lastChecked)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-mute">
          Shared by all admins. "Tx sent" is the account nonce (outgoing transactions). Movements are detected between refreshes, so changes
          that net to zero between two checks are not seen. Full transaction history needs an indexer or explorer API key.
        </p>
      </Panel>
    </>
  );
}
