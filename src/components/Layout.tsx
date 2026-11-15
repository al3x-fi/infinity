import { NavLink, Outlet, useLocation } from "react-router-dom";
import ConnectButton from "./ConnectButton";
import Footer from "./Footer";
import FirstConnectPrompt from "./FirstConnectPrompt";
import SearchButton from "./SearchButton";
import NotificationBell from "./NotificationBell";
import { walletReady } from "../wallet/appkit";

const links = [
  ["/discover", "Pools"],
  ["/studio", "Liquidity Studio"],
  ["/analytics", "Analytics"],
  ["/docs", "Docs"],
];

// Short labels for the phone-width bottom bar.
const tabs = [
  ["/discover", "Pools"],
  ["/studio", "Studio"],
  ["/analytics", "Analytics"],
];

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen">
      <div className="bg-warn/10 text-warn text-center text-xs py-1.5">
        DEMONSTRATION DATA — no blockchain connection yet. Nothing here is real, and no transactions can be sent.
      </div>
      <header className="border-b border-line">
        <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:flex-wrap md:gap-8 md:py-4">
          <NavLink to="/" aria-label="INFINITY home" className="shrink-0">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="INFINITY" className="h-5 w-auto sm:h-6 md:h-9" />
          </NavLink>
          <nav className="hidden flex-wrap gap-1 text-base md:flex">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 ${isActive ? "bg-ink/10 text-ink" : "text-mute hover:bg-ink/5 hover:text-ink"}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-2">
            <SearchButton />
            <NotificationBell />
            <ConnectButton />
          </div>
        </div>
      </header>
      {walletReady && <FirstConnectPrompt />}
      <main key={pathname} className="page-in mx-auto max-w-7xl space-y-4 px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
      <div className="pb-14 md:pb-0"><Footer /></div>
      <nav className="fixed inset-x-0 bottom-0 z-10 grid auto-cols-fr grid-flow-col border-t border-line bg-panel/95 backdrop-blur md:hidden">
        {tabs.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `border-t-2 py-3 text-center text-[11px] ${isActive ? "border-ink text-ink" : "border-transparent text-mute"}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
