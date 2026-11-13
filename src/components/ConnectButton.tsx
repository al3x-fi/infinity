import { Link } from "react-router-dom";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { walletReady } from "../wallet/appkit";

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function Live() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  if (isConnected && address) {
    return (
      <Link to="/profile" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-ink/5">
        <span className="text-up">●</span> {short(address)}
      </Link>
    );
  }
  return (
    <button onClick={() => open({ view: "Connect" })} className="rounded-lg bg-violet px-3 py-1.5 text-sm font-medium">
      Connect wallet
    </button>
  );
}

export default function ConnectButton() {
  if (!walletReady) {
    return (
      <Link to="/profile" className="rounded-lg border border-line px-3 py-1.5 text-sm text-mute"
        title="WalletConnect needs a project ID. Open Profile for setup steps.">
        Connect wallet
      </Link>
    );
  }
  return <Live />;
}
