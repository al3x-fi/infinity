import { useEffect, useRef, useState } from "react";
import { fmtNum, type Bin } from "../lib/liquidity";

interface Props {
  pair: [string, string]; dex: string; shape: string; lowPct: number; highPct: number;
  price: number; lower: number; upper: number; bins: Bin[];
}

const W = 1200, H = 630;

function draw(ctx: CanvasRenderingContext2D, p: Props, logo: HTMLImageElement | null) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#161616"); g.addColorStop(1, "#050505");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = 2; ctx.strokeRect(24, 24, W - 48, H - 48);

  if (logo) { const h = 44, w = (logo.width / logo.height) * h; ctx.drawImage(logo, 70, 62, w, h); }
  else { ctx.fillStyle = "#fff"; ctx.font = "600 36px Roboto, Arial"; ctx.fillText("INFINITY", 70, 98); }

  ctx.fillStyle = "#8f8f8f"; ctx.font = "400 26px Roboto, Arial";
  ctx.fillText(`${p.dex} · liquidity shape`, 70, 175);
  ctx.fillStyle = "#ededed"; ctx.font = "500 92px Roboto, Arial";
  ctx.fillText(`${p.pair[0]}/${p.pair[1]}`, 70, 270);

  ctx.fillStyle = "#ededed"; ctx.font = "400 38px Roboto, Arial";
  ctx.fillText(`${p.shape} · ${p.lowPct}% to +${p.highPct}%`, 70, 340);
  ctx.fillStyle = "#8f8f8f"; ctx.font = "400 28px Roboto, Arial";
  ctx.fillText(`Range ${fmtNum(p.lower, 4)} to ${fmtNum(p.upper, 4)} · price now ${fmtNum(p.price, 4)}`, 70, 388);

  // Distribution bars with the current price marked.
  const x0 = 70, x1 = W - 70, top = 430, base = 540, bw = (x1 - x0) / p.bins.length;
  const max = Math.max(...p.bins.map((b) => b.weight), 0.0001);
  p.bins.forEach((b, i) => {
    const h = (b.weight / max) * (base - top);
    const below = Math.sqrt(b.lower * b.upper) < p.price;
    ctx.fillStyle = below ? "#ededed" : "#6b6b6b";
    ctx.fillRect(x0 + i * bw + 3, base - h, bw - 6, h);
  });
  const frac = (Math.log(p.price) - Math.log(p.lower)) / (Math.log(p.upper) - Math.log(p.lower));
  const px = x0 + Math.min(Math.max(frac, 0), 1) * (x1 - x0);
  ctx.strokeStyle = "#f59e0b"; ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(px, top - 10); ctx.lineTo(px, base + 6); ctx.stroke(); ctx.setLineDash([]);

  ctx.fillStyle = "#f59e0b"; ctx.font = "500 22px Roboto, Arial";
  ctx.fillText("DEMO PREVIEW · fabricated data, not advice", 70, 590);
  ctx.fillStyle = "#8f8f8f"; ctx.textAlign = "right";
  ctx.fillText(window.location.host, W - 70, 590); ctx.textAlign = "left";
}

/** Button that opens a preview of a shareable image of the current setup, with Download and Post on X. */
export default function ShareCard(props: Props) {
  const [open, setOpen] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) return;
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    c.width = W; c.height = H;
    draw(ctx, props, null);
    const img = new Image();
    img.onload = () => draw(ctx, props, img);
    img.src = `${import.meta.env.BASE_URL}logo.png`;
  }, [open, props]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  const download = () => {
    canvas.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `infinity-${props.pair.join("-").toLowerCase()}-${props.shape.toLowerCase()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };

  const post = () => {
    const text = `My ${props.shape} liquidity shape for ${props.pair.join("/")} on INFINITY: ${props.lowPct}% to +${props.highPct}% (demo preview, not advice)`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-xl border border-line px-4 py-2 text-sm hover:bg-ink/5">Share this setup</button>
      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label="Share card" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium">Share this setup</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-mute hover:text-ink">✕</button>
            </div>
            <canvas ref={canvas} className="w-full rounded-xl border border-line" style={{ aspectRatio: `${W} / ${H}` }} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={download} className="rounded-xl bg-violet px-5 py-2 text-sm font-medium">Download image</button>
              <button onClick={post} className="rounded-xl border border-line px-5 py-2 text-sm hover:bg-ink/5">Post on X</button>
            </div>
            <p className="mt-3 text-xs text-mute">
              The image shows only the pair, range and shape. It does not include your deposit amount or wallet. Post on X opens X in a new tab with the text filled in. Attach the image yourself there.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
