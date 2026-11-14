import { useState } from "react";
import { Link } from "react-router-dom";
import { TOKEN_CA, TOKEN_SYMBOL } from "../config/token";

const columns: { title: string; links: [string, string][] }[] = [
  { title: "Product", links: [["/discover", "Pools"], ["/studio", "Liquidity Studio"], ["/profile", "Profile"]] },
  { title: "Resources", links: [["/analytics", "Analytics"], ["/referrals", "Referrals"], ["/docs", "Docs"]] },
];

function TokenCA() {
  const [copied, setCopied] = useState(false);
  const set = TOKEN_CA.length > 0;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN_CA);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <div className="mt-5 inline-flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm">
      <span className="font-medium">${TOKEN_SYMBOL} CA</span>
      <span className={`font-mono ${set ? "" : "text-mute"}`}>{set ? `${TOKEN_CA.slice(0, 6)}…${TOKEN_CA.slice(-4)}` : "TBA"}</span>
      <button onClick={copy} disabled={!set} title={set ? "Copy contract address" : "No token launched yet"}
        className="text-xs text-mute enabled:hover:text-ink disabled:opacity-50">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-[1fr_auto]">
        <div>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="INFINITY" className="h-7 w-auto" />
          <p className="mt-4 text-mute">The concentrated-liquidity terminal for Zero.</p>
          <TokenCA />
        </div>
        <div className="flex gap-12 md:gap-16">
          {columns.map((c) => (
            <div key={c.title}>
              <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-mute">{c.title}</div>
              <ul className="space-y-2 text-sm">
                {c.links.map(([to, label]) => (
                  <li key={to}><Link to={to} className="hover:text-mute">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-mute">Community</div>
            <span className="text-sm text-mute" title="Social channels are not set up yet">Coming soon</span>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-mute md:flex-row md:justify-between">
          <span className="font-mono">© 2026 INFINITY · demo preview, fabricated data</span>
          <span>Experimental software on a new chain. Provide liquidity only with funds you can afford to lose.</span>
        </div>
      </div>
    </footer>
  );
}
