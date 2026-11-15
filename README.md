<p align="center"><img src="public/logo.png" alt="INFINITY" width="320"></p>

# INFINITY

A concentrated liquidity terminal being built for the **Zero** network (LayerZero). Find pools, shape your liquidity, review risk, and manage positions from one interface — self-custodial, always.

> **Status: demo preview.** All pools, prices and charts are sample data and no transaction can be sent yet. Zero's chain ID, RPC and DEX deployments have not been verified from official sources, so INFINITY does not connect to Zero. See [`docs/PHASE1-RESEARCH.md`](docs/PHASE1-RESEARCH.md).

## Features

- **Discover** pools from integrated DEXs
- **Liquidity Studio** — Spot, Curve, Bid-Ask and Custom distributions
- **Token safety** checks before you deposit
- **Profile / My Positions**, fees and balances per wallet
- **Watchlist** — star pools in Discover and pool pages (saved in your browser)
- **Public portfolios** — read-only view of any wallet at `/u/:address`, on-chain data only
- **Referrals** — share a `?ref=` link; the referrer code is remembered locally (no backend yet)
- **Wallet profiles** — pick a username and avatar; changes require a wallet signature (plain-text message, no keys ever shared)
- **Follow, notifications and search** — follow wallets, a notification bell with team announcements, and a global search
- **Analytics** and in-app **Docs**
- Wallet connect via WalletConnect (Reown AppKit) — never asks for a seed phrase or private key

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS 4 · React Router · Recharts · ethers v6 · Reown AppKit · Supabase (admin wallet tracker)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

Environment variables (see `.env.example`):

| Variable | Purpose |
|---|---|
| `VITE_WALLETCONNECT_PROJECT_ID` | Public project ID from [dashboard.reown.com](https://dashboard.reown.com) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Admin wallet tracker (`/admin`). Run `supabase-admin.sql` first. Use the **anon** key only — never the service_role key. |

Build for production: `npm run build`

## Repository layout

```
src/            App source (pages, components, adapters, wallet, docs content)
waitlist/       Zero-dependency waitlist server (node server.cjs)
server/profiles/ Profiles API (username + avatar per wallet, signature-verified) + systemd unit
docs/           Research and architecture notes
posters/        Brand and social assets
supabase-*.sql  Database setup
```

## Security

Never commit `.env*` files or keys. Found a vulnerability? Please open a private security advisory on this repo.

## Links

Follow the project on X for updates.
