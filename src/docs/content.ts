// Documentation content. Written to match what INFINITY actually does today:
// it is a demo build, with no DEX integrated and Zero network details unverified.

export type Block =
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "note"; text: string }
  | { t: "code"; text: string };

export interface Section { id: string; title: string; blocks: Block[] }
export interface DocPage { slug: string; title: string; group: string; intro: string; sections: Section[] }

export const docs: DocPage[] = [
  {
    slug: "introduction", title: "Introduction", group: "Getting started",
    intro: "INFINITY is a concentrated liquidity terminal being built for the Zero network.",
    sections: [
      { id: "what", title: "What INFINITY does", blocks: [
        { t: "p", text: "INFINITY lets you find liquidity pools, choose a price range and a liquidity shape, and manage the resulting positions from one interface. You provide your own assets and earn the trading fees of the underlying pool." },
        { t: "ul", items: ["Discover pools from the DEXs INFINITY integrates.", "Shape liquidity with Spot, Curve, Bid-Ask or Custom distributions.", "Review token and pool risk before you deposit.", "Track positions, fees and balances for your wallet."] },
      ] },
      { id: "status", title: "Current status", blocks: [
        { t: "note", text: "INFINITY is a demo preview. Every pool, price and chart you see is fabricated sample data, and no transaction can be sent yet." },
        { t: "p", text: "Zero's chain ID, RPC and DEX deployments have not been verified from official sources, so INFINITY does not connect to Zero and lists no live pools. See Status and roadmap for what comes next." },
      ] },
      { id: "custody", title: "Self-custody", blocks: [
        { t: "p", text: "INFINITY never asks for a seed phrase or private key and never holds your funds. Every transaction is signed in your own wallet, and you see it before approving." },
      ] },
    ],
  },
  {
    slug: "quickstart", title: "Quickstart", group: "Getting started",
    intro: "Connect a wallet and look around.",
    sections: [
      { id: "connect", title: "Connect a wallet", blocks: [
        { t: "p", text: "Select Connect wallet in the top bar. INFINITY uses WalletConnect, so you can use a browser extension such as MetaMask or scan a QR code with a mobile wallet." },
        { t: "note", text: "Wallet testing mode: you can connect on Ethereum or Sepolia. Zero will be added once its official network details are verified." },
      ] },
      { id: "profile", title: "Your profile", blocks: [
        { t: "p", text: "After connecting, open Profile to see your address, the connected network and your balance in that network's native coin. This page is read-only." },
      ] },
      { id: "explore", title: "Explore pools", blocks: [
        { t: "p", text: "Pools lists demo pools you can search, filter by DEX and fee tier, and sort. Open a pool to see its chart, your liquidity shape and the add-liquidity form. The form is a preview: it cannot create a position yet." },
      ] },
    ],
  },
  {
    slug: "concentrated-liquidity", title: "Concentrated liquidity", group: "Concepts",
    intro: "How a price range changes what your liquidity earns and risks.",
    sections: [
      { id: "basics", title: "The idea", blocks: [
        { t: "p", text: "In a concentrated liquidity pool you choose a price range for your capital. Liquidity outside the range does nothing, so the same deposit earns more fees per dollar while the price stays inside it." },
      ] },
      { id: "math", title: "The mathematics", blocks: [
        { t: "p", text: "For Uniswap V3 style pools, price is p = 1.0001^tick. For a range from Pa to Pb and a current price P between them, the amounts needed for liquidity L are:" },
        { t: "code", text: "token0 = L * (sqrt(Pb) - sqrt(P)) / (sqrt(P) * sqrt(Pb))\ntoken1 = L * (sqrt(P) - sqrt(Pa))" },
        { t: "p", text: "Below the range a position holds only token0. Above it, only token1. Range ticks must be multiples of the pool's tick spacing." },
      ] },
      { id: "oor", title: "Out-of-range risk", blocks: [
        { t: "p", text: "When the price leaves your range you stop earning fees, and your position becomes entirely the token that lost value. Narrow ranges earn more while in range but leave it sooner." },
        { t: "note", text: "Fee income is never guaranteed and can be smaller than losses from price movement. INFINITY does not promise any APR." },
      ] },
    ],
  },
  {
    slug: "liquidity-shapes", title: "Liquidity shapes", group: "Concepts",
    intro: "Spot, Curve, Bid-Ask and Custom distributions.",
    sections: [
      { id: "spot", title: "Spot", blocks: [{ t: "p", text: "Liquidity is spread evenly across the range. It is the simplest shape and needs a single position." }] },
      { id: "curve", title: "Curve", blocks: [{ t: "p", text: "Liquidity is weighted toward the current price, where most trading happens. It earns more while the price is calm and thins out toward the edges." }] },
      { id: "bidask", title: "Bid-Ask", blocks: [{ t: "p", text: "Liquidity is weighted toward the lower and upper boundaries. It suits traders who expect large moves and want to buy or sell into them." }] },
      { id: "custom", title: "Custom", blocks: [{ t: "p", text: "You set your own range and the weight of each bin in the Liquidity Studio." }] },
      { id: "cost", title: "Cost of shaping", blocks: [
        { t: "p", text: "On Uniswap V3 style DEXs one position covers one range. A shaped distribution is built from several adjacent positions, one per bin, so it takes more transactions and more gas than Spot. INFINITY shows the number of positions before you confirm." },
      ] },
    ],
  },
  {
    slug: "fees", title: "Fees", group: "Concepts",
    intro: "What you earn and what you pay.",
    sections: [
      { id: "pool-fees", title: "Pool fees", blocks: [{ t: "p", text: "Each pool charges a fee tier on every trade. Liquidity providers in range share those fees in proportion to their liquidity. The fee tier is fixed by the pool." }] },
      { id: "infinity-fees", title: "INFINITY fees", blocks: [
        { t: "p", text: "INFINITY currently charges nothing. If optional management fees are added later, they will be shown before you sign, and basic liquidity management will remain available without them." },
      ] },
      { id: "apr", title: "About APR figures", blocks: [
        { t: "p", text: "Where shown, fee APR is a naive projection: the last 24 hours of fees, scaled to a year, divided by pool liquidity. It can differ greatly from real returns. When volume or liquidity data is unavailable, INFINITY shows N/A and never a zero." },
      ] },
    ],
  },
  {
    slug: "supported-dexs", title: "Supported DEXs", group: "Platform",
    intro: "INFINITY lists pools only from DEXs it explicitly integrates.",
    sections: [
      { id: "rule", title: "The rule", blocks: [
        { t: "p", text: "INFINITY does not list every pool on Zero. A DEX appears only after it has a dedicated adapter and its contracts have been verified from official sources." },
        { t: "note", text: "No DEX is integrated yet. The Discover list shows labelled demo pools." },
      ] },
      { id: "adapters", title: "Adapters", blocks: [
        { t: "p", text: "Each DEX has its own adapter that knows how to discover pools, read prices and liquidity, and build position transactions. Adapters declare capabilities, so the interface only offers actions that DEX supports." },
        { t: "p", text: "Adding a DEX means adding one adapter and registering it. It does not require rebuilding the application." },
      ] },
      { id: "requirements", title: "Requirements for a DEX", blocks: [
        { t: "ul", items: ["Contracts verified on the official block explorer.", "A position manager that INFINITY can build transactions for.", "A reliable way to discover pools, such as factory events.", "Published audits where available."] },
      ] },
    ],
  },
  {
    slug: "token-safety", title: "Token safety", group: "Platform",
    intro: "An explainable risk report, not a safety label.",
    sections: [
      { id: "checks", title: "What is checked", blocks: [
        { t: "ul", items: ["Top holder concentration and deployer holdings.", "Contract ownership, mint and blacklist permissions.", "Trading restrictions.", "Sniper wallets and bundled launch activity.", "Liquidity history and removal events."] },
      ] },
      { id: "meaning", title: "What results mean", blocks: [
        { t: "p", text: "Each check is shown as no issue found, concern, or no data. INFINITY never calls a token safe: passing a check only means that check found nothing." },
        { t: "note", text: "Checks without data are shown as unknown, and unknown is not the same as safe. Today the report uses demo data." },
      ] },
    ],
  },
  {
    slug: "security", title: "Wallet and security", group: "Platform",
    intro: "How INFINITY handles your wallet and transactions.",
    sections: [
      { id: "wallet", title: "Wallet connection", blocks: [
        { t: "p", text: "Connecting a wallet lets INFINITY read your address and balance. It cannot move funds or approve anything on its own." },
      ] },
      { id: "tx", title: "Transaction safeguards", blocks: [
        { t: "p", text: "When transactions are enabled, INFINITY is designed to apply these protections:" },
        { t: "ul", items: ["Exact-amount token approvals by default.", "Slippage limits and deadlines on every position change.", "Ownership checks before acting on a position.", "Chain ID checks before each transaction.", "Simulation before you are asked to sign."] },
      ] },
      { id: "contracts", title: "Contracts", blocks: [
        { t: "p", text: "INFINITY does not deploy custom contracts that hold user funds. Positions are created through the integrated DEX's own audited contracts." },
      ] },
    ],
  },
  {
    slug: "roadmap", title: "Status and roadmap", group: "Project",
    intro: "What exists and what is next.",
    sections: [
      { id: "done", title: "Built", blocks: [
        { t: "ul", items: ["Interface: pools, pool details, Liquidity Studio, positions, token safety, analytics, profile.", "Strategy mathematics and distribution previews.", "Wallet connection with WalletConnect in testing mode.", "Adapter interface and registry."] },
      ] },
      { id: "next", title: "Next", blocks: [
        { t: "ul", items: ["Verify Zero's chain ID, RPC and explorer from official sources.", "Integrate the first verified DEX and show live pools.", "Position creation, fee collection and withdrawal, tested on a testnet first.", "Indexer for positions, volume and token safety data.", "Independent security review before any mainnet use."] },
      ] },
    ],
  },
  {
    slug: "faq", title: "FAQ", group: "Project",
    intro: "Common questions.",
    sections: [
      { id: "real", title: "Is the data real?", blocks: [{ t: "p", text: "Not yet. Pools, prices and charts are fabricated demo data, labelled as such throughout the app. Your wallet balance on the Profile page is real." }] },
      { id: "zero", title: "Does it work on Zero?", blocks: [{ t: "p", text: "Not yet. Zero's network details have not been verified, so wallets connect on Ethereum or Sepolia for testing only." }] },
      { id: "funds", title: "Can INFINITY take my funds?", blocks: [{ t: "p", text: "No. It never holds funds or keys, and nothing can be sent without your wallet's explicit approval. Today it cannot send transactions at all." }] },
      { id: "advice", title: "Is this financial advice?", blocks: [{ t: "p", text: "No. Providing liquidity carries risk, including loss of funds. Use only funds you can afford to lose." }] },
    ],
  },
];
