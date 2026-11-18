import { useMemo, useState } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel } from "./ui";
import { fmtNum, lpVsHold, type Bin } from "../lib/liquidity";

const tip = { background: "var(--color-panel)", border: "1px solid var(--color-line)" };
const pct = (v: number, d = 1) => `${v >= 0 ? "+" : ""}${fmtNum(v, d)}%`;

/** How much a range position is worth against simply holding the same tokens, if the price moves. Fees are not included. */
export default function ILCalculator({ bins, price, total, quote, base }: { bins: Bin[]; price: number; total: number; quote: string; base: string }) {
  const [move, setMove] = useState(50); // % change of the price
  const lower = bins[0]?.lower ?? price, upper = bins[bins.length - 1]?.upper ?? price;

  const curve = useMemo(
    () => Array.from({ length: 61 }, (_, i) => {
      const m = -80 + (i * 380) / 60; // -80% .. +300%
      const r = lpVsHold(bins, price, total, price * (1 + m / 100));
      return { m: Math.round(m), il: Number((r.il * 100).toFixed(2)) };
    }),
    [bins, price, total],
  );

  const target = price * (1 + move / 100);
  const r = lpVsHold(bins, price, total, target);
  const inRange = target >= lower && target <= upper;
  const diff = r.lp - r.hold;
  const scenarios = [-50, -25, 25, 50, 100];

  return (
    <Panel title="Impermanent loss">
      <p className="text-sm text-mute">
        If the price of {base} (in {quote}) changes, your range position can end up worth less than just holding the same tokens.
        That gap is impermanent loss. It does not count the trading fees you earn, which can make up for it or not.
      </p>

      <div className="mt-4 rounded-xl border border-line bg-bg/60 p-4">
        <label className="block text-sm">
          If the price becomes <span className="font-medium">{fmtNum(target, 6)}</span>{" "}
          <span className="text-mute">({pct(move, 0)} from {fmtNum(price, 6)})</span>
          <input type="range" min={-80} max={300} step={1} value={move} onChange={(e) => setMove(Number(e.target.value))} className="mt-2 w-full" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Position value", `${fmtNum(r.lp, 2)} ${quote}`],
            ["If you just held", `${fmtNum(r.hold, 2)} ${quote}`],
            ["Difference", `${diff >= 0 ? "+" : ""}${fmtNum(diff, 2)} ${quote}`],
            ["Impermanent loss", pct(r.il * 100, 2)],
          ].map(([l, v]) => (
            <div key={l}>
              <div className="text-xs text-mute">{l}</div>
              <div className="font-medium">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-mute">
          {inRange ? "The price stays inside your range, so you keep earning fees." : "The price is outside your range: you earn no fees and hold only one token."}
        </p>
      </div>

      <div className="mt-4 h-52">
        <ResponsiveContainer>
          <AreaChart data={curve}>
            <XAxis dataKey="m" tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`} stroke="var(--color-mute)" fontSize={11} />
            <YAxis unit="%" width={48} stroke="var(--color-mute)" fontSize={11} />
            <Tooltip contentStyle={tip} formatter={(v) => `${v}%`} labelFormatter={(v) => `Price ${Number(v) > 0 ? "+" : ""}${v}%`} />
            <ReferenceLine x={Math.round(move)} stroke="var(--color-warn)" strokeDasharray="4 3" />
            <Area dataKey="il" stroke="var(--color-down)" fill="var(--color-down)" fillOpacity={0.15} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="text-left text-xs text-mute">
            <tr><th className="py-1.5 font-normal">Price moves</th><th className="font-normal">Position</th><th className="font-normal">Held</th><th className="font-normal">Impermanent loss</th></tr>
          </thead>
          <tbody>
            {scenarios.map((m) => {
              const s = lpVsHold(bins, price, total, price * (1 + m / 100));
              return (
                <tr key={m} className="border-t border-line/60">
                  <td className="py-1.5">{pct(m, 0)}</td>
                  <td>{fmtNum(s.lp, 2)}</td>
                  <td>{fmtNum(s.hold, 2)}</td>
                  <td className="text-down">{pct(s.il * 100, 2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-mute">
        A simplified model with demo prices: it ignores gas, slippage and fees, and assumes the price moves once and stays there. Real results differ.
      </p>
    </Panel>
  );
}
