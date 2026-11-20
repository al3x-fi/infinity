import { useRef, useState } from "react";
import { useAppKitProvider } from "@reown/appkit/react";
import { BrowserProvider, type Eip1193Provider } from "ethers";
import Avatar from "./Avatar";
import { USERNAME_RE, resizeImage, saveProfile, useProfile } from "../lib/profile";

/** Form for the username and picture. Only rendered when AppKit is configured (it needs the wallet to sign). */
export default function ProfileEditor({ address, onSaved, onSkip }: { address: string; onSaved?: () => void; onSkip?: () => void }) {
  const existing = useProfile(address);
  const { walletProvider } = useAppKitProvider<Eip1193Provider>("eip155");
  const [name, setName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  // Show what is stored until the user edits.
  const shownName = name ?? existing?.username ?? "";
  const shownAvatar = avatar === undefined ? existing?.avatar ?? null : avatar;
  const clean = shownName.trim().toLowerCase();
  const valid = USERNAME_RE.test(clean);

  const pick = async (f?: File) => {
    if (!f) return;
    try { setAvatar(await resizeImage(f)); setError(""); } catch (e) { setError((e as Error).message); }
  };

  const save = async () => {
    if (!valid) return setError("Username: 3 to 20 characters, lowercase letters, numbers or _.");
    if (!walletProvider) return setError("Wallet not ready. Reconnect and try again.");
    setBusy(true); setError("");
    const signer = await new BrowserProvider(walletProvider).getSigner();
    const r = await saveProfile(address, { username: clean, avatar: shownAvatar }, (m) => signer.signMessage(m));
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setSaved(true); onSaved?.();
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar address={address} username={clean || undefined} src={shownAvatar} size={72} />
        <div className="space-x-2 text-sm">
          <button type="button" onClick={() => file.current?.click()} className="rounded-xl border border-line px-3 py-1.5 hover:bg-ink/5">Upload picture</button>
          {shownAvatar && <button type="button" onClick={() => setAvatar(null)} className="text-mute hover:text-ink">Remove</button>}
          <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>
      </div>
      <label className="block text-sm text-mute">Username
        <input className="mt-1 w-full" value={shownName} maxLength={20} placeholder="e.g. elonmusk"
          onChange={(e) => { setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setError(""); }} />
      </label>
      {error && <p className="text-xs text-down">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={!valid || busy} className="rounded-xl bg-violet px-5 py-2 text-sm font-medium disabled:opacity-50">
          {busy ? "Waiting for signature…" : saved ? "Saved" : "Save profile"}
        </button>
        {onSkip && <button type="button" onClick={onSkip} className="text-sm text-mute hover:text-ink">Skip for now</button>}
      </div>
      <p className="text-xs text-mute">
        Saving asks your wallet to sign a short message. It is free, sends no transaction, and only proves this address is yours.
        Your username and picture are public.
      </p>
    </div>
  );
}
