import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppKit, useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { walletReady } from "../wallet/appkit";
import Avatar from "./Avatar";
import { useProfile } from "../lib/profile";

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Wallet menu: once connected, Profile, Referrals and the public page live here. */
function Live() {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAppKitAccount();
  const profile = useProfile(address);
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [menu]);

  if (!isConnected || !address) {
    return (
      <button onClick={() => open({ view: "Connect" })} className="rounded-xl bg-violet px-3.5 py-2.5 text-sm font-medium md:px-5 md:text-base">
        Connect wallet
      </button>
    );
  }

  const go = (to: string) => { setMenu(false); nav(to); };
  const item = "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-ink/5";
  return (
    <div ref={box} className="relative">
      <button onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu}
        className="flex items-center gap-2 rounded-xl border border-line py-1 pl-1.5 pr-2.5 text-sm hover:bg-ink/5 md:gap-2.5 md:py-1.5 md:pl-2 md:pr-3 md:text-base">
        <Avatar address={address} username={profile?.username} src={profile?.avatar} size={30} />
        {profile ? <span>@{profile.username}</span> : <span><span className="text-up">●</span> {short(address)}</span>}
        <span className="text-xs text-mute">{menu ? "▴" : "▾"}</span>
      </button>
      {menu && (
        <div role="menu" className="page-in absolute right-0 top-full z-20 mt-2 w-60 rounded-2xl border border-line bg-panel p-2 shadow-2xl">
          <div className="px-3 pb-2 pt-1">
            <div className="text-sm font-medium">{profile ? `@${profile.username}` : "No username yet"}</div>
            <div className="font-mono text-xs text-mute">{short(address)}</div>
          </div>
          <div className="border-t border-line pt-1">
            <button role="menuitem" className={item} onClick={() => go("/profile")}>Profile</button>
            <button role="menuitem" className={item} onClick={() => go("/referrals")}>Referrals</button>
          </div>
          <div className="border-t border-line pt-1">
            <button role="menuitem" className={`${item} text-mute`} onClick={() => { setMenu(false); disconnect(); }}>Disconnect</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConnectButton() {
  if (!walletReady) {
    return (
      <Link to="/profile" className="rounded-xl border border-line px-3.5 py-2.5 text-sm text-mute md:px-5 md:text-base"
        title="WalletConnect needs a project ID. Open Profile for setup steps.">
        Connect wallet
      </Link>
    );
  }
  return <Live />;
}
