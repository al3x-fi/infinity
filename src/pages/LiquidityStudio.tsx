import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { demoPools } from "../demo/data";
import { PageHero, Panel, Stat } from "../components/ui";
import ILCalculator from "../components/ILCalculator";
import ShareCard from "../components/ShareCard";
import { buildBins, fmtNum, requirements, type Strategy } from "../lib/liquidity";

const N = 12;
const strategies: { key: Strategy; label: string; blurb: string }[] = [
  { key: "spot", label: "Spot", blurb: "Even liquidity across the range." },
  { key: "curve", label: "Curve", blurb: "Weighted toward the current price." },
  { key: "bidask", label: "Bid-Ask", blurb: "Weighted toward the range edges." },
  { key: "custom", label: "Custom", blurb: "Set the weight of every bin yourself." },
];

export default function LiquidityStudio() {
  const [poolId, setPoolId] = useState(demoPools[0].id);
  const pool = demoPools.find((p) => p.id === poolId)!;
  const [strategy, setStrategy] = useState<Strategy>("curve");
  const [lowPct, setLowPct] = useState(-20);
  const [highPct, setHighPct] = useState(20);
  const [total, setTotal] = useState(1000);
  const [custom, setCustom] = useState<number[]>(Array(N).fill(1));

  const lower = pool.price * (1 + lowPct / 100);
  const upper = pool.price * (1 + highPct / 100);
  const valid = lower > 0 && upper > lower && total > 0;

  const bins = useMemo(
    () => (valid ? buildBins(strategy, lower, upper, pool.price, N, custom) : []),
    [valid, strategy, lower, upper, pool.price, custom],
  );
  const calc = useMemo(() => (valid ? requirements(bins, pool.price, total) : null), [valid, bins, pool.price, total]);

  const data = calc?.perBin.map((b) => ({
    price: Math.sqrt(b.lower * b.upper),
    pct: Number((b.weight * 100).toFixed(1)),
    below: Math.sqrt(b.lower * b.upper) < pool.price,
  }));

  return (
    <>
      <PageHero
        title="Liquidity Studio"
        intro="Shape a range and a distribution for any pool, then see how much of each token it needs. Everything here is a preview."
        stats={[
          ["Pool", pool.pair.join("/")],
          ["Shape", strategies.find((s) => s.key === strategy)!.label],
          ["Range", `${lowPct}% to +${highPct}%`],
          ["Deposit", `${fmtNum(total, 0)} ${pool.pair[1]}`],
        ]}
        note="Preview only. This page cannot create positions yet: it needs a wallet connection and a verified DEX position manager (Phases 3–4). Figures are estimates, not guarantees of any return."
      />
      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <Panel title="1 · Setup">
          <div className="space-y-3 text-sm">
            <label className="block">Pool
              <select className="mt-1 w-full" value={poolId} onChange={(e) => setPoolId(e.target.value)}>
                {demoPools.map((p) => <option key={p.id} value={p.id}>{p.pair.join("/")} · {p.dex} · {p.feeTier}%</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {strategies.map((s) => (
                <button key={s.key} onClick={() => setStrategy(s.key)}
                  className={`lift rounded-xl border p-3 text-left ${strategy === s.key ? "border-ink bg-ink/5 text-ink" : "border-line text-mute"}`}>
                  <div className="font-semibold">{s.label}</div>
                  <div className="text-xs">{s.blurb}</div>
                </button>
              ))}
            </div>
            <label className="block">Lower bound: {lowPct}% → {fmtNum(lower, 6)}
              <input type="range" min={-90} max={-1} value={lowPct} onChange={(e) => setLowPct(Number(e.target.value))} className="w-full" />
            </label>
            <label className="block">Upper bound: +{highPct}% → {fmtNum(upper, 6)}
              <input type="range" min={1} max={300} value={highPct} onChange={(e) => setHighPct(Number(e.target.value))} className="w-full" />
            </label>
            <label className="block">Total to deposit (in {pool.pair[1]})
              <input type="number" min={0} className="mt-1 w-full" value={total} onChange={(e) => setTotal(Number(e.target.value))} />
            </label>
          </div>
        </Panel>
        <Panel title="2 · Distribution preview">
          {calc && data ? (
            <>
              <div className="h-60">
                <ResponsiveContainer>
                  <BarChart data={data}>
                    <XAxis dataKey="price" tickFormatter={(v) => fmtNum(v, 4)} stroke="var(--color-mute)" fontSize={11} />
                    <YAxis unit="%" width={44} stroke="var(--color-mute)" />
                    <Tooltip formatter={(v) => `${v}% of liquidity`} labelFormatter={(v) => `Price ${fmtNum(Number(v), 6)}`}
                      contentStyle={{ background: "var(--color-panel)", border: "1px solid var(--color-line)" }} />
                    <ReferenceLine x={data.reduce((a, b) => Math.abs(b.price - pool.price) < Math.abs(a.price - pool.price) ? b : a).price} stroke="#fbbf24" label="now" />
                    <Bar dataKey="pct">
                      {data.map((d, i) => <Cell key={i} fill={d.below ? "var(--color-ink)" : "var(--color-mute)"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Current price" value={fmtNum(pool.price, 6)} />
                <Stat label="Lower / upper" value={`${fmtNum(lower, 4)} / ${fmtNum(upper, 4)}`} />
                <Stat label={`${pool.pair[0]} required`} value={fmtNum(calc.amount0, 6)} />
                <Stat label={`${pool.pair[1]} required`} value={fmtNum(calc.amount1, 2)} />
              </div>
              <p className="mt-3 text-xs text-mute">
                Cyan bins sit below the price (held as {pool.pair[1]}); violet bins sit above (held as {pool.pair[0]}).
                On a Uniswap-V3-style DEX each bin is a separate position NFT, so this plan would take {strategy === "spot" ? "1 mint" : `${N} mints`} and more gas.
              </p>
            </>
          ) : <p className="text-down">Invalid range or amount.</p>}
        </Panel>
      </div>
      {strategy === "custom" && (
        <Panel title="Custom bin weights">
          <div className="grid grid-cols-6 gap-2 md:grid-cols-12">
            {custom.map((w, i) => (
              <input key={i} type="number" min={0} step={0.5} value={w} className="w-full"
                onChange={(e) => setCustom(custom.map((x, j) => (j === i ? Math.max(0, Number(e.target.value)) : x)))} />
            ))}
          </div>
        </Panel>
      )}
      {valid && (
        <ILCalculator bins={bins} price={pool.price} total={total} quote={pool.pair[1]} base={pool.pair[0]} />
      )}
      <Panel title="Out-of-range risk">
        <p className="text-sm text-mute">
          If the price leaves your range, your position stops earning fees and is converted entirely into one token
          (the one that lost value). Narrow ranges earn more per dollar while in range but go out of range sooner.
          Fee income is not guaranteed and can be lower than losses from price movement.
        </p>
      </Panel>
      <Panel title="3 · Review &amp; confirm">
        {valid && (
          <div className="mb-3">
            <ShareCard pair={pool.pair as [string, string]} dex={pool.dex} shape={strategies.find((s) => s.key === strategy)!.label}
              lowPct={lowPct} highPct={highPct} price={pool.price} lower={lower} upper={upper} bins={bins} />
          </div>
        )}
        <button disabled className="rounded-lg border border-line px-4 py-2 text-mute"
          title="Disabled: no wallet or DEX position manager connected">
          Approve &amp; create position (unavailable in demo)
        </button>
      </Panel>
    </>
  );
}
