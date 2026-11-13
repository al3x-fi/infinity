import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { mainnet, sepolia } from "@reown/appkit/networks";

// WalletConnect project ID from https://dashboard.reown.com (free, public value).
export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
export const walletReady = Boolean(projectId);

// TEMPORARY networks, used only so a wallet can connect and show a balance.
// Zero is not listed: its chain ID and RPC are not verified yet (see docs/PHASE1-RESEARCH.md).
// Add Zero here once official values exist.
if (projectId) {
  createAppKit({
    adapters: [new EthersAdapter()],
    networks: [mainnet, sepolia],
    projectId,
    metadata: {
      name: "INFINITY",
      description: "Advanced Liquidity Management on Zero",
      url: window.location.origin,
      icons: [`${window.location.origin}/icon.png`],
    },
    // Self-custody wallets only: no email or social login.
    features: { analytics: false, email: false, socials: false, onramp: false, swaps: false },
    themeMode: "light",
  });
}
