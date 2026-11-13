import { demoPools } from "../demo/data";
import { fmtNum } from "../lib/liquidity";

const apr = (volume: number | null, fee: number, tvl: number | null) =>
  volume === null || tvl === null ? null : ((volume * fee) / 100 / tvl) * 365 * 100;

/** Scrolling strip of demo pools. Values are fabricated; unavailable ones read N/A. */
export default function PoolTicker() {
  const items = demoPools.map((p) => {
    const a = apr(p.volume24hUsd, p.feeTier, p.tvlUsd);
    return { id: p.id, pair: p.pair.join("/"), dex: p.dex, fee: p.feeTier, apr: a };
  });
  const row = (suffix: string) =>
    items.map((i) => (
      <span key={i.id + suffix} className="flex shrink-0 items-center gap-2 px-6 font-mono text-xs">
        <span className="font-medium text-ink">{i.pair}</span>
        <span className="text-mute">{i.dex} · {i.fee}%</span>
        <span className={i.apr === null ? "text-mute" : "text-up"}>{i.apr === null ? "APR N/A" : `${fmtNum(i.apr, 0)}% APR`}</span>
      </span>
    ));
  return (
    <div className="overflow-hidden border-b border-line bg-bg/70 py-2 backdrop-blur" aria-label="Demo pools (fabricated data)">
      <div className="ticker flex w-max">
        <div className="flex">{row("a")}</div>
        <div className="flex" aria-hidden="true">{row("b")}</div>
      </div>
    </div>
  );
}
