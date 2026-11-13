// The contract every supported DEX must implement. Unsupported features are
// declared via `capabilities` so the UI never shows actions a DEX cannot do.

export type Address = `0x${string}`;

/** A metric that may be unavailable. `null` means "unknown", never zero. */
export type Metric = bigint | number | null;

export interface Capabilities {
  discoverPools: boolean;
  concentratedLiquidity: boolean;
  createPosition: boolean;
  increaseLiquidity: boolean;
  decreaseLiquidity: boolean;
  collectFees: boolean;
  swap: boolean;
}

export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
}

export interface PoolInfo {
  address: Address;
  dexKey: string;
  token0: TokenInfo;
  token1: TokenInfo;
  feeTier: number; // hundredths of a bip, e.g. 3000 = 0.3%
  tickSpacing: number;
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
  tvlUsd: Metric;
  volume24hUsd: Metric;
  createdBlock: number;
}

export interface PositionInfo {
  dexKey: string;
  tokenId: bigint;
  owner: Address;
  pool: Address;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
}

export interface MintParams {
  pool: Address;
  tickLower: number;
  tickUpper: number;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint; // slippage protection
  amount1Min: bigint;
  recipient: Address;
  deadline: number; // unix seconds
}

export interface DexAdapter {
  readonly key: string;
  readonly displayName: string;
  readonly chainId: number;
  readonly capabilities: Capabilities;

  listPools(): Promise<PoolInfo[]>;
  getPool(address: Address): Promise<PoolInfo>;
  getPositions(owner: Address): Promise<PositionInfo[]>;

  // Write methods return an unsigned transaction request; the wallet signs it.
  buildMint?(params: MintParams): Promise<{ to: Address; data: `0x${string}`; value: bigint }>;
  buildCollect?(tokenId: bigint, recipient: Address): Promise<{ to: Address; data: `0x${string}`; value: bigint }>;
}
