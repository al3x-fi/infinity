import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { demoPools, demoSeries, dexNames } from "../demo/data";
import { PageHero, Panel, Stat } from "../components/ui";
import { fmtUsd } from "../lib/liquidity";

const tip = { background: "var(--color-panel)", border: "1px solid var(--color-line)" };

export default function Analytics() {
  const tvl = demoSeries(1, 30, 6_000_000, 400_000);
  const vol = demoSeries(2, 30, 600_000, 150_000);
  return (
    <>
      <PageHero
        title="Analytics"
        intro="Liquidity and trading volume across the DEXs INFINITY integrates. Live figures will come only from indexed, verified data."
        stats={[
          ["Total value locked", fmtUsd(tvl[tvl.length - 1].v)],
          ["Volume (latest day)", fmtUsd(vol[vol.length - 1].v)],
          ["Pools tracked", String(demoPools.length)],
          ["Supported DEXs", String(dexNames.length)],
        ]}
        note="All charts below use fabricated demo series."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Historical TVL (demo)">
          <div className="h-52">
            <ResponsiveContainer>
              <AreaChart data={tvl}>
                <XAxis dataKey="t" hide />
                <YAxis width={60} stroke="var(--color-mute)" tickFormatter={(v) => fmtUsd(v)} />
                <Tooltip contentStyle={tip} />
                <Area dataKey="v" stroke="var(--color-mute)" fill="var(--color-mute)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Trading volume (demo)">
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={vol}>
                <XAxis dataKey="t" hide />
                <YAxis width={60} stroke="var(--color-mute)" tickFormatter={(v) => fmtUsd(v)} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="v" fill="var(--color-ink)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <Panel title="Supported DEX statistics (demo)">
        <div className="grid gap-4 md:grid-cols-2">
          {dexNames.map((d) => {
            const ps = demoPools.filter((p) => p.dex === d);
            const known = ps.filter((p) => p.tvlUsd !== null);
            return (
              <div key={d} className="lift rounded-xl border border-line p-3">
                <div className="mb-2 font-semibold">{d}</div>
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Pools" value={String(ps.length)} />
                  <Stat label="TVL (known pools)" value={fmtUsd(known.reduce((s, p) => s + (p.tvlUsd ?? 0), 0))} />
                  <Stat label="Pools missing TVL" value={String(ps.length - known.length)} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="Position performance &amp; fee collection history">
        <p className="text-sm text-mute">N/A — requires a connected wallet and the position indexer (Phase 5).</p>
      </Panel>
    </>
  );
}
