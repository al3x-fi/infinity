import { useState } from "react";
import { copyText } from "../lib/referral";

/** Small pill that copies `value` to the clipboard when pressed. */
export default function CopyChip({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title={value}
      onClick={async () => { if (await copyText(value)) { setDone(true); setTimeout(() => setDone(false), 1500); } }}
      className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-mute hover:bg-ink/5 hover:text-ink">
      <span className={mono ? "font-mono" : ""}>{done ? "Copied" : label}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" />
      </svg>
    </button>
  );
}
