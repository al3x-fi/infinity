import { useState } from "react";

/**
 * Swap form for the pool's pair. This is the interface only: no DEX router is verified yet,
 * so there are no quotes and the action stays disabled. Rate, route and impact read "—".
 */
export default function SwapPanel({ pair }: { pair: [string, string] }) {
  const [flip, setFlip] = useState(false);
  const [amount, setAmount] = useState("");
  const [from, to] = flip ? [pair[1], pair[0]] : pair;

  const token = (sym: string) => (
    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-bg/60 px-3 py-2 text-sm font-medium">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] text-bg">{sym.slice(0, 2).toUpperCase()}</span>
      {sym}
    </div>
  );

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 text-sm font-medium">You pay</div>
        <div className="rounded-xl border border-line p-3">
          <div className="flex items-center gap-2">
            <input inputMode="decimal" placeholder="0.0" value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-2xl outline-none" />
            {token(from)}
          </div>
          <div className="mt-1 text-right text-xs text-mute">Balance —</div>
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={() => setFlip(!flip)} aria-label="Flip tokens"
          className="rounded-lg border border-line px-2.5 py-1 text-sm text-mute hover:text-ink">⇅</button>
      </div>

      <div>
        <div className="mb-1.5 text-sm font-medium">You receive</div>
        <div className="rounded-xl border border-line p-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 text-2xl text-mute">0.0</div>
            {token(to)}
          </div>
        </div>
      </div>

      <dl className="space-y-2 rounded-xl border border-line bg-bg/60 p-3 text-sm">
        {[["Rate", "—"], ["Route", "—"], ["Price impact", "—"], ["Min. received (0.5% slippage)", "—"]].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-mute">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <button disabled className="w-full rounded-full bg-violet py-3 font-medium disabled:opacity-50">Swap unavailable</button>
      <p className="text-xs text-mute">
        Quotes appear once a DEX router is verified and integrated. Until then nothing can be swapped, and the values above are blank, not zero.
      </p>
    </div>
  );
}
