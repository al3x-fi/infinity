import { NavLink, Outlet, useLocation } from "react-router-dom";
import ConnectButton, { useIsConnected } from "./ConnectButton";
import Footer from "./Footer";

const baseLinks = [
  ["/discover", "Pools"],
  ["/studio", "Liquidity Studio"],
  ["/analytics", "Analytics"],
  ["/docs", "Docs"],
];

// Short labels for the phone-width bottom bar.
const baseTabs = [
  ["/discover", "Pools"],
  ["/studio", "Studio"],
  ["/analytics", "Analytics"],
];

export default function Layout() {
  const { pathname } = useLocation();
  const connected = useIsConnected();
  // The Profile tab only appears once a wallet is connected.
  const links = connected ? [...baseLinks.slice(0, 3), ["/profile", "Profile"], baseLinks[3]] : baseLinks;
  const tabs = connected ? [...baseTabs, ["/profile", "Profile"]] : baseTabs;
  return (
    <div className="min-h-screen">
      <div className="bg-warn/10 text-warn text-center text-xs py-1.5">
        DEMONSTRATION DATA — no blockchain connection yet. Nothing here is real, and no transactions can be sent.
      </div>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-8 px-4 py-4">
          <NavLink to="/" aria-label="INFINITY home">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="INFINITY" className="h-7 w-auto md:h-9" />
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
          <div className="ml-auto flex items-center gap-2">
            <ConnectButton />
          </div>
        </div>
      </header>
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
