import { useState } from "react";
import { useAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { BrowserProvider, type Eip1193Provider } from "ethers";
import { setFollow, useFollowing } from "../lib/social";

/** Follow / Following toggle. Only rendered when AppKit is configured, because it needs the wallet to sign. */
export default function FollowButton({ target }: { target: string }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Eip1193Provider>("eip155");
  const { has, reload } = useFollowing(address);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isConnected && address && address.toLowerCase() === target.toLowerCase()) return null; // your own page

  const following = isConnected && address ? has(target) : false;
  const click = async () => {
    if (!isConnected || !address) return void open({ view: "Connect" });
    if (!walletProvider) return setError("Wallet not ready. Reconnect and try again.");
    setBusy(true); setError("");
    const signer = await new BrowserProvider(walletProvider).getSigner();
    const r = await setFollow(address, target, following ? "unfollow" : "follow", (m) => signer.signMessage(m));
    setBusy(false);
    if (!r.ok) return setError(r.error);
    reload();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={click} disabled={busy}
        className={`rounded-xl px-5 py-2 text-sm font-medium disabled:opacity-60 ${following ? "border border-line hover:bg-ink/5" : "bg-violet"}`}>
        {busy ? "Waiting for signature…" : following ? "Following ✓" : isConnected ? "Follow" : "Connect to follow"}
      </button>
      {error && <span className="text-xs text-down">{error}</span>}
    </div>
  );
}
