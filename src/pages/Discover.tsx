import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { demoPools, demoSeries, dexNames, feeTiers, type DemoPool } from "../demo/data";
import { Badge } from "../components/ui";
import { fmtNum, fmtUsd } from "../lib/liquidity";

// Demo-only extras (fabricated). null = unavailable.
const extra: Record<string, { holders: number | null; flags: number | null }> = {
  "1": { holders: 5120, flags: 0 },
  "2": { holders: 114, flags: 2 },
  "3": { holders: null, flags: 0 },
  "4": { holders: null, flags: null },
  "5": { holders: 980, flags: 1 },
};

type SortKey = "age" | "tvl" | "volume" | "feesTvl" | "apr";
type Tab = "all" | "low" | "new";
type View = "cards" | "table";

const feesOf = (p: DemoPool) => (p.volume24hUsd === null ? null : (p.volume24hUsd * p.feeTier) / 100);
const feesTvlOf = (p: DemoPool) => {
  const f = feesOf(p);
  return f === null || p.tvlUsd === null ? null : (f / p.tvlUsd) * 100;
};
const aprOf = (p: DemoPool) => {
  const r = feesTvlOf(p);
  return r === null ? null : r * 365;
};
const riskLabel = (r: DemoPool["risk"]) => (r === "unknown" ? "Risk unknown" : `${r[0].toUpperCase()}${r.slice(1)} risk`);

function Spark({ id }: { id: string }) {
  const s = demoSeries(Number(id), 24, 100, 8);
  const up = s[s.length - 1].v >= s[0].v;
  const c = up ? "#34d399" : "#f87171";
  return (
    <div className="h-9 w-28">
      <ResponsiveContainer>
        <AreaChart data={s}>
          <Area dataKey="v" stroke={c} fill={c + "26"} strokeWidth={1.5} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const hue = (id: string) => (Number(id) * 67 + 210) % 360;
const tileBg = (id: string) => `linear-gradient(135deg, hsl(${hue(id)} 30% 30%), hsl(${(hue(id) + 50) % 360} 35% 14%))`;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-medium">{value}</div>
      <div className="text-xs text-mute">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "up" | "mute" }) {
  return (
    <div className="rounded-xl border border-line bg-bg/60 p-3">
      <div className="text-[11px] text-mute">{label}</div>
      <div className={`mt-0.5 text-sm font-medium ${tone === "up" ? "text-up" : tone === "mute" ? "text-mute" : ""}`}>{value}</div>
    </div>
  );
}

function PoolCard({ p, onOpen }: { p: DemoPool; onOpen: () => void }) {
  const apr = aprOf(p);
  return (
    <button onClick={onOpen} className="lift group overflow-hidden rounded-2xl border border-line bg-panel text-left">
      <div className="relative flex h-32 items-center justify-center" style={{ background: tileBg(p.id) }}>
        <span className="text-5xl font-medium tracking-tight text-white/90 transition-transform duration-300 group-hover:scale-110">
          {p.pair[0].slice(0, 3).toUpperCase()}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white">Fee {p.feeTier}%</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate font-medium">{p.pair[0]}/{p.pair[1]}</div>
          <div className={`shrink-0 text-sm font-medium ${apr === null ? "text-mute" : "text-up"}`}>
            {apr === null ? "APR N/A" : `${fmtNum(apr, 0)}% APR`}
          </div>
        </div>
        <div className="text-xs text-mute">{p.dex} · {p.ageDays}d old</div>
        <div className="flex flex-wrap gap-1.5 text-[11px] text-mute">
          <span className="rounded-full border border-line px-2 py-0.5">{riskLabel(p.risk)}</span>
          <span className="rounded-full border border-line px-2 py-0.5">{p.feeTier}% fee tier</span>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
          <div>
            <div className="text-mute">Liquidity</div>
            <div className={p.tvlUsd === null ? "text-mute" : "font-medium"}>{fmtUsd(p.tvlUsd)}</div>
          </div>
          <div>
            <div className="text-mute">Volume 24h</div>
            <div className={p.volume24hUsd === null ? "text-mute" : "font-medium"}>{fmtUsd(p.volume24hUsd)}</div>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function Discover() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [dex, setDex] = useState("all");
  const [fee, setFee] = useState("all");
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<SortKey>("tvl");
  const [asc, setAsc] = useState(false);
  const [view, setView] = useState<View>("cards");
  const [showFilters, setShowFilters] = useState(false);
  const [feat, setFeat] = useState(0);

  // Featured card rotates through pools.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setFeat((i) => (i + 1) % demoPools.length), 4500);
    return () => clearInterval(t);
  }, []);

  const totals = useMemo(() => {
    const tvlKnown = demoPools.filter((p) => p.tvlUsd !== null);
    const volKnown = demoPools.filter((p) => p.volume24hUsd !== null);
    return {
      tvl: tvlKnown.reduce((s, p) => s + (p.tvlUsd ?? 0), 0),
      vol: volKnown.reduce((s, p) => s + (p.volume24hUsd ?? 0), 0),
      fees: volKnown.reduce((s, p) => s + (feesOf(p) ?? 0), 0),
    };
  }, []);

  const rows = useMemo(() => {
    const val = (p: DemoPool) =>
      sort === "age" ? p.ageDays : sort === "tvl" ? p.tvlUsd : sort === "volume" ? p.volume24hUsd : sort === "feesTvl" ? feesTvlOf(p) : aprOf(p);
    return demoPools
      .filter((p) => p.pair.join("/").toLowerCase().includes(q.toLowerCase()))
      .filter((p) => dex === "all" || p.dex === dex)
      .filter((p) => fee === "all" || p.feeTier === Number(fee))
      .filter((p) => tab === "all" || (tab === "low" ? p.risk === "low" : p.ageDays < 7))
      .sort((a, b) => {
        const x = val(a), y = val(b);
        if (x === null && y === null) return 0;
        if (x === null) return 1; // unavailable always last
        if (y === null) return -1;
        return asc ? x - y : y - x;
      });
  }, [q, dex, fee, tab, sort, asc]);

  const groups = useMemo(() => {
    const names = [...new Set(rows.map((p) => p.dex))];
    return names.map((name) => ({ name, pools: rows.filter((p) => p.dex === name) }));
  }, [rows]);

  const th = (key: SortKey, label: string) => (
    <th className="cursor-pointer px-3 py-3 text-right font-mono text-[11px] uppercase tracking-widest text-mute hover:text-ink"
      onClick={() => { if (sort === key) setAsc(!asc); else { setSort(key); setAsc(false); } }}>
      {label} {sort === key ? (asc ? "↑" : "↓") : "↕"}
    </th>
  );

  const fp = demoPools[feat];
  const fApr = aprOf(fp);
  const maxTvl = Math.max(...demoPools.map((x) => x.tvlUsd ?? 0));

  return (
    <>
      {/* Hero panel */}
      <section className="rounded-3xl border border-line p-5 md:p-8"
        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--color-ink) 4%, var(--color-panel)), var(--color-panel))" }}>
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="min-w-0">
            <div className="flex items-baseline gap-3">
              <h1 className="text-4xl font-medium md:text-5xl">Explore</h1>
              <span className="text-xs text-mute">{demoPools.length} pools</span>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-mute">
              Pools from the DEXs INFINITY has integrated, each with the range you can shape and the fees it earns. Pick one,
              choose a distribution, and review everything before you sign.
            </p>
            <input className="mt-5 w-full max-w-md" placeholder="Search pairs" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
              <Stat label="Total value locked" value={fmtUsd(totals.tvl)} />
              <Stat label="Volume 24h" value={fmtUsd(totals.vol)} />
              <Stat label="Fees 24h" value={fmtUsd(totals.fees)} />
            </div>
          </div>

          {/* Featured pool */}
          <div className="flex items-stretch gap-3">
            <button onClick={() => nav(`/pool/${fp.id}`)} key={fp.id}
              className="page-in lift min-w-0 flex-1 rounded-2xl border border-line bg-panel p-4 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-medium text-white" style={{ background: tileBg(fp.id) }}>
                  {fp.pair[0].slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{fp.pair[0]}/{fp.pair[1]}</div>
                  <div className="text-xs text-mute">{fp.dex} · Fee {fp.feeTier}%</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniStat label="Liquidity" value={fmtUsd(fp.tvlUsd)} tone={fp.tvlUsd === null ? "mute" : undefined} />
                <MiniStat label="Volume 24h" value={fmtUsd(fp.volume24hUsd)} tone={fp.volume24hUsd === null ? "mute" : undefined} />
                <MiniStat label="APR 24h" value={fApr === null ? "N/A" : `${fmtNum(fApr, 0)}%`} tone={fApr === null ? "mute" : "up"} />
              </div>
            </button>
            <div className="flex flex-col items-center justify-center gap-2">
              {demoPools.map((x, i) => (
                <button key={x.id} aria-label={`Show ${x.pair.join("/")}`} onClick={() => setFeat(i)}
                  className={`w-1.5 rounded-full transition-all ${i === feat ? "h-6 bg-ink" : "h-1.5 bg-line hover:bg-mute"}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-panel p-1 text-sm">
          {([["all", "All"], ["low", "Low risk"], ["new", "New"]] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-lg px-4 py-1.5 ${tab === k ? "bg-ink text-bg" : "text-mute hover:text-ink"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-mute">
            Sort by
            <select value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setAsc(false); }}>
              <option value="tvl">Liquidity</option>
              <option value="volume">Volume 24h</option>
              <option value="apr">APR 24h</option>
              <option value="feesTvl">Fees/TVL</option>
              <option value="age">Newest</option>
            </select>
          </label>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`rounded-xl border border-line px-4 py-2 text-sm ${showFilters ? "bg-ink/5" : ""}`}>
            Filters {showFilters ? "▴" : "▾"}
          </button>
          <div className="flex rounded-xl border border-line bg-panel p-1 text-sm">
            {(["cards", "table"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1 capitalize ${view === v ? "bg-ink text-bg" : "text-mute hover:text-ink"}`}>
                {v}
              </button>
            ))}
          </div>
          <Link to="/studio" className="rounded-xl bg-violet px-4 py-2 text-sm font-medium">+ New position</Link>
        </div>
        {showFilters && (
          <div className="page-in flex w-full flex-wrap gap-2 rounded-xl border border-line bg-panel p-3">
            <select value={dex} onChange={(e) => setDex(e.target.value)}>
              <option value="all">All venues</option>
              {dexNames.map((d) => <option key={d}>{d}</option>)}
            </select>
            <select value={fee} onChange={(e) => setFee(e.target.value)}>
              <option value="all">All fee tiers</option>
              {feeTiers.map((f) => <option key={f} value={f}>{f}%</option>)}
            </select>
          </div>
        )}
      </div>

      {rows.length === 0 && <p className="rounded-xl border border-line bg-panel p-6 text-mute">No pools match.</p>}

      {view === "cards" &&
        groups.map((g) => (
          <section key={g.name} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium">On {g.name}</h2>
              <span className="rounded-full border border-line px-2 py-0.5 text-xs text-mute">{g.pools.length}</span>
            </div>
            <p className="text-sm text-mute">Demo adapter. Replaced by real pools once a DEX is verified and integrated.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {g.pools.map((p) => <PoolCard key={p.id} p={p} onOpen={() => nav(`/pool/${p.id}`)} />)}
            </div>
          </section>
        ))}

      {view === "table" && rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-line bg-panel">
          <ul className="md:hidden">
            {rows.map((p) => {
              const apr = aprOf(p);
              return (
                <li key={p.id} onClick={() => nav(`/pool/${p.id}`)}
                  className="flex cursor-pointer items-center gap-3 border-b border-line/60 px-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-medium text-white" style={{ background: tileBg(p.id) }}>
                    {p.pair[0].slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.pair[0]}/{p.pair[1]}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge>{p.feeTier}%</Badge>
                      <Badge tone="violet">{p.dex}</Badge>
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <div className={p.tvlUsd === null ? "text-mute" : "font-medium"}>{fmtUsd(p.tvlUsd)}</div>
                    <div className="mt-1 h-1 rounded bg-line">
                      {p.tvlUsd !== null && <div className="h-1 rounded bg-ink" style={{ width: `${Math.max(4, (p.tvlUsd / maxTvl) * 100)}%` }} />}
                    </div>
                  </div>
                  <div className={`w-14 text-right text-sm ${apr === null ? "text-mute" : "text-up"}`}>
                    {apr === null ? "N/A" : fmtNum(apr, 0) + "%"}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="px-3 py-3 text-left font-mono text-[11px] uppercase tracking-widest text-mute">Pool</th>
                  {th("age", "Age")}
                  {th("tvl", "Liquidity")}
                  {th("volume", "Volume 24h")}
                  {th("feesTvl", "Fees/TVL 24h")}
                  {th("apr", "APR 24h")}
                  <th className="px-3 py-3 text-right font-mono text-[11px] uppercase tracking-widest text-mute">Chart</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const e = extra[p.id];
                  const ft = feesTvlOf(p), apr = aprOf(p);
                  return (
                    <tr key={p.id} onClick={() => nav(`/pool/${p.id}`)} className="cursor-pointer border-b border-line/60">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{p.pair[0]}/{p.pair[1]}</span>
                          <Badge>Fee {p.feeTier}%</Badge>
                          <Badge tone="violet">{p.dex}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-mute">
                          <span className={e?.flags === 0 ? "text-up" : e?.flags ? "text-warn" : ""}>●</span>{" "}
                          {e?.flags == null ? "Safety data unavailable" : e.flags === 0 ? "No safety flags" : `${e.flags} safety flag(s)`}
                          {" · "}{e?.holders == null ? "holders N/A" : `${e.holders.toLocaleString()} holders`}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">{p.ageDays}d</td>
                      <td className={`px-3 py-3 text-right ${p.tvlUsd === null ? "text-mute" : "font-semibold"}`}>{fmtUsd(p.tvlUsd)}</td>
                      <td className={`px-3 py-3 text-right ${p.volume24hUsd === null ? "text-mute" : "font-semibold"}`}>{fmtUsd(p.volume24hUsd)}</td>
                      <td className="px-3 py-3 text-right text-up">{ft === null ? <span className="text-mute">N/A</span> : fmtNum(ft, 2) + "%"}</td>
                      <td className="px-3 py-3 text-right text-up">{apr === null ? <span className="text-mute">N/A</span> : fmtNum(apr, 0) + "%"}</td>
                      <td className="px-3 py-3"><div className="ml-auto w-28"><Spark id={p.id} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-mute">
        Demo data. APR is a naive projection of 24h fees and can differ greatly from real returns. N/A means the metric is unavailable, not zero.
      </p>
    </>
  );
}
