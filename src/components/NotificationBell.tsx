import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAppKitAccount } from "@reown/appkit/react";
import Avatar from "./Avatar";
import { short } from "./ConnectButton";
import { walletReady } from "../wallet/appkit";
import {
  alertsOn, annSeen, feedSeen, fetchAnnouncements, fetchFeed, markAnnSeen, markFeedSeen,
  type Announcement, type FeedEvent,
} from "../lib/social";

const ago = (ts: number) => {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  return s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`;
};

function Bell({ address }: { address?: string }) {
  const [open, setOpen] = useState(false);
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [unread, setUnread] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [a, e] = await Promise.all([fetchAnnouncements(), address && alertsOn() ? fetchFeed(address) : Promise.resolve([] as FeedEvent[])]);
    const list = a ?? [], ev = e ?? [];
    setAnns(list); setEvents(ev);
    const newAnns = list.filter((x) => x.ts > annSeen()).length;
    const newEv = address && alertsOn() ? ev.filter((x) => x.ts > feedSeen(address)).length : 0;
    setUnread(newAnns + newEv);
  }, [address]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) { load(); markAnnSeen(); if (address) markFeedSeen(address); setTimeout(() => setUnread(0), 600); }
  };

  return (
    <div ref={box} className="md:relative">
      <button onClick={toggle} aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} aria-haspopup="menu" aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line hover:bg-ink/5 md:h-11 md:w-11">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet px-1 text-[11px] font-medium">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div role="menu" className="page-in absolute inset-x-4 top-full z-20 mt-2 max-h-[70vh] overflow-y-auto md:inset-x-auto md:right-0 md:w-96 rounded-2xl border border-line bg-panel p-3 shadow-2xl">
          <div className="px-1 pb-1 font-mono text-[11px] uppercase tracking-widest text-mute">From the team</div>
          {anns.length === 0 ? (
            <p className="px-1 pb-3 text-sm text-mute">No messages from the team yet.</p>
          ) : (
            <ul className="space-y-2 pb-3">
              {anns.map((a) => (
                <li key={a.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-baseline justify-between gap-2"><span className="text-sm font-medium">{a.title}</span><span className="text-xs text-mute">{ago(a.ts)}</span></div>
                  <p className="mt-1 text-sm text-mute">{a.body}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-line px-1 pb-1 pt-3 font-mono text-[11px] uppercase tracking-widest text-mute">Wallets you follow</div>
          {!address ? (
            <p className="px-1 pb-1 text-sm text-mute">Connect a wallet to see what the wallets you follow are doing.</p>
          ) : events.length === 0 ? (
            <p className="px-1 pb-1 text-sm text-mute">
              No activity yet. It shows here when a wallet you follow opens or closes a position. No DEX is integrated yet, so nothing can be detected today.
            </p>
          ) : (
            <ul className="space-y-1">
              {events.slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm">
                  <Avatar address={e.actor} username={e.actorProfile.username ?? undefined} src={e.actorProfile.avatar} size={26} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{e.actorProfile.username ? `@${e.actorProfile.username}` : short(e.actor)}</span>{" "}
                    <span className="text-mute">{e.type === "position_opened" ? "opened" : "closed"} a position{e.pool ? ` in ${e.pool}` : ""}</span>
                  </span>
                  <span className="text-xs text-mute">{ago(e.ts)}</span>
                </li>
              ))}
            </ul>
          )}
          {address && (
            <Link to="/following" onClick={() => setOpen(false)} className="mt-3 block rounded-lg border border-line py-2 text-center text-sm hover:bg-ink/5">
              Open Following
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function WithWallet() {
  const { address, isConnected } = useAppKitAccount();
  return <Bell address={isConnected ? address : undefined} />;
}

/** Team messages for everyone, plus followed-wallet activity once a wallet is connected. */
export default function NotificationBell() {
  return walletReady ? <WithWallet /> : <Bell />;
}
