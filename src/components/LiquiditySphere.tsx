import { useEffect, useRef } from "react";

/**
 * Slowly turning sphere of dots. Dots crowd into a bright band around the equator,
 * the "current price", the way concentrated liquidity crowds around a price.
 * Pauses when hidden, is static for reduced motion, and uses fewer dots on phones.
 */
export default function LiquiditySphere() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = window.innerWidth < 768 ? 320 : 760;
    const golden = Math.PI * (3 - Math.sqrt(5));
    // Fibonacci sphere, bunched toward y = 0 so the equator is denser.
    const pts = Array.from({ length: count }, (_, i) => {
      const t = (i + 0.5) / count;
      const y0 = 1 - 2 * t;
      const y = Math.sign(y0) * Math.pow(Math.abs(y0), 1.6);
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const a = i * golden;
      return { x: Math.cos(a) * r, y, z: Math.sin(a) * r };
    });

    let w = 0, h = 0, dpr = 1, ink = "23,23,23";
    const readInk = () => {
      const c = getComputedStyle(document.documentElement).getPropertyValue("--color-ink").trim();
      const m = /^#([0-9a-f]{6})$/i.exec(c);
      if (m) ink = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).join(",");
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
    };
    readInk(); resize();

    let mx = 0, my = 0, tx = 0, ty = 0, angle = 0, raf = 0, last = performance.now();
    const onMove = (e: MouseEvent) => { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; };

    const draw = (now: number) => {
      const dt = Math.min(now - last, 50); last = now;
      if (!reduce) angle += dt * 0.00006;
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.46;
      const cx = w / 2 + mx * 30, cy = h * 0.5 + my * 20;
      const a = angle + mx * 0.6, tilt = -0.28 + my * 0.25;
      const ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(tilt), st = Math.sin(tilt);
      for (const p of pts) {
        const x1 = p.x * ca + p.z * sa, z1 = -p.x * sa + p.z * ca;
        const y2 = p.y * ct - z1 * st, z2 = p.y * st + z1 * ct;
        const depth = (z2 + 1) / 2;
        const band = Math.exp(-Math.pow(p.y / 0.22, 2));
        const alpha = (0.1 + 0.55 * depth) * (0.45 + 0.75 * band);
        const size = (0.8 + 1.7 * depth) * (0.8 + 0.7 * band);
        ctx.fillStyle = `rgba(${ink},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(cx + x1 * R, cy + y2 * R, size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (now: number) => { draw(now); raf = requestAnimationFrame(loop); };
    const start = () => { if (!reduce && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVis = () => (document.hidden ? stop() : start());

    draw(performance.now());
    start();
    const onResize = () => { resize(); draw(performance.now()); };
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("visibilitychange", onVis);
    const mo = new MutationObserver(() => { readInk(); draw(performance.now()); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      stop(); mo.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-45" />;
}
