import { demoSafety } from "../demo/data";
import { Badge, Notice, Panel } from "../components/ui";

const tone = { pass: "up", fail: "down", unknown: "mute" } as const;
const text = { pass: "No issue found", fail: "Concern", unknown: "No data" } as const;

export default function TokenSafety() {
  const unknown = demoSafety.filter((c) => c.status === "unknown").length;
  const fail = demoSafety.filter((c) => c.status === "fail").length;
  return (
    <>
      <h1 className="text-2xl font-medium">Token Safety</h1>
      <Notice>
        Demo report. INFINITY never labels a token "safe": passing a check only means no issue was found by that
        check. {unknown} of {demoSafety.length} checks have no data and are shown as such.
      </Notice>
      <Panel title="Explainable risk report (demo token)">
        <p className="mb-3 text-sm">
          {fail} concern(s), {unknown} unknown. Unknown ≠ safe.
        </p>
        <ul className="divide-y divide-line">
          {demoSafety.map((c) => (
            <li key={c.key} className="flex items-start justify-between gap-4 py-2">
              <div>
                <div className="font-medium">{c.label}</div>
                <div className="text-sm text-mute">{c.detail}</div>
              </div>
              <Badge tone={tone[c.status]}>{text[c.status]}</Badge>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
