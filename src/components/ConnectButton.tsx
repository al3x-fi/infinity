import { Link } from "react-router-dom";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { walletReady } from "../wallet/appkit";

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** True while a wallet is connected. `walletReady` never changes at runtime, so the hook order is stable. */
export function useIsConnected(): boolean {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return walletReady ? useAppKitAccount().isConnected : false;
}

function Live() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  if (isConnected && address) {
    return (
      <Link to="/profile" className="rounded-xl border border-line px-4 py-2.5 text-base hover:bg-ink/5">
        <span className="text-up">●</span> {short(address)}
      </Link>
    );
  }
  return (
    <button onClick={() => open({ view: "Connect" })} className="rounded-xl bg-violet px-5 py-2.5 text-base font-medium">
      Connect wallet
    </button>
  );
}

export default function ConnectButton() {
  if (!walletReady) {
    return (
      <Link to="/profile" className="rounded-xl border border-line px-5 py-2.5 text-base text-mute"
        title="WalletConnect needs a project ID. Open Profile for setup steps.">
        Connect wallet
      </Link>
    );
  }
  return <Live />;
}
