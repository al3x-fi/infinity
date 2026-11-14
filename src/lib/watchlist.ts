import { useCallback, useEffect, useState } from "react";

const KEY = "infinity-watchlist";
const EVENT = "infinity-watchlist-change";

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Starred pool ids, kept in this browser only (no account, no server). */
export function useWatchlist() {
  const [ids, setIds] = useState<string[]>(read);

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);

  const toggle = useCallback((id: string) => {
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable: keep in memory */ }
    setIds(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { ids, has: (id: string) => ids.includes(id), toggle };
}
