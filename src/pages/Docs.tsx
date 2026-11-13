import { Link, useParams } from "react-router-dom";
import { docs, type Block } from "../docs/content";

const groups = [...new Set(docs.map((d) => d.group))];

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.t === "p") return <p key={i} className="leading-7 text-ink/90">{b.text}</p>;
        if (b.t === "ul") return <ul key={i} className="list-disc space-y-1 pl-6 leading-7 text-ink/90">{b.items.map((x) => <li key={x}>{x}</li>)}</ul>;
        if (b.t === "code") return <pre key={i} className="overflow-x-auto rounded-lg border border-line bg-ink/5 p-4 font-mono text-sm">{b.text}</pre>;
        return <div key={i} className="rounded-lg border border-line bg-ink/5 p-4 text-sm leading-6">{b.text}</div>;
      })}
    </>
  );
}

export default function Docs() {
  const { slug } = useParams();
  const idx = Math.max(0, docs.findIndex((d) => d.slug === (slug ?? "introduction")));
  const page = docs[idx];
  const prev = docs[idx - 1], next = docs[idx + 1];

  // Scroll within the page instead of using #hash links, which a hosted frame can swallow.
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)_200px]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <details className="rounded-lg border border-line p-3 lg:hidden">
          <summary className="cursor-pointer text-sm font-medium">{page.title}</summary>
          <Nav current={page.slug} />
        </details>
        <div className="hidden lg:block"><Nav current={page.slug} /></div>
      </aside>

      <article className="min-w-0 space-y-4">
        <div className="text-xs text-mute">{page.group}</div>
        <h1 className="text-4xl font-medium">{page.title}</h1>
        <p className="text-lg text-mute">{page.intro}</p>
        {page.sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-6 space-y-3 pt-4">
            <h2 className="text-2xl font-medium">{s.title}</h2>
            <Blocks blocks={s.blocks} />
          </section>
        ))}
        <nav className="mt-10 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {prev ? (
            <Link to={`/docs/${prev.slug}`} className="rounded-lg border border-line p-4 hover:bg-ink/5">
              <div className="text-xs text-mute">Previous</div><div className="font-medium">{prev.title}</div>
            </Link>
          ) : <span />}
          {next && (
            <Link to={`/docs/${next.slug}`} className="rounded-lg border border-line p-4 text-right hover:bg-ink/5">
              <div className="text-xs text-mute">Next</div><div className="font-medium">{next.title}</div>
            </Link>
          )}
        </nav>
      </article>

      <aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-mute">On this page</div>
        <ul className="space-y-2 border-l border-line pl-4 text-sm">
          {page.sections.map((s) => (
            <li key={s.id}><button onClick={() => jump(s.id)} className="text-left text-mute hover:text-ink">{s.title}</button></li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function Nav({ current }: { current: string }) {
  return (
    <nav className="space-y-5 text-sm">
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-mute">{g}</div>
          <ul className="space-y-1">
            {docs.filter((d) => d.group === g).map((d) => (
              <li key={d.slug}>
                <Link to={`/docs/${d.slug}`}
                  className={`block rounded-md px-2 py-1.5 ${d.slug === current ? "bg-ink/5 font-medium text-ink" : "text-mute hover:text-ink"}`}>
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
