import { useState } from "react";
import type { DemoPool } from "../demo/data";
import type { Strategy } from "../lib/liquidity";

const strategies: { key: Strategy; name: string; tag: string; text: string }[] = [
  { key: "spot", name: "Spot", tag: "Simple", text: "Even liquidity across the whole range." },
  { key: "curve", name: "Curve", tag: "Concentrated", text: "Weighted toward the current price." },
  { key: "bidask", name: "Bid-Ask", tag: "Edges", text: "Weighted toward the range boundaries." },
  { key: "custom", name: "Custom", tag: "Advanced", text: "Your own range and weights (see Studio)." },
];

export interface FormState { strategy: Strategy; lowPct: number; highPct: number }

export default function PositionForm({
  pool, value, onChange,
}: { pool: DemoPool; value: FormState; onChange: (v: FormState) => void }) {
  const [a0, setA0] = useState("");
  const [a1, setA1] = useState("");
  const presets = [10, 25, 50];

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-2">
        {strategies.map((s) => (
          <button key={s.key} onClick={() => onChange({ ...value, strategy: s.key })}
            className={`rounded-xl border p-3 text-left ${value.strategy === s.key ? "border-cyan bg-cyan/10" : "border-line"}`}>
            <div className="font-semibold">{s.name} <span className="text-xs font-normal text-cyan">{s.tag}</span></div>
            <div className="mt-1 text-xs text-mute">{s.text}</div>
          </button>
        ))}
      </div>

      <div>
        <div className="mb-1 text-mute">Range around current price</div>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((p) => (
            <button key={p} onClick={() => onChange({ ...value, lowPct: -p, highPct: p })}
              className={`rounded-lg border px-2 py-2 ${value.lowPct === -p && value.highPct === p ? "border-cyan text-cyan" : "border-line text-mute"}`}>
              ±{p}%
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-mute">Liquidity</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-lg border border-line p-2">
            <input className="w-full border-0 p-0" placeholder="0.0" value={a0} onChange={(e) => setA0(e.target.value)} />
            <div className="text-right text-xs font-semibold">{pool.pair[0]}</div>
          </label>
          <label className="rounded-lg border border-line p-2">
            <input className="w-full border-0 p-0" placeholder="0.0" value={a1} onChange={(e) => setA1(e.target.value)} />
            <div className="text-right text-xs font-semibold">{pool.pair[1]}</div>
          </label>
        </div>
        <div className="mt-1 text-xs text-mute">Balance — (wallet not connected)</div>
      </div>

      <dl className="space-y-1 border-t border-line pt-3">
        <div className="flex justify-between"><dt className="text-mute">Pool LP fee</dt><dd>{pool.feeTier}%</dd></div>
        <div className="flex justify-between"><dt className="text-mute">INFINITY fee</dt><dd>0% (none charged)</dd></div>
        <div className="flex justify-between"><dt className="text-mute">Slippage / deadline</dt><dd>0.5% / 20 min (defaults)</dd></div>
        <div className="flex justify-between font-semibold"><dt>Traders pay</dt><dd className="text-cyan">{pool.feeTier}%</dd></div>
      </dl>

      <button disabled title="Needs wallet + verified DEX position manager (Phases 3–4)"
        className="w-full rounded-full bg-violet/30 py-3 font-semibold text-mute">
        Connect wallet (Phase 3)
      </button>
      <p className="text-xs text-mute">
        Preview only. If price leaves your range you stop earning fees. Returns are never guaranteed.
      </p>
    </div>
  );
}
