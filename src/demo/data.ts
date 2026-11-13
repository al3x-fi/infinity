// ALL DATA IN THIS FILE IS FABRICATED DEMO DATA for UI development.
// It is replaced by adapter/indexer data in Phase 3+. `null` = metric unavailable.

export interface DemoPool {
  id: string;
  dex: string;
  pair: [string, string];
  feeTier: number; // percent
  price: number; // token1 per token0
  tvlUsd: number | null;
  volume24hUsd: number | null;
  ageDays: number;
  address: string;
  token0: string;
  token1: string;
  risk: "low" | "medium" | "high" | "unknown";
}

export const demoPools: DemoPool[] = [
  { id: "1", dex: "Demo DEX A", pair: ["ZRO", "USDC"], feeTier: 0.3, price: 2.14, tvlUsd: 1_850_000, volume24hUsd: 420_000, ageDays: 41, address: "0xDEMO000000000000000000000000000000000001", token0: "0xDEMOa0000000000000000000000000000000001", token1: "0xDEMOb0000000000000000000000000000000001", risk: "low" },
  { id: "2", dex: "Demo DEX A", pair: ["PEPZ", "ZRO"], feeTier: 1, price: 0.00042, tvlUsd: 96_000, volume24hUsd: 310_000, ageDays: 6, address: "0xDEMO000000000000000000000000000000000002", token0: "0xDEMOa0000000000000000000000000000000002", token1: "0xDEMOa0000000000000000000000000000000001", risk: "high" },
  { id: "3", dex: "Demo DEX B", pair: ["WETH", "USDC"], feeTier: 0.05, price: 3120.5, tvlUsd: 4_200_000, volume24hUsd: null, ageDays: 88, address: "0xDEMO000000000000000000000000000000000003", token0: "0xDEMOa0000000000000000000000000000000003", token1: "0xDEMOb0000000000000000000000000000000001", risk: "low" },
  { id: "4", dex: "Demo DEX B", pair: ["MOONZ", "USDC"], feeTier: 1, price: 0.0183, tvlUsd: null, volume24hUsd: null, ageDays: 2, address: "0xDEMO000000000000000000000000000000000004", token0: "0xDEMOa0000000000000000000000000000000004", token1: "0xDEMOb0000000000000000000000000000000001", risk: "unknown" },
  { id: "5", dex: "Demo DEX A", pair: ["WETH", "ZRO"], feeTier: 0.3, price: 1458.2, tvlUsd: 720_000, volume24hUsd: 95_000, ageDays: 33, address: "0xDEMO000000000000000000000000000000000005", token0: "0xDEMOa0000000000000000000000000000000003", token1: "0xDEMOa0000000000000000000000000000000001", risk: "medium" },
];

export const dexNames = ["Demo DEX A", "Demo DEX B"];
export const feeTiers = [0.05, 0.3, 1];

/** Deterministic pseudo-series so charts do not change on every render. */
export function demoSeries(seed: number, n: number, base: number, vol: number) {
  let v = base;
  const out: { t: string; v: number }[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.sin(seed * 999 + i * 12.9898) * 43758.5453;
    v = Math.max(base * 0.3, v + (r - Math.floor(r) - 0.5) * vol);
    out.push({ t: `D-${n - i}`, v: Number(v.toPrecision(6)) });
  }
  return out;
}

export interface DemoPosition {
  tokenId: number;
  poolId: string;
  lower: number;
  upper: number;
  valueUsd: number;
  depositedUsd: number;
  unclaimedFeesUsd: number;
  collectedFeesUsd: number;
}

export const demoPositions: DemoPosition[] = [
  { tokenId: 1001, poolId: "1", lower: 1.9, upper: 2.5, valueUsd: 5120, depositedUsd: 5000, unclaimedFeesUsd: 38.4, collectedFeesUsd: 112.9 },
  { tokenId: 1002, poolId: "5", lower: 1700, upper: 1900, valueUsd: 2210, depositedUsd: 2500, unclaimedFeesUsd: 0, collectedFeesUsd: 20.1 },
];

export type CheckStatus = "pass" | "fail" | "unknown";
export interface SafetyCheck { key: string; label: string; status: CheckStatus; detail: string }

export const demoSafety: SafetyCheck[] = [
  { key: "holders", label: "Top holder concentration", status: "fail", detail: "Demo: top 10 wallets hold 71% of supply." },
  { key: "deployer", label: "Deployer holdings", status: "unknown", detail: "Not indexed yet." },
  { key: "owner", label: "Contract ownership", status: "pass", detail: "Demo: ownership renounced." },
  { key: "mint", label: "Mint permissions", status: "unknown", detail: "Bytecode analysis not run." },
  { key: "blacklist", label: "Blacklist permissions", status: "unknown", detail: "Bytecode analysis not run." },
  { key: "restrict", label: "Trading restrictions", status: "unknown", detail: "Simulation not run." },
  { key: "snipers", label: "Sniper wallets", status: "unknown", detail: "Needs launch-block indexing." },
  { key: "bundle", label: "Bundled launch activity", status: "unknown", detail: "Needs launch-block indexing." },
  { key: "liqhist", label: "Liquidity removal events", status: "pass", detail: "Demo: none observed." },
];
