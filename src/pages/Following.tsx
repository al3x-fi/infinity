import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { BrowserProvider, type Eip1193Provider } from "ethers";
import { PageHero, Panel } from "../components/ui";
import Avatar from "../components/Avatar";
import { short } from "../components/ConnectButton";
import { walletReady } from "../wallet/appkit";
import { alertsOn, fetchFeed, markFeedSeen, setAlerts, setFollow, useFollowing, type FeedEvent } from "../lib/social";

const ago = (ts: number) => {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`;
};

function Connected() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Eip1193Provider>("eip155");
  const { list, reload } = useFollowing(address);
  const [events, setEvents] = useState<FeedEvent[] | null>(null);
  const [alerts, setAlertsState] = useState(alertsOn());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let stale = false;
    fetchFeed(address).then((e) => { if (!stale) { setEvents(e); markFeedSeen(address); } });
    return () => { stale = true; };
  }, [address]);

  if (!isConnected || !address) {
    return (
      <Panel>
        <p className="mb-3 text-sm text-mute">Connect a wallet to follow liquidity providers and see what they do.</p>
        <button onClick={() => open({ view: "Connect" })} className="rounded-xl bg-violet px-5 py-2 text-sm font-medium">Connect wallet</button>
      </Panel>
    );
  }

  const unfollow = async (target: string) => {
    if (!walletProvider) return setError("Wallet not ready. Reconnect and try again.");
    setBusy(target); setError("");
    const signer = await new BrowserProvider(walletProvider).getSigner();
    const r = await setFollow(address, target, "unfollow", (m) => signer.signMessage(m));
    setBusy(null);
    if (!r.ok) setError(r.error); else reload();
  };

  return (
    <>
      <Panel title="Activity from wallets you follow">
        {events === null ? <p className="text-sm text-mute">Loading…</p>
          : events.length === 0 ? (
            <p className="text-sm text-mute">
              Nothing yet. Activity shows here when a wallet you follow opens or closes a liquidity position on a supported DEX.
              No DEX is integrated yet, so there is nothing to detect today. Empty does not mean they are inactive.
            </p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <Avatar address={e.actor} username={e.actorProfile.username ?? undefined} src={e.actorProfile.avatar} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/u/${e.actorProfile.username ?? e.actor}`} className="font-medium hover:underline">
                      {e.actorProfile.username ? `@${e.actorProfile.username}` : short(e.actor)}
                    </Link>{" "}
                    <span className="text-mute">{e.type === "position_opened" ? "opened a position" : "closed a position"}</span>
                    {e.pool && <span> in {e.pool}</span>}
                    {e.detail && <div className="text-xs text-mute">{e.detail}</div>}
                  </div>
                  <span className="shrink-0 text-xs text-mute">{ago(e.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        <p className="mt-3 text-xs text-mute">Public on-chain activity, not a recommendation. Past activity does not predict results, and you can lose funds.</p>
      </Panel>

      <Panel title={`Wallets you follow${list ? ` (${list.length})` : ""}`}>
        {error && <p className="mb-2 text-xs text-down">{error}</p>}
        {list === null ? <p className="text-sm text-mute">Loading…</p>
          : list.length === 0 ? <p className="text-sm text-mute">You are not following anyone yet. Open a wallet's public page and select Follow.</p>
          : (
            <ul className="divide-y divide-line">
              {list.map((p) => (
                <li key={p.address} className="flex items-center gap-3 py-2.5">
                  <Avatar address={p.address} username={p.username ?? undefined} src={p.avatar} size={36} />
                  <Link to={`/u/${p.username ?? p.address}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                    {p.username ? `@${p.username}` : short(p.address)}
                  </Link>
                  <button onClick={() => unfollow(p.address)} disabled={busy === p.address}
                    className="rounded-lg border border-line px-3 py-1 text-xs text-mute hover:text-ink disabled:opacity-50">
                    {busy === p.address ? "Signing…" : "Unfollow"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        <p className="mt-3 text-xs text-mute">Who you follow is public, like on-chain activity. Following and unfollowing ask your wallet for a free signature.</p>
      </Panel>

      <Panel title="Alerts">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={alerts} className="h-4 w-4"
            onChange={(e) => { setAlertsState(e.target.checked); setAlerts(e.target.checked); }} />
          Show a number on the bell when there is new activity
        </label>
        <p className="mt-3 text-xs text-mute">
          Alerts appear while the site is open. Telegram and email alerts are not available yet: they need a background service
          watching the chain, which comes with the first DEX integration.
        </p>
      </Panel>
    </>
  );
}

export default function Following() {
  return (
    <>
      <PageHero
        title="Following"
        intro="Follow liquidity providers and see when they open or close positions. Everything shown is already public on chain."
        note="Position alerts need a real DEX adapter. None is integrated yet, so the activity list stays empty for now."
      />
      {walletReady ? <Connected /> : (
        <Panel><p className="text-sm text-mute">Wallet connection is not set up on this build, so following is unavailable.</p></Panel>
      )}
    </>
  );
}
