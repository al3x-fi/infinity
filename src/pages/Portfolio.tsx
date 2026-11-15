import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { isAddress } from "ethers";
import { PageHero, Panel } from "../components/ui";
import CopyField from "../components/CopyField";
import Avatar from "../components/Avatar";
import { adapters } from "../adapters/registry";
import type { PositionInfo } from "../adapters/types/DexAdapter";
import { portfolioLink } from "../lib/referral";
import { USERNAME_RE, fetchByUsername, useProfile } from "../lib/profile";
import { short } from "../components/ConnectButton";
import FollowButton from "../components/FollowButton";
import { walletReady } from "../wallet/appkit";
import Connections from "../components/Connections";

/** Public, read-only view of a wallet's positions. The URL can hold a wallet address or a username. */
export default function Portfolio() {
  const { address: id = "" } = useParams();
  const isAddr = Boolean(isAddress(id));
  const [resolved, setResolved] = useState<string | null | undefined>(isAddr ? id : undefined);
  const [positions, setPositions] = useState<PositionInfo[] | null>(null);

  // A username is looked up on the server; an address is used as is.
  useEffect(() => {
    if (isAddr) { setResolved(id); return; }
    if (!USERNAME_RE.test(id.toLowerCase())) { setResolved(null); return; }
    let stale = false;
    setResolved(undefined);
    fetchByUsername(id).then((r) => { if (!stale) setResolved(r ? r.address : null); });
    return () => { stale = true; };
  }, [id, isAddr]);

  const address = resolved ?? "";
  const profile = useProfile(resolved ?? undefined);

  useEffect(() => {
    setPositions(null);
    if (!resolved) return;
    let stale = false;
    Promise.all(adapters.filter((a) => a.capabilities.concentratedLiquidity).map((a) => a.getPositions(resolved as `0x${string}`)))
      .then((all) => { if (!stale) setPositions(all.flat()); })
      .catch(() => { if (!stale) setPositions([]); });
    return () => { stale = true; };
  }, [resolved]);

  if (resolved === undefined) return <PageHero title="Portfolio" intro="Loading…" />;
  if (resolved === null) {
    return (
      <>
        <PageHero title="Portfolio" intro="No wallet or username matches that link." />
        <Link to="/discover" className="text-sm text-mute hover:text-ink">← Back to Pools</Link>
      </>
    );
  }

  return (
    <>
      <PageHero
        title={profile ? `@${profile.username}` : short(address)}
        right={
          <div className="flex flex-col items-end gap-3">
            <Avatar address={address} username={profile?.username} src={profile?.avatar} size={72} />
            {walletReady && <FollowButton target={address} />}
          </div>
        }
        intro="A public, read-only view of this wallet's liquidity positions on the DEXs INFINITY supports. Anyone can see this, because the data is already public on chain."
      />
      <Connections address={address} />
      <Panel title="Share this portfolio">
        <CopyField value={portfolioLink(profile?.username ?? address)} />
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
