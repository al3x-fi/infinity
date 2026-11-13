# INFINITY — Phase 1 Research and Architecture

Date: 2026-11-04. Legend: **[CONFIRMED]** = seen in a source I fetched. **[UNVERIFIED]** = not found. **[PROPOSED]** = our design.

## 1. Zero technical specifications

| Item | Status |
|---|---|
| Zero is a new L1 from LayerZero Labs, announced 2026-02-10/11 | [CONFIRMED] LayerZero docs page https://docs.layerzero.network/chain/index.md, plus news coverage |
| Described as a "multi-core world computer" using ZK proofs to separate execution from verification | [CONFIRMED] same docs page |
| Launches with three permissionless "zones"; ZRO used for zone interoperability | [CONFIRMED] news coverage only (secondary source) |
| Mainnet timing: docs say 2026; news says "fall 2026" | [CONFIRMED] but I could not confirm it has launched |
| Chain ID | [UNVERIFIED] not in any page I could fetch |
| Official RPC URL | [UNVERIFIED] |
| Block explorer | [UNVERIFIED] |
| Testnet details / faucet | [UNVERIFIED] docs only say "prior to mainnet" |
| EVM compatibility, Solidity support, ethers/viem support | [UNVERIFIED] — zones may differ; one zone may be EVM, but I found no source saying so |
| DEXs, Uniswap V3/V4 deployments, position managers | [UNVERIFIED] — none found |
| SDKs, token/pool data APIs, subgraphs | [UNVERIFIED] |

**Important:** LayerZero's *Endpoint IDs* (e.g. 30101) are NOT chain IDs. Never mix them.

**Important:** Helios (heliosliq.app) is NOT on Zero. Its site says it runs on **Elysium, chain ID 99901**, using Uniswap v3 core contracts (factory `0x626005cA43F45568AD5f084087e5ae7cbba04e06`, position manager `0x3cc4F6963304852b2DceBBB2755defdBfaB33FBf`, router `0xbD8855A665Fcd99493f7324A6959ED7BD1ADb7A8`). Those addresses are for that chain only and must not be used on Zero.

## 2–5. DEXs, contracts, position managers on Zero
Nothing verified. I will not list names or addresses. The table below is what each candidate DEX must fill in before it is integrated (your requirement #4):

| Field | Value |
|---|---|
| DEX name / website | — |
| Pool type (V3 / V4 / other) | — |
| Factory, NonfungiblePositionManager, SwapRouter, Quoter | — |
| Fee tiers | — |
| Bytecode verified on explorer | — |
| Pool discovery method | — |

## 6. Pool discovery methods [PROPOSED]
For any Uniswap-V3-style DEX: index the factory's `PoolCreated(token0, token1, fee, tickSpacing, pool)` event from the deployment block; read each pool's `slot0()`, `liquidity()`, `fee()`, `tickSpacing()`; derive volume from `Swap` events; fees = volume × fee tier; positions via `Transfer` events on the position manager and `positions(tokenId)`. Needs only an RPC node (archive not required if indexing from genesis of the factory).

## 7. Token data sources
Unknown for Zero. Fallbacks: on-chain ERC-20 reads (name, symbol, decimals, totalSupply, owner()) via RPC — always available on EVM. Holder concentration and sniper analysis require our own indexer of `Transfer` events. No third-party API is assumed.

## 8. Recommended first integration
**Cannot recommend yet.** Decision rule: first DEX = one with (a) verified bytecode on the official explorer, (b) a Uniswap-V3-compatible NonfungiblePositionManager, (c) an audit. If no such DEX exists at Zero mainnet/testnet, the honest alternatives are (1) wait, (2) build against an EVM testnet where a V3 fork is verified (to develop the product, clearly labelled), or (3) deploy the unmodified, audited Uniswap V3 contracts ourselves only if Uniswap's licence permits (V3 core is BUSL; check) — this is a decision for you.

## 9. Adapter architecture [PROPOSED]
See `src/adapters/types/DexAdapter.ts`. A registry (`src/adapters/registry.ts`) is the **only** source of listed pools: Discover queries registry adapters; an unregistered DEX is unreachable by construction. Capabilities (`canCreatePosition`, `canCollectFees`, `canSwap`…) gate UI features. Adding a DEX = new folder + one line in the registry.

## 10. Database schema [PROPOSED, PostgreSQL]
- `dexes(id, name, chain_id, adapter_key, factory, position_manager, router, deployed_block, enabled)`
- `tokens(address, chain_id, symbol, name, decimals, first_seen_block)`
- `pools(address, dex_id, token0, token1, fee, tick_spacing, created_block, created_at)`
- `pool_snapshots(pool, block, ts, sqrt_price_x96, tick, liquidity, tvl_usd NULL, volume_24h_usd NULL)` — NULL means unavailable, never 0
- `swaps(tx_hash, log_index, pool, sender, recipient, amount0, amount1, tick, ts)`
- `positions(dex_id, token_id, owner, pool, tick_lower, tick_upper, liquidity, tokens_owed0, tokens_owed1)`
- `position_events(tx_hash, log_index, token_id, kind[mint|increase|decrease|collect|transfer], amount0, amount1, ts)`
- `token_risk(token, check_key, status[pass|fail|unknown], evidence_json, checked_at)`
- `indexer_cursors(dex_id, contract, last_block)`

## 11. Frontend structure [PROPOSED]
`src/pages/{Discover,PoolDetails,LiquidityStudio,MyPositions,TokenSafety,Analytics}`, `src/adapters/`, `src/components/`, `src/hooks/`, `src/services/`, `src/config/chains.ts`, `src/utils/`. Backend in `server/` (Node + TypeScript + Postgres + Redis).

## 12. Liquidity strategy mathematics
Uniswap V3: price p = 1.0001^tick; √P = 1.0001^(tick/2). For range [Pa, Pb], current P:
- Liquidity from amounts (in range): L = min( x·√P·√Pb/(√Pb−√P), y/(√P−√Pa) )
- Required amounts for L: x = L·(√Pb−√P)/(√P·√Pb), y = L·(√P−√Pa)
- Below range: all token0; above range: all token1.
- Ticks must be multiples of the pool's tickSpacing.
Strategies on a V3 NFT position (one range per NFT): **Spot** = one position over [Pa,Pb]. **Curve / Bid-Ask / Custom** = *several* adjacent NFT positions (bins) with weights w_i (Curve: weights peaked at current price, e.g. Gaussian; Bid-Ask: weights rising toward edges; Custom: user weights). Cost: one mint per bin → more gas, and the UI must show it. True per-bin shaping is natural only on bin-based DEXs; capability detection decides what to offer.

## 13. Security requirements
Use only audited, verified DEX contracts; no custom contracts holding funds; exact-amount approvals (not unlimited by default); `amountMin` slippage and `deadline` on every mint/increase/decrease; check `ownerOf(tokenId)` before actions; BigInt/`parseUnits` only, never floats, for amounts; simulate (`eth_call`/`estimateGas`) before signing; verify chain ID matches before every transaction; API keys server-side only; rate limiting; never touch private keys; show any INFINITY fee before signing.

## 14. Estimated infrastructure costs (rough, my estimates, not quotes)
Dev/testnet: ~$0–25/mo (free-tier Postgres, hosting). Early production: RPC node/provider $50–300, Postgres $25–100, Redis $10–30, API host $20–60, monitoring $0–30 → **roughly $100–500/mo**. Audit of any custom contract: tens of thousands USD. Costs depend on Zero RPC availability, which is unknown.

## 15. Roadmap
1. **Now:** obtain Zero's official chain ID/RPC/explorer/EVM status (LayerZero Discord/docs, or Zero team) and a list of live DEXs.
2. Frontend with clearly labelled demo data (Phase 2) — can start immediately.
3. First DEX adapter once a verified deployment exists (Phase 3), then liquidity operations on testnet (4), indexer + portfolio + safety (5), more DEXs (6), hardening and audit (7).

## What I need from you
1. Is Zero mainnet/testnet live for you, and do you have an official RPC URL / chain ID from LayerZero? If not, we proceed with Phase 2 (demo-labelled UI) while waiting.
