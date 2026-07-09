import Image from "next/image";

interface EnneagramStarIconProps {
  className?: string;
  size?: number;
}

/** Blue neon Enneagram — Inneagram nav icon (roningram.com style) */
export function EnneagramStarIcon({
  className = "h-4 w-4",
  size = 16,
}: EnneagramStarIconProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/genius/enneagram-nav-tight.png"
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain"
        aria-hidden
      />
    </span>
  );
}