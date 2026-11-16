import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { PageHero, Panel } from "../components/ui";
import CopyField from "../components/CopyField";
import Avatar from "../components/Avatar";
import { short } from "../components/ConnectButton";
import { walletReady } from "../wallet/appkit";
import { useProfile } from "../lib/profile";
import { fetchLeaderboard, fetchReferrals, type Brief, type Referral } from "../lib/social";
import { getReferrer, refLink } from "../lib/referral";

const name = (p: Brief) => (p.username ? `@${p.username}` : short(p.address));
const to = (p: Brief) => `/u/${p.username ?? p.address}`;

function Person({ p, right }: { p: Brief; right?: string }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar address={p.address} username={p.username ?? undefined} src={p.avatar} size={32} />
      <Link to={to(p)} className="min-w-0 flex-1 truncate text-sm hover:underline">{name(p)}</Link>
      {right && <span className="text-xs text-mute">{right}</span>}
    </li>
  );
}

/** Your link and the wallets you referred. Only mounted when AppKit is configured. */
function Mine() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const profile = useProfile(address);
  const [data, setData] = useState<{ count: number; referred: Referral[]; referrer: Brief | null } | null | undefined>(undefined);

  useEffect(() => {
    if (!address) return setData(undefined);
    let stale = false;
    fetchReferrals(address).then((d) => { if (!stale) setData(d); });
    return () => { stale = true; };
  }, [address]);

  if (!isConnected || !address) {
    return (
      <Panel title="Your referral link">
        <p className="mb-3 text-sm text-mute">Connect a wallet to get your link. Your link uses your username, or your wallet address if you have not chosen one.</p>
        <button onClick={() => open({ view: "Connect" })} className="rounded-xl bg-violet px-5 py-2 text-sm font-medium">Connect wallet</button>
      </Panel>
    );
  }

  const code = profile?.username ?? address;
  return (
    <>
      <Panel title="Your referral link">
        <div className="space-y-3">
          <CopyField value={refLink(code)} />
          {!profile && (
            <p className="text-xs text-mute">
              You are using your wallet address as your code. <Link to="/profile" className="underline">Choose a username</Link> for a shorter link.
            </p>
          )}
        </div>
      </Panel>
      <Panel title={`People you referred${data ? ` (${data.count})` : ""}`}>
        {data === undefined ? <p className="text-sm text-mute">Loading…</p>
          : data === null ? <p className="text-sm text-mute">Could not load. Try again later.</p>
          : data.referred.length === 0 ? <p className="text-sm text-mute">Nobody yet. Share your link. A referral counts when the person creates a profile.</p>
          : <ul className="divide-y divide-line">{data.referred.map((p) => <Person key={p.address} p={p} />)}</ul>}
        {data?.referrer && <p className="mt-3 text-xs text-mute">You were referred by <Link to={to(data.referrer)} className="underline">{name(data.referrer)}</Link>.</p>}
      </Panel>
    </>
  );
}

function Leaderboard() {
  const [d, setD] = useState<Awaited<ReturnType<typeof fetchLeaderboard>> | undefined>(undefined);
  useEffect(() => { fetchLeaderboard().then(setD); }, []);
  return (
    <Panel title="Top referrers">
      {d === undefined ? <p className="text-sm text-mute">Loading…</p>
        : d === null ? <p className="text-sm text-mute">Could not load. Try again later.</p>
        : d.leaders.length === 0 ? <p className="text-sm text-mute">No referrals yet. Be the first.</p>
        : (
          <ol className="divide-y divide-line">
            {d.leaders.map((l, i) => <Person key={l.address} p={l} right={`#${i + 1} · ${l.count} referred`} />)}
          </ol>
        )}
      {d && <p className="mt-3 text-xs text-mute">{d.total} referral{d.total === 1 ? "" : "s"} counted in total.</p>}
    </Panel>
  );
}

export default function Referrals() {
  const referrer = getReferrer();
  return (
    <>
      <PageHero
        title="Referrals"
        intro="Invite people with your link. A referral counts when someone arrives through it and creates a profile."
        note="Rewards are not live. INFINITY charges a 0% fee today, so there is nothing to share yet. Counts show who brought whom, not earnings."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0 space-y-4">
          {walletReady ? <Mine /> : <Panel title="Your referral link"><p className="text-sm text-mute">Wallet connection is not set up on this build.</p></Panel>}
        </div>
        <div className="min-w-0 space-y-4">
          <Leaderboard />
          <Panel title="How counting works">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-mute">
              <li>The person must open your link first, then connect a wallet and create a profile. That step needs their wallet signature.</li>
              <li>Each wallet is counted once, for the first link it arrived through. You cannot refer yourself.</li>
              <li>Wallets that already had a profile are not counted.</li>
              <li>It counts wallets, not verified unique people. Anyone can make several wallets, so numbers are not proof of real users, and rewards would need stricter checks.</li>
            </ul>
            <p className="mt-3 text-xs text-mute">
              {referrer ? <>This browser arrived through <span className="font-mono text-ink">{referrer}</span>.</> : "This browser did not arrive through a referral link."}
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
