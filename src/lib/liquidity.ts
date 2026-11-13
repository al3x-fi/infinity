// Concentrated-liquidity strategy math (Uniswap-V3 style), floating point for
// PREVIEW ONLY. Real transactions must use BigInt / on-chain math.

export type Strategy = "spot" | "curve" | "bidask" | "custom";

export interface Bin { lower: number; upper: number; weight: number }

/** Split [lower, upper] into n geometric bins and assign weights per strategy. */
export function buildBins(
  strategy: Strategy,
  lower: number,
  upper: number,
  price: number,
  n: number,
  custom: number[],
): Bin[] {
  const ratio = Math.pow(upper / lower, 1 / n);
  const raw: Bin[] = [];
  for (let i = 0; i < n; i++) {
    const a = lower * Math.pow(ratio, i);
    const b = a * ratio;
    const mid = Math.sqrt(a * b);
    const dist = Math.abs(Math.log(mid / price)) / Math.log(upper / lower); // 0..~1
    let w = 1;
    if (strategy === "curve") w = Math.exp(-Math.pow(dist / 0.25, 2));
    if (strategy === "bidask") w = 0.15 + dist * 2;
    if (strategy === "custom") w = custom[i] ?? 1;
    raw.push({ lower: a, upper: b, weight: w });
  }
  const sum = raw.reduce((s, b) => s + b.weight, 0) || 1;
  return raw.map((b) => ({ ...b, weight: b.weight / sum }));
}

/** Token0/token1 needed per unit of liquidity L for a range at price P. */
function amountsPerL(a: number, b: number, P: number) {
  const sa = Math.sqrt(a), sb = Math.sqrt(b), sp = Math.min(Math.max(Math.sqrt(P), sa), sb);
  return { x: (sb - sp) / (sp * sb), y: sp - sa };
}

/** Given total value (in token1 units), return token amounts needed for each bin and in total. */
export function requirements(bins: Bin[], price: number, totalValue: number) {
  let x = 0, y = 0;
  const perBin = bins.map((bin) => {
    const { x: ux, y: uy } = amountsPerL(bin.lower, bin.upper, price);
    const valuePerL = ux * price + uy;
    const L = valuePerL > 0 ? (bin.weight * totalValue) / valuePerL : 0;
    x += L * ux;
    y += L * uy;
    return { ...bin, amount0: L * ux, amount1: L * uy };
  });
  return { perBin, amount0: x, amount1: y };
}

export function fmtNum(n: number | null, digits = 2): string {
  if (n === null) return "N/A";
  if (n !== 0 && Math.abs(n) < 0.01) return n.toPrecision(3);
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function fmtUsd(n: number | null): string {
  return n === null ? "N/A" : "$" + fmtNum(n, 0);
}
