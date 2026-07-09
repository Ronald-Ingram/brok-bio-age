import Image from "next/image";

interface GeniusWalletIconProps {
  className?: string;
  size?: number;
}

/** Metallic circuit G — Genius Wallet nav icon */
export function GeniusWalletIcon({
  className = "h-4 w-4",
  size = 16,
}: GeniusWalletIconProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/genius/genius-g-nav.png"
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain"
        aria-hidden
      />
    </span>
  );
}