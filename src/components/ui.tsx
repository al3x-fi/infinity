import type { ReactNode } from "react";

/** Rounded top panel shared by the app pages (same look as Pools and Pool details). */
export function PageHero({ title, intro, stats, right, note }: {
  title: string; intro: string; stats?: [string, string][]; right?: ReactNode; note?: string;
}) {
  return (
    <section className="rounded-3xl border border-line p-5 md:p-8"
      style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--color-ink) 4%, var(--color-panel)), var(--color-panel))" }}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-4xl font-medium md:text-5xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-mute">{intro}</p>
        </div>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(([l, v]) => (
            <div key={l} className="rounded-xl border border-line bg-bg/60 p-3">
              <div className="text-[11px] text-mute">{l}</div>
              <div className={`mt-0.5 text-lg font-medium ${v === "N/A" ? "text-mute" : ""}`}
                title={v === "N/A" ? "Metric unavailable — not the same as zero" : undefined}>{v}</div>
            </div>
          ))}
        </div>
      )}
      {note && <p className="mt-4 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">{note}</p>}
    </section>
  );
}

export function Panel({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-mute uppercase tracking-wide">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/** Shows "N/A" (with explanation) for unavailable metrics, never a fake zero. */
export function Stat({ label, value, na }: { label: string; value: string; na?: boolean }) {
  const unavailable = na ?? value === "N/A";
  return (
    <div>
      <div className="text-xs text-mute">{label}</div>
      <div
        className={unavailable ? "text-mute" : "font-semibold"}
        title={unavailable ? "Metric unavailable — not the same as zero" : undefined}
      >
        {value}
      </div>
    </div>
  );
}

export function Badge({ children, tone = "mute" }: { children: ReactNode; tone?: "mute" | "violet" | "cyan" | "up" | "down" | "warn" }) {
  const tones = {
    mute: "border-line text-mute",
    violet: "border-violet/50 text-violet",
    cyan: "border-cyan/50 text-cyan",
    up: "border-up/50 text-up",
    down: "border-down/50 text-down",
    warn: "border-warn/50 text-warn",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-warn">{children}</div>;
}
