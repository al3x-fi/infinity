import { useAppKitAccount } from "@reown/appkit/react";
import ProfileEditor from "./ProfileEditor";
import { markSkipped, useProfile, wasSkipped } from "../lib/profile";

/** Asks for a username and picture the first time a wallet connects. Only mounted when AppKit is configured. */
export default function FirstConnectPrompt() {
  const { address, isConnected } = useAppKitAccount();
  const profile = useProfile(address);
  // `undefined` means the server has not answered yet, so do not nag existing users.
  if (!isConnected || !address || profile !== null || wasSkipped(address)) return null;
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-panel p-6" role="dialog" aria-label="Set up your profile">
        <h2 className="text-xl font-medium">Set up your profile</h2>
        <p className="mb-5 mt-1 text-sm text-mute">Pick a username and a picture. Your username becomes your referral code.</p>
        <ProfileEditor address={address} onSkip={() => markSkipped(address)} />
      </div>
    </div>
  );
}
