import { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { PageHero, Panel } from "../components/ui";
import CopyField from "../components/CopyField";
import { walletReady } from "../wallet/appkit";
import { getMyCode, getReferrer, isValidCode, refLink, setMyCode } from "../lib/referral";

/** Only mounted when AppKit is configured, because the hook needs it. */
function WalletCode({ onUse }: { onUse: (a: string) => void }) {
  const { address, isConnected } = useAppKitAccount();
  if (!isConnected || !address) return null;
  return (
    <button onClick={() => onUse(address)} className="rounded-xl border border-line px-4 py-2 text-sm text-mute hover:text-ink">
      Use my wallet address as my code
    </button>
  );
}

export default function Referrals() {
  const [code, setCode] = useState(getMyCode());
  const [draft, setDraft] = useState(getMyCode());
  const referrer = getReferrer();
  const ok = code !== "" && isValidCode(code);

  const save = (c: string) => { setDraft(c); if (isValidCode(c)) { setCode(c); setMyCode(c); } };

  return (
    <>
      <PageHero
        title="Referrals"
        intro="Share your link. When someone arrives through it, their browser remembers your code. Rewards are not live yet."
        note="INFINITY charges a 0% fee today, so there is nothing to share and no earnings are tracked. This page only creates and remembers links."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Your referral link">
          <div className="space-y-3 text-sm">
            <label className="block text-mute">Your code (3 to 32 letters, numbers, - or _), or a wallet address
              <input className="mt-1 w-full" value={draft} onChange={(e) => save(e.target.value.trim())} placeholder="e.g. suhair" />
            </label>
            {draft !== "" && !isValidCode(draft) && <p className="text-xs text-down">Use 3 to 32 letters, numbers, - or _.</p>}
            {walletReady && <WalletCode onUse={save} />}
            {ok ? <CopyField value={refLink(code)} /> : <p className="text-xs text-mute">Enter a code to get your link.</p>}
          </div>
        </Panel>
        <Panel title="How you arrived">
          <p className="text-sm text-mute">
            {referrer ? <>You came through code <span className="font-mono text-ink">{referrer}</span>. It is saved in this browser only.</> : "You did not arrive through a referral link."}
          </p>
          <p className="mt-3 text-xs text-mute">
            Codes are stored in your own browser. Counting referrals and paying rewards needs a server and a fee, neither of which exists yet.
          </p>
        </Panel>
      </div>
    </>
  );
}
