import { useState } from "react";
import { copyText } from "../lib/referral";

/** Read-only link box with a Copy button. */
export default function CopyField({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-bg/60 p-2 pl-3">
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-mute">{value}</span>
      <button
        onClick={async () => { if (await copyText(value)) { setDone(true); setTimeout(() => setDone(false), 1500); } }}
        className="shrink-0 rounded-lg bg-violet px-3 py-1.5 text-xs font-medium">
        {done ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
