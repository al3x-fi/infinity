import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAddress } from "ethers";
import Avatar from "./Avatar";
import { short } from "./ConnectButton";
import { fetchByUsername, USERNAME_RE } from "../lib/profile";
import { searchProfiles, type Brief } from "../lib/social";

/** Search other people's profiles by username or wallet address. */
export default function SearchButton() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Brief[]>([]);
  const [note, setNote] = useState("");
  const box = useRef<HTMLDivElement>(null);

  const query = q.trim().replace(/^@/, "");
  const addr = Boolean(isAddress(query));

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);

  useEffect(() => {
    setNote("");
    if (addr || query.length < 2) { setHits([]); return; }
    let stale = false;
    const t = setTimeout(() => searchProfiles(query).then((h) => { if (!stale) setHits(h); }), 250);
    return () => { stale = true; clearTimeout(t); };
  }, [query, addr]);

  const go = (to: string) => { setOpen(false); setQ(""); setHits([]); nav(`/u/${to}`); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addr) return go(query);
    if (hits[0]) return go(hits[0].username ?? hits[0].address);
    if (USERNAME_RE.test(query.toLowerCase()) && (await fetchByUsername(query))) return go(query.toLowerCase());
    setNote("No profile found. Try a username or a full wallet address.");
  };

  return (
    <div ref={box} className="md:relative">
      <button onClick={() => setOpen(!open)} aria-label="Search profiles" aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-line hover:bg-ink/5 md:h-11 md:w-11">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
      </button>
      {open && (
        <div className="page-in absolute inset-x-4 top-full z-20 mt-2 rounded-2xl md:inset-x-auto md:right-0 md:w-96 border border-line bg-panel p-3 shadow-2xl">
          <form onSubmit={submit}>
            <input autoFocus className="w-full" placeholder="Search a username or paste a wallet address" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <div className="mt-2 space-y-1">
            {addr && (
              <button onClick={() => go(query)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-ink/5">
                <Avatar address={query} size={28} /> Open wallet <span className="font-mono text-xs text-mute">{short(query)}</span>
              </button>
            )}
            {hits.map((p) => (
              <button key={p.address} onClick={() => go(p.username ?? p.address)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-ink/5">
                <Avatar address={p.address} username={p.username ?? undefined} src={p.avatar} size={28} />
                <span className="font-medium">@{p.username}</span>
                <span className="font-mono text-xs text-mute">{short(p.address)}</span>
              </button>
            ))}
            {!addr && hits.length === 0 && query.length >= 2 && !note && <p className="px-2 py-1 text-xs text-mute">Press Enter to look up “{query}”.</p>}
            {note && <p className="px-2 py-1 text-xs text-down">{note}</p>}
            {query.length < 2 && !addr && <p className="px-2 py-1 text-xs text-mute">Type at least 2 letters of a username, or paste a full wallet address.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
