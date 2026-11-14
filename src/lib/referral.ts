const KEY = "infinity-ref";
const MINE = "infinity-my-code";
const VALID = /^[A-Za-z0-9_-]{3,32}$|^0x[a-fA-F0-9]{40}$/;

export const isValidCode = (c: string) => VALID.test(c);

/** Remembers the first ?ref= code a visitor arrives with. Kept in this browser only. */
export function captureRef(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && isValidCode(ref) && !localStorage.getItem(KEY)) localStorage.setItem(KEY, ref);
  } catch { /* storage unavailable */ }
}

export function getReferrer(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function getMyCode(): string {
  try { return localStorage.getItem(MINE) ?? ""; } catch { return ""; }
}

export function setMyCode(code: string): void {
  try { localStorage.setItem(MINE, code); } catch { /* storage unavailable */ }
}

export const refLink = (code: string) => `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
export const portfolioLink = (address: string) => `${window.location.origin}/u/${address}`;

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
