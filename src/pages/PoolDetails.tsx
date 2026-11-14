import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { demoPools } from "../demo/data";
import { Badge, Panel } from "../components/ui";
import PositionForm, { type FormState } from "../components/PositionForm";
import SwapPanel from "../components/SwapPanel";
import StarButton from "../components/StarButton";
import { buildBins, fmtNum, fmtUsd } from "../lib/liquidity";

const tileBg = (id: string) => {
  const h = (Number(id) * 67 + 210) % 360;
  return `linear-gradient(135deg, hsl(${h} 30% 30%), hsl(${(h + 50) % 360} 35% 14%))`;
};

interface Candle { o: number; h: number; l: number; c: number }

/** Deterministic fabricated candles for the demo. */
function demoCandles(seed: number, n: number, base: number): Candle[] {
  const out: Candle[] = [];
  let p = base * 0.8;
  for (let i = 0; i < n; i++) {
    const r = (k: number) => { const x = Math.sin(seed * 77 + i * k) * 43758.5453; return x - Math.floor(x); };
    const o = p;
    const c = o * (1 + (r(12.9) - 0.45) * 0.05);
    out.push({ o, c, h: Math.max(o, c) * (1 + r(78.2) * 0.02), l: Math.min(o, c) * (1 - r(39.3) * 0.02) });
    p = c;
  }
  const k = base / out[out.length - 1].c; // end at the pool's current price
  return out.map((x) => ({ o: x.o * k, c: x.c * k, h: x.h * k, l: x.l * k }));
}

const W = 900, H = 360, CANDLE_END = 690, HIST_END = 820;

function Chart({ price, seed, form }: { price: number; seed: number; form: FormState }) {
  const candles = useMemo(() => demoCandles(seed, 40, price), [seed, price]);
  const lower = price * (1 + form.lowPct / 100);
  const upper = price * (1 + form.highPct / 100);
  const lo = Math.min(lower, ...candles.map((c) => c.l)) * 0.97;
  const hi = Math.max(upper, ...candles.map((c) => c.h)) * 1.03;
  const y = (v: number) => H - 24 - ((v - lo) / (hi - lo)) * (H - 48);
  const step = CANDLE_END / candles.length;
  const bins = buildBins(form.strategy, lower, upper, price, 40, Array(40).fill(1));
  const maxW = Math.max(...bins.map((b) => b.weight));
  const ticks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * i) / 3);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Demo price chart with liquidity distribution">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={0} x2={HIST_END} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={0.5} />
          <text x={HIST_END + 8} y={y(t) + 4} fill="var(--color-mute)" fontSize={11}>{fmtNum(t, 6)}</text>
        </g>
      ))}
      {candles.map((c, i) => {
        const up = c.c >= c.o, col = up ? "#34d399" : "#f87171", x = i * step + step / 2;
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={col} />
            <rect x={x - step * 0.3} width={step * 0.6} y={y(Math.max(c.o, c.c))} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill={col} opacity={0.85} />
          </g>
        );
      })}
      {bins.map((b, i) => {
        const mid = Math.sqrt(b.lower * b.upper);
        const top = y(b.upper), bottom = y(b.lower);
        return (
          <rect key={i} x={HIST_END - (b.weight / maxW) * 130} width={(b.weight / maxW) * 130}
            y={top} height={Math.max(1, bottom - top - 1)}
            fill={mid < price ? "#34d399" : "#60a5fa"} opacity={0.45} />
        );
      })}
      <line x1={0} x2={HIST_END} y1={y(price)} y2={y(price)} stroke="#fbbf24" strokeDasharray="4 3" />
      <rect x={HIST_END + 2} y={y(price) - 9} width={80} height={18} rx={3} fill="#fbbf24" />
      <text x={HIST_END + 6} y={y(price) + 4} fontSize={11} fill="#0b0e17">{fmtNum(price, 6)}</text>
      <line x1={0} x2={HIST_END} y1={y(lower)} y2={y(lower)} stroke="var(--color-mute)" strokeDasharray="3 3" />
      <text x={8} y={y(lower) - 5} fontSize={11} fill="var(--color-ink)">Min {fmtNum(lower, 6)} ({form.lowPct}%)</text>
      <line x1={0} x2={HIST_END} y1={y(upper)} y2={y(upper)} stroke="var(--color-mute)" strokeDasharray="3 3" />
      <text x={8} y={y(upper) + 14} fontSize={11} fill="var(--color-ink)">Max {fmtNum(upper, 6)} (+{form.highPct}%)</text>
    </svg>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const na = value === "N/A";
  return (
    <div>
      <div className="text-xs text-mute">{label}</div>
      <div className={`text-lg font-medium ${na ? "text-mute" : tone ?? ""}`} title={na ? "Unavailable — not the same as zero" : undefined}>{value}</div>
    </div>
  );
}

export default function PoolDetails() {
  const { id } = useParams();
  const pool = demoPools.find((p) => p.id === id);
  const [form, setForm] = useState<FormState>({ strategy: "curve", lowPct: -25, highPct: 25 });
  const [open, setOpen] = useState(false);
  if (!pool) return <p>Pool not found. <Link className="text-cyan" to="/discover">Back to Pools</Link></p>;

  const fees = pool.volume24hUsd === null ? null : (pool.volume24hUsd * pool.feeTier) / 100;
  const apr = fees === null || pool.tvlUsd === null ? null : (fees * 365 * 100) / pool.tvlUsd;

  return (
    <>
      <div className="text-sm text-mute"><Link to="/discover" className="hover:text-ink">Pools</Link> / {pool.pair.join(" – ")}</div>

      {/* Hero panel, same look as the Pools page */}
      <section className="rounded-3xl border border-line p-5 md:p-7"
        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--color-ink) 4%, var(--color-panel)), var(--color-panel))" }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-medium text-white" style={{ background: tileBg(pool.id) }}>
            {pool.pair[0].slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-medium md:text-4xl">{pool.pair[0]} / {pool.pair[1]}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge>{pool.feeTier}% fee</Badge>
              <Badge tone="violet">{pool.dex}</Badge>
              <Badge tone={pool.risk === "low" ? "up" : pool.risk === "high" ? "down" : "warn"}>risk: {pool.risk}</Badge>
              <Badge>Age {pool.ageDays}d</Badge>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <StarButton id={pool.id} className="border border-line" />
            <Link to="/studio" className="rounded-xl border border-line px-4 py-2 text-sm text-mute hover:text-ink">Simulate</Link>
            <button onClick={() => setOpen(true)} className="rounded-xl bg-violet px-4 py-2 text-sm font-medium">+ New position</button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {([["Price", fmtNum(pool.price, 6)], ["Liquidity", fmtUsd(pool.tvlUsd)], ["Volume 24h", fmtUsd(pool.volume24hUsd)], ["Fees 24h", fmtUsd(fees)],
            ["Fee APR", apr === null ? "N/A" : fmtNum(apr, 0) + "%"]] as [string, string][]).map(([l, v]) => (
            <div key={l} className="rounded-xl border border-line bg-bg/60 p-3">
              <div className="text-[11px] text-mute">{l}</div>
              <div className={`mt-0.5 text-lg font-medium ${v === "N/A" ? "text-mute" : l === "Fee APR" ? "text-up" : ""}`}
                title={v === "N/A" ? "Unavailable — not the same as zero" : undefined}>{v}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">

          <Panel title="Price and your liquidity shape (demo)">
            <div className="mb-2 text-2xl font-medium">{fmtNum(pool.price, 6)}</div>
            <div className="overflow-x-auto"><div className="min-w-[560px]"><Chart price={pool.price} seed={Number(pool.id)} form={form} /></div></div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-mute">
              <span><span className="text-up">■</span> Below price</span>
              <span><span className="text-blue-400">■</span> Above price</span>
              <span>· your {form.strategy} position preview, 40 bins</span>
            </div>
          </Panel>

          <Panel title="Safety checks">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {["Holders", "Top 10 holders", "Deployer", "Insiders", "Bundled buys", "Snipers", "Flagged wallets"].map((l) => <Metric key={l} label={l} value="N/A" />)}
            </div>
            <p className="mt-3 text-xs text-mute">Unavailable until a DEX adapter and indexer are connected. N/A is not the same as safe.</p>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Tick information"><p className="text-sm text-mute">N/A until a DEX adapter is connected.</p></Panel>
            <Panel title="Recent transactions &amp; positions"><p className="text-sm text-mute">N/A — requires the indexer (Phase 5).</p></Panel>
          </div>

          <Panel title="Contracts (demo placeholders)">
            <dl className="space-y-1 break-all font-mono text-xs text-mute">
              <div>Pool: {pool.address}</div>
              <div>{pool.pair[0]}: {pool.token0}</div>
              <div>{pool.pair[1]}: {pool.token1}</div>
            </dl>
          </Panel>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Panel title="Add liquidity">
            <PositionForm pool={pool} value={form} onChange={setForm} />
          </Panel>
          <Panel title="Swap"><SwapPanel pair={pool.pair} /></Panel>
        </aside>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-medium">New position</h2>
              <button onClick={() => setOpen(false)} className="text-mute hover:text-ink" aria-label="Close">✕</button>
            </div>
            <div className="mb-4 rounded-xl border border-line p-3">
              <div className="font-semibold">{pool.pair[0]} / {pool.pair[1]} <span className="text-xs font-normal text-mute">· {pool.dex}</span></div>
              <div className="text-xs text-mute">Price {fmtNum(pool.price, 6)} per {pool.pair[0]} · fee tier is fixed by the pool</div>
            </div>
            <PositionForm pool={pool} value={form} onChange={setForm} />
          </div>
        </div>
      )}
    </>
  );
}
