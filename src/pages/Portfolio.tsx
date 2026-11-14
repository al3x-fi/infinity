import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { isAddress } from "ethers";
import { PageHero, Panel } from "../components/ui";
import CopyField from "../components/CopyField";
import { adapters } from "../adapters/registry";
import type { PositionInfo } from "../adapters/types/DexAdapter";
import { portfolioLink } from "../lib/referral";
import { short } from "../components/ConnectButton";

/** Public, read-only view of any wallet's positions. Uses on-chain data only. */
export default function Portfolio() {
  const { address = "" } = useParams();
  const valid = isAddress(address);
  const [positions, setPositions] = useState<PositionInfo[] | null>(null);

  useEffect(() => {
    setPositions(null);
    if (!valid) return;
    let stale = false;
    Promise.all(adapters.filter((a) => a.capabilities.concentratedLiquidity).map((a) => a.getPositions(address as `0x${string}`)))
      .then((all) => { if (!stale) setPositions(all.flat()); })
      .catch(() => { if (!stale) setPositions([]); });
    return () => { stale = true; };
  }, [address, valid]);

  if (!valid) {
    return (
      <>
        <PageHero title="Portfolio" intro="That is not a valid wallet address." />
        <Link to="/discover" className="text-sm text-mute hover:text-ink">← Back to Pools</Link>
      </>
    );
  }

  return (
    <>
      <PageHero
        title={short(address)}
        intro="A public, read-only view of this wallet's liquidity positions on the DEXs INFINITY supports. Anyone with the address can see this, because the data is already public on chain."
      />
      <Panel title="Share this portfolio">
        <CopyField value={portfolioLink(address)} />
      </Panel>
      <Panel title="Positions on supported DEXs">
        {adapters.length === 0 ? (
          <p className="text-sm text-mute">
            No DEX is integrated yet, so positions cannot be looked up. This is not the same as having none: once a verified adapter is
            added, positions from it will appear here.
          </p>
        ) : positions === null ? (
          <p className="text-sm text-mute">Loading…</p>
        ) : positions.length === 0 ? (
          <p className="text-sm text-mute">No positions found for this wallet on the supported DEXs.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {positions.map((p) => (
              <li key={`${p.dexKey}-${p.tokenId}`} className="py-2">{p.dexKey} · NFT #{p.tokenId.toString()} · ticks {p.tickLower} to {p.tickUpper}</li>
            ))}
          </ul>
        )}
      </Panel>
      <p className="break-all font-mono text-xs text-mute">{address}</p>
    </>
  );
}
