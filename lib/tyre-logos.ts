import tyreLogoIndex from "./tyre-logos.json";

/*
 * Tyre manufacturer logos, keyed by archive id (/historia/tyres/<id>).
 * Each entry is a Wikimedia Commons file, or null while there is none (the brand name is shown instead).
 * To use your own file, drop it in public/history/tyre-logos/ and point the entry at it:
 *   "goodyear": "/history/tyre-logos/goodyear.svg"
 */
type TyreLogoEntry = string | { url: string; source?: string } | null;
const tyreLogos = tyreLogoIndex as Record<string, TyreLogoEntry>;

export type TyreLogo = { url: string; source?: string };
export function tyreLogo(id: string): TyreLogo | null {
  const entry = tyreLogos[id];
  return !entry ? null : typeof entry === "string" ? { url: entry } : entry;
}
