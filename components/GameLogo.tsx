import Image from "next/image";

/** Original SVG game marks; decorative beside each game's visible name. */
export function GameLogo({ src, className = "" }: { src: string; className?: string }) {
  return <Image className={`game-logo ${className}`} src={src} alt="" width={96} height={96} unoptimized />;
}
