import { useEffect, useState } from "react";
import { useAppKit, useAppKitAccount, useAppKitNetwork, useAppKitProvider, useDisconnect } from "@reown/appkit/react";
import { BrowserProvider, formatEther, type Eip1193Provider } from "ethers";
import { PageHero, Panel, Stat } from "../components/ui";
import { adapters } from "../adapters/registry";
import type { PositionInfo } from "../adapters/types/DexAdapter";
import { walletReady } from "../wallet/appkit";
import { short } from "../components/ConnectButton";
import { Link } from "react-router-dom";
import CopyField from "../components/CopyField";
import ProfileEditor from "../components/ProfileEditor";
import { portfolioLink } from "../lib/referral";

function Setup() {
  return (
    <Panel title="Set up WalletConnect">
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>Create a free project at <span className="font-medium">dashboard.reown.com</span> and copy its Project ID.</li>
        <li>In that project, add this site's address to the allowed domains.</li>
        <li>Put the ID in a file named <code className="rounded bg-ink/5 px-1">.env.local</code> in the project folder: <code className="rounded bg-ink/5 px-1">VITE_WALLETCONNECT_PROJECT_ID=your-id</code></li>
        <li>Restart <code className="rounded bg-ink/5 px-1">npm run dev</code>.</li>
      </ol>
      <p className="mt-3 text-xs text-mute">The Project ID is a public identifier, not a secret. INFINITY never asks for a seed phrase or private key.</p>
    </Panel>
  );
}

/** Reads real data from the connected wallet. Read-only: nothing here can send a transaction. */
function Connected() {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork, chainId } = useAppKitNetwork();
  const { walletProvider } = useAppKitProvider<Eip1193Provider>("eip155");

  const [balance, setBalance] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const [positions, setPositions] = useState<PositionInfo[] | null>(null);

  useEffect(() => {
    setBalance(null);
    setBalanceError(false);
    if (!address || !walletProvider) return;
    let stale = false;
    new BrowserProvider(walletProvider).getBalance(address)
      .then((b) => { if (!stale) setBalance(formatEther(b)); })
      .catch(() => { if (!stale) setBalanceError(true); });
    return () => { stale = true; };
  }, [address, walletProvider, chainId]);

  useEffect(() => {
    setPositions(null);
    if (!address) return;
    let stale = false;
    // Only adapters registered in src/adapters/registry.ts are queried.
    Promise.all(adapters.filter((a) => a.capabilities.concentratedLiquidity).map((a) => a.getPositions(address as `0x${string}`)))
      .then((all) => { if (!stale) setPositions(all.flat()); })
      .catch(() => { if (!stale) setPositions([]); });
    return () => { stale = true; };
  }, [address]);

  if (!isConnected || !address) {
    return (
      <Panel>
        <p className="mb-3 text-sm text-mute">Connect a wallet to see your balance and positions.</p>
        <button onClick={() => open({ view: "Connect" })} className="rounded-lg bg-violet px-4 py-2 text-sm font-medium">Connect wallet</button>
      </Panel>
    );
  }

  const symbol = caipNetwork?.nativeCurrency.symbol ?? "";
  return (
    <>
      <Panel title="Your profile">
        <ProfileEditor address={address} />
      </Panel>

      <Panel title="Wallet" right={<button onClick={() => disconnect()} className="text-xs text-mute hover:text-ink">Disconnect</button>}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Stat label="Address" value={short(address)} />
          <Stat label="Network" value={caipNetwork?.name ?? "Unknown"} />
          <Stat
            label={`Balance${symbol ? ` (${symbol})` : ""}`}
            value={balanceError ? "N/A" : balance === null ? "Loading…" : Number(balance).toLocaleString(undefined, { maximumFractionDigits: 5 })}
          />
        </div>
        <p className="mt-3 break-all text-xs text-mute">{address}</p>
      </Panel>

      <Panel title="Positions on supported DEXs">
        {adapters.length === 0 ? (
          <p className="text-sm text-mute">
            No DEX is integrated yet, so there are no positions to look up. This is not the same as having none: once a verified DEX
            adapter is added, your positions from it will appear here.
          </p>
        ) : positions === null ? (
          <p className="text-sm text-mute">Loading…</p>
        ) : positions.length === 0 ? (
          <p className="text-sm text-mute">No positions found for this wallet on the supported DEXs.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {positions.map((p) => (
              <li key={`${p.dexKey}-${p.tokenId}`} className="py-2">
                {p.dexKey} · NFT #{p.tokenId.toString()} · ticks {p.tickLower} to {p.tickUpper}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Share">
        <p className="mb-2 text-xs text-mute">Anyone with this link can see your positions. It shows public on-chain data only and cannot move funds.</p>
        <CopyField value={portfolioLink(address)} />
        <Link to="/referrals" className="mt-3 inline-block text-xs text-mute hover:text-ink">Get a referral link →</Link>
      </Panel>

      <p className="text-xs text-mute">
        Token balances and transaction history are not shown yet: they need a verified token list and the indexer.
        This page is read-only and cannot move your funds.
      </p>
    </>
  );
}

export default function Profile() {
  return (
    <>
      <PageHero
        title="Profile"
        intro="Your wallet, balance and positions on supported DEXs. This page is read-only and can never move your funds."
        note="Wallet testing mode: you can connect on Ethereum or Sepolia. Zero is not available until its official network details are verified."
      />
      {walletReady ? <Connected /> : <Setup />}
    </>
  );
}
