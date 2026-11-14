import { useWatchlist } from "../lib/watchlist";

/** Star toggle for the pool watchlist. Safe to place inside clickable cards and rows. */
export default function StarButton({ id, className = "" }: { id: string; className?: string }) {
  const { has, toggle } = useWatchlist();
  const on = has(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Remove from watchlist" : "Add to watchlist"}
      title={on ? "Remove from watchlist" : "Add to watchlist"}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggle(id); }}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none transition-transform hover:scale-110 ${on ? "text-warn" : "text-mute hover:text-ink"} ${className}`}
    >
      {on ? "★" : "☆"}
    </button>
  );
}
