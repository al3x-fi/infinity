import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { isAddress } from "ethers";
import { useAppKitAccount } from "@reown/appkit/react";
import { PageHero, Panel } from "../components/ui";
import Avatar from "../components/Avatar";
import CopyChip from "../components/CopyChip";
import { adapters } from "../adapters/registry";
import type { PositionInfo } from "../adapters/types/DexAdapter";
import { portfolioLink } from "../lib/referral";
import { USERNAME_RE, fetchByUsername, useProfile } from "../lib/profile";
import { fetchReferrals, type Brief } from "../lib/social";
import { short } from "../components/ConnectButton";
import FollowButton from "../components/FollowButton";
import { walletReady } from "../wallet/appkit";
import Connections from "../components/Connections";

/** "This is you" badge with an Edit link. Only mounted when AppKit is configured. */
function MeBadge({ address }: { address: string }) {
  const { address: me, isConnected } = useAppKitAccount();
  if (!isConnected || !me || me.toLowerCase() !== address.toLowerCase()) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-up/50 px-2.5 py-0.5 text-xs text-up">This is you</span>
      <Link to="/profile" className="rounded-xl border border-line px-4 py-2 text-sm hover:bg-ink/5">Edit profile</Link>
    </div>
  );
}

function Tile({ label, value, hint, na }: { label: string; value: string; hint?: string; na?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-bg/60 p-3" title={na ? "Unavailable, which is not the same as zero" : undefined}>
      <div className="text-[11px] text-mute">{label}</div>
      <div className={`mt-0.5 text-lg font-medium ${na ? "text-mute" : ""}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-mute">{hint}</div>}
    </div>
  );
}

/** Public, read-only view of a wallet. The URL can hold a wallet address or a username. */
export default function Portfolio() {
  const { address: id = "" } = useParams();
  const isAddr = Boolean(isAddress(id));
  const [resolved, setResolved] = useState<string | null | undefined>(isAddr ? id : undefined);
  const [positions, setPositions] = useState<PositionInfo[] | null>(null);
  const [refs, setRefs] = useState<{ count: number; referrer: Brief | null } | null>(null);

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

  useEffect(() => {
    setRefs(null);
    if (!resolved) return;
    let stale = false;
    fetchReferrals(resolved).then((d) => { if (!stale && d) setRefs({ count: d.count, referrer: d.referrer }); });
    return () => { stale = true; };
  }, [resolved]);

  useEffect(() => {
    document.title = resolved && profile ? `@${profile.username} · INFINITY` : "INFINITY — Advanced Liquidity Management on Zero";
    return () => { document.title = "INFINITY — Advanced Liquidity Management on Zero"; };
  }, [resolved, profile]);

  if (resolved === undefined) return <PageHero title="Profile" intro="Loading…" />;
  if (resolved === null) {
    return (
      <>
        <PageHero title="Profile not found" intro="No wallet or username matches that link. Check the spelling, or paste the full wallet address into the search." />
        <Link to="/discover" className="text-sm text-mute hover:text-ink">← Back to Pools</Link>
      </>
    );
  }

  const posCount = adapters.length === 0 ? null : positions?.length ?? null;

  return (
    <>
      <section className="rounded-3xl border border-line p-5 md:p-8"
        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--color-ink) 4%, var(--color-panel)), var(--color-panel))" }}>
        <div className="flex flex-wrap items-start gap-5">
          <Avatar address={address} username={profile?.username} src={profile?.avatar} size={96} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-medium md:text-4xl">{profile ? `@${profile.username}` : short(address)}</h1>
            {!profile && <p className="mt-1 text-sm text-mute">No username set.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyChip label={short(address)} value={address} mono />
              <CopyChip label="Copy profile link" value={portfolioLink(profile?.username ?? address)} />
            </div>
            {refs?.referrer && (
              <p className="mt-3 text-xs text-mute">
                Invited by{" "}
                <Link to={`/u/${refs.referrer.username ?? refs.referrer.address}`} className="underline">
                  {refs.referrer.username ? `@${refs.referrer.username}` : short(refs.referrer.address)}
                </Link>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {walletReady && <FollowButton target={address} />}
            {walletReady && <MeBadge address={address} />}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Positions" value={posCount === null ? "N/A" : String(posCount)} hint={posCount === null ? "No DEX integrated yet" : undefined} na={posCount === null} />
          <Tile label="Fees earned" value="N/A" hint="Needs position data" na />
          <Tile label="Referred" value={refs ? String(refs.count) : "…"} hint="Wallets that joined via their link" />
          <Tile label="Profile" value={profile ? "Public" : "Not set"} hint="Username and picture" />
        </div>

        <div className="mt-5"><Connections address={address} /></div>
      </section>

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

      <p className="text-xs text-mute">
        This page is public and read-only. It shows information that is already public on chain and cannot move funds. Activity is not advice, and past results do not predict future ones.
      </p>
      <p className="break-all font-mono text-xs text-mute">{address}</p>
    </>
  );
}
