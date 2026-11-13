import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppKitAccount } from "@reown/appkit/react";
import { walletReady } from "../wallet/appkit";
import { short } from "../components/ConnectButton";
import { demoPools, demoPositions } from "../demo/data";
import { Badge, Notice, Panel, Stat } from "../components/ui";
import { fmtNum, fmtUsd } from "../lib/liquidity";

function WalletStatus() {
  const { address, isConnected } = useAppKitAccount();
  return (
    <Notice>
      {isConnected && address ? (
        <>Connected as {short(address)}. No DEX is integrated yet, so no positions can be looked up. See <Link className="underline" to="/profile">Profile</Link> for your balance.</>
      ) : (
        <>No wallet is connected, so there are no real positions to show. Connect a wallet from the top bar.</>
      )}
    </Notice>
  );
}

export default function MyPositions() {
  const [preview, setPreview] = useState(false);
  return (
    <>
      <h1 className="text-2xl font-medium">My Positions</h1>
      {walletReady ? <WalletStatus /> : (
        <Notice>No wallet is connected, so there are no real positions to show. Live mode will list only positions your wallet owns on registered DEXs.</Notice>
      )}
      <label className="flex items-center gap-2 text-sm text-mute">
        <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
        Show example layout with fabricated demo positions
      </label>
      {!preview && <Panel><p className="text-mute">No positions.</p></Panel>}
      {preview && demoPositions.map((pos) => {
        const pool = demoPools.find((p) => p.id === pos.poolId)!;
        const inRange = pool.price >= pos.lower && pool.price <= pos.upper;
        const pnl = ((pos.valueUsd + pos.collectedFeesUsd + pos.unclaimedFeesUsd - pos.depositedUsd) / pos.depositedUsd) * 100;
        return (
          <Panel key={pos.tokenId}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">{pool.pair.join("/")}</span>
              <Badge tone="violet">{pool.dex}</Badge>
              <Badge>NFT #{pos.tokenId} (demo)</Badge>
              <Badge tone={inRange ? "up" : "warn"}>{inRange ? "In range" : "Out of range"}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Value" value={fmtUsd(pos.valueUsd)} />
              <Stat label="Deposited" value={fmtUsd(pos.depositedUsd)} />
              <Stat label="Range" value={`${fmtNum(pos.lower, 4)} – ${fmtNum(pos.upper, 4)}`} />
              <Stat label="Current price" value={fmtNum(pool.price, 6)} />
              <Stat label="Unclaimed fees" value={fmtUsd(pos.unclaimedFeesUsd)} />
              <Stat label="Collected fees" value={fmtUsd(pos.collectedFeesUsd)} />
              <div>
                <div className="text-xs text-mute">Performance (incl. fees)</div>
                <div className={pnl >= 0 ? "font-semibold text-up" : "font-semibold text-down"}>{pnl.toFixed(2)}%</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Add liquidity", "Remove liquidity", "Collect fees", "Withdraw", "History"].map((a) => (
                <button key={a} disabled title="Needs wallet + DEX adapter" className="rounded-lg border border-line px-3 py-1.5 text-sm text-mute">{a}</button>
              ))}
            </div>
          </Panel>
        );
      })}
    </>
  );
}
