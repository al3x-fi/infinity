/** Profile picture, or a generated gradient with initials when none is set. */
export default function Avatar({ address, username, src, size = 40 }: { address: string; username?: string; src?: string | null; size?: number }) {
  if (src) return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  const h = parseInt(address.slice(2, 8) || "0", 16) % 360;
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{ width: size, height: size, fontSize: size / 2.6, background: `linear-gradient(135deg, hsl(${h} 35% 38%), hsl(${(h + 50) % 360} 40% 22%))` }}>
      {(username ?? address.slice(2)).slice(0, 2).toUpperCase()}
    </div>
  );
}
