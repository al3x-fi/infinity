import { useState } from "react";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import LiquiditySphere from "../components/LiquiditySphere";
import PoolTicker from "../components/PoolTicker";
import { Link } from "react-router-dom";
import { buildBins, type Strategy } from "../lib/liquidity";

const shapes: { key: Strategy; label: string; text: string }[] = [
  { key: "spot", label: "Spot", text: "Liquidity spread evenly across your range. Simple and predictable." },
  { key: "curve", label: "Curve", text: "Liquidity piles up around the current price, where most trading happens." },
  { key: "bidask", label: "Bid-Ask", text: "Liquidity sits near the edges, ready to catch big moves in either direction." },
];

const features = [
  ["01", "Pool screening", "Browse pools from DEXs INFINITY has explicitly integrated. Missing data shows as unavailable, never as zero."],
  ["02", "Token safety", "An explainable risk report. A passed check means nothing was found by that check, not that a token is safe."],
  ["03", "Position shaping", "Preview how Spot, Curve, Bid-Ask or custom shapes distribute your capital before you sign anything."],
  ["04", "Self-custody", "You sign every transaction in your own wallet. INFINITY never holds your keys or your funds."],
];

const steps = [
  ["1", "Find a pool", "Filter supported pools by DEX, fee tier, volume and risk."],
  ["2", "Choose a shape", "Set your price range and pick how liquidity is distributed."],
  ["3", "Review and deposit", "Check amounts, fees and slippage, then confirm in your wallet."],
];

function ShapePreview() {
  const [s, setS] = useState<Strategy>("curve");
  const bins = buildBins(s, 0.7, 1.3, 1, 21, []);
  const max = Math.max(...bins.map((b) => b.weight));
  return (
    <div className="rounded-2xl border border-line bg-panel p-6">
      <div className="mb-4 flex gap-2">
        {shapes.map((x) => (
          <button key={x.key} onClick={() => setS(x.key)}
            className={`rounded-lg border px-4 py-1.5 text-sm ${s === x.key ? "border-cyan text-cyan" : "border-line text-mute"}`}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="flex h-40 items-end gap-1">
        {bins.map((b, i) => (
          <div key={i} className="flex-1 rounded-t bg-ink transition-all"
            style={{ height: `${(b.weight / max) * 100}%` }} />
        ))}
      </div>
      <p className="mt-4 text-sm text-mute">{shapes.find((x) => x.key === s)!.text}</p>
    </div>
  );
}

/** Fine converging lines that meet at one horizontal axis: liquidity concentrating at a price. */
const edge = "linear-gradient(to right, transparent, black 14%, black 86%, transparent)";
const fade = { maskImage: edge, WebkitMaskImage: edge };

function HeroArt() {
  const n = 28;
  const lines = Array.from({ length: n * 2 + 1 }, (_, k) => k - n);
  return (
    <svg viewBox="0 0 1200 220" className="breathe mx-auto mt-10 w-full" aria-hidden="true" preserveAspectRatio="none" style={fade}>
      {lines.map((k) => {
        const y = 110 + k * (100 / n);
        const o = 0.08 + 0.5 * (1 - Math.abs(k) / n);
        return (
          <g key={k} stroke="var(--color-ink)" strokeWidth={0.7} fill="none" opacity={o}>
            <path d={`M0 ${y} C 380 ${y}, 420 110, 600 110`} />
            <path d={`M1200 ${y} C 820 ${y}, 780 110, 600 110`} />
          </g>
        );
      })}
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      <LiquiditySphere />
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-4">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="INFINITY" className="h-7 w-auto md:h-9" />
          <nav className="hidden gap-6 text-base text-mute md:flex">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#shapes" className="hover:text-ink">Shapes</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#onchain" className="hover:text-ink">On chain</a>
            <Link to="/docs" className="hover:text-ink">Docs</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/discover" className="rounded-xl bg-violet px-5 py-2.5 text-base font-medium">Launch app</Link>
          </div>
        </div>
      </header>
      <PoolTicker />

      <section className="relative mx-auto max-w-6xl px-4 py-24 text-center">
        <div className="hero-glow" aria-hidden="true" />
        <span className="rise mb-6 inline-block rounded-full border border-line px-3 py-1 text-xs text-mute">
          Demo preview · fabricated data · no live network yet
        </span>
        <h1 className="rise text-5xl font-normal leading-tight md:text-7xl" style={{ animationDelay: "100ms" }}>
          Liquidity, without limits.
        </h1>
        <p className="rise mx-auto mt-6 max-w-2xl text-lg text-mute" style={{ animationDelay: "220ms" }}>
          INFINITY is a concentrated liquidity terminal being built for Zero. Find pools, shape your range and manage
          positions across the DEXs we integrate, from one place.
        </p>
        <div className="rise mt-8 flex justify-center gap-3" style={{ animationDelay: "340ms" }}>
          <Link to="/discover" className="rounded-lg bg-violet px-6 py-3 font-medium">Launch app</Link>
          <a href="#how" className="rounded-lg border border-line px-6 py-3 text-mute hover:text-ink">How it works</a>
        </div>
        <div className="rise" style={{ animationDelay: "460ms" }}><HeroArt /></div>
        <div className="mx-auto mt-4 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
          {[["4", "Liquidity shapes"], ["1", "Adapter per DEX"], ["0", "Custody of your funds"], ["100%", "Wallet-signed"]].map(([n, l]) => (
            <div key={l} className="lift rounded-xl border border-line bg-panel p-4">
              <div className="text-2xl font-medium text-cyan">{n}</div>
              <div className="text-xs text-mute">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-3xl font-medium">Instruments</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map(([n, t, d], i) => (
            <Reveal key={n} delay={(i % 2) * 100}>
              <div className="lift h-full rounded-xl border border-line bg-panel p-6">
                <div className="text-sm text-violet">{n}</div>
                <h3 className="mt-1 text-xl font-medium">{t}</h3>
                <p className="mt-2 text-mute">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="shapes" className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-medium">Shape your liquidity</h2>
          <p className="mt-3 text-mute">
            Where your capital sits decides how much fee income you can earn and how soon you fall out of range.
            Pick a shape and see the distribution. Fee income is never guaranteed.
          </p>
        </div>
        <ShapePreview />
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-3xl font-medium">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(([n, t, d], i) => (
            <Reveal key={n} delay={i * 120}>
              <div className="lift h-full rounded-xl border border-line bg-panel p-6">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-violet/20 font-medium text-violet">{n}</div>
                <h3 className="font-medium">{t}</h3>
                <p className="mt-1 text-sm text-mute">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="onchain" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-4 text-3xl font-medium">On chain</h2>
        <div className="rounded-xl border border-line bg-panel p-6 text-sm">
          <p className="text-mute">
            No DEX contracts are listed yet. INFINITY only lists contracts after verifying them against official
            sources on Zero. This section will show chain ID and verified addresses once available.
          </p>
          <div className="mt-3 font-mono text-xs text-mute">Chain ID: pending · Factory: pending · Position manager: pending</div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="text-4xl font-medium">Ready to manage liquidity?</h2>
        <Link to="/discover" className="mt-6 inline-block rounded-lg bg-violet px-8 py-3 font-medium">Launch app</Link>
      </section>

      <Footer />
    </div>
  );
}
