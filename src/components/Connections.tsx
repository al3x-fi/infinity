import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import { short } from "./ConnectButton";
import { fetchCounts, fetchList, type Brief } from "../lib/social";

export function Chip({ p }: { p: Brief }) {
  return (
    <Link to={`/u/${p.username ?? p.address}`} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:bg-ink/5">
      <Avatar address={p.address} username={p.username ?? undefined} src={p.avatar} size={28} />
      <span>{p.username ? `@${p.username}` : short(p.address)}</span>
    </Link>
  );
}

/** Follower and following counts, expandable into lists. Follows are public. */
export default function Connections({ address, followingHref }: { address: string; followingHref?: string }) {
  const [counts, setCounts] = useState<{ following: number; followers: number } | null>(null);
  const [open, setOpen] = useState<"followers" | "following" | null>(null);
  const [list, setList] = useState<Brief[] | null>(null);
  useEffect(() => {
    setCounts(null); setOpen(null);
    let stale = false;
    const load = () => fetchCounts(address).then((c) => { if (!stale) setCounts(c); });
    load();
    window.addEventListener("infinity-social-change", load);
    return () => { stale = true; window.removeEventListener("infinity-social-change", load); };
  }, [address]);
  useEffect(() => {
    setList(null);
    if (open) fetchList(open, address).then(setList);
  }, [open, address]);
  if (!counts) return null;
  const tab = (k: "followers" | "following", n: number) => k === "following" && followingHref ? (
    // On your own profile, "following" opens the full Following page: activity, unfollow and alerts.
    <Link to={followingHref} className="rounded-full border border-line px-4 py-1.5 text-sm text-mute hover:text-ink">
      <span className="font-medium text-ink">{n}</span> {k}
    </Link>
  ) : (
    <button onClick={() => setOpen(open === k ? null : k)} className={`rounded-full border px-4 py-1.5 text-sm ${open === k ? "border-ink" : "border-line text-mute hover:text-ink"}`}>
      <span className="font-medium text-ink">{n}</span> {k}
    </button>
  );
  return (
    <div className="space-y-3">
      <div className="flex gap-2">{tab("followers", counts.followers)}{tab("following", counts.following)}</div>
      {open && (
        <div className="flex flex-wrap gap-2">
          {list === null ? <span className="text-sm text-mute">Loading…</span>
            : list.length === 0 ? <span className="text-sm text-mute">Nobody yet.</span>
            : list.map((p) => <Chip key={p.address} p={p} />)}
        </div>
      )}
    </div>
  );
}
