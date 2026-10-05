import Link from "next/link";
import type { ReactNode } from "react";
import { tidyNarrative } from "@/lib/text";

export type NarrativeTarget = { text: string; href: string };

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const singular: Record<string, string> = { pilotos: "piloto", "vueltas rápidas": "vuelta rápida", triunfos: "triunfo" };

/** Archive prose reads "1 temporadas" or "entre 2025 y 2025"; smooth those before linking. */
export function tidy(text: string) {
  return tidyNarrative(text
    .replace(/(?<![\d.,])1 temporadas del archivo, entre (\d{4}) y \1/g, "1 temporada del archivo, la de $1")
    .replace(/(?<![\d.,])1 (pilotos|vueltas rápidas|triunfos)\b/g, (_, word: string) => `1 ${singular[word]}`));
}

/**
 * Turns names, seasons and headline numbers in a paragraph into links:
 * names from `targets`, any World Championship year to its season page,
 * and counts like "203 victorias" to the matching section of the page.
 */
export function LinkedNarrative({ text, targets, counts }: { text: string; targets: NarrativeTarget[]; counts: Record<string, string> }) {
  const names = [...targets].sort((a, b) => b.text.length - a.text.length);
  const byName = new Map(names.map(t => [t.text, t.href]));
  const countWords = Object.keys(counts).sort((a, b) => b.length - a.length);
  const pattern = new RegExp([
    names.length ? `(?<name>${names.map(t => escape(t.text)).join("|")})` : null,
    countWords.length ? `(?<count>\\d[\\d.]*\\s(?:${countWords.map(escape).join("|")}))` : null,
    "(?<year>19[5-9]\\d|20[0-2]\\d)"
  ].filter(Boolean).map(part => `(?<![\\p{L}\\d])${part}(?![\\p{L}\\d])`).join("|"), "gu");
  const source = tidy(text);
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > last) nodes.push(source.slice(last, match.index));
    const { name, count, year } = match.groups ?? {};
    const key = `${match.index}`;
    if (name) nodes.push(<Link key={key} prefetch={false} className="story-link" href={byName.get(name)!}>{name}</Link>);
    else if (count) {
      const word = countWords.find(w => count.endsWith(w))!;
      nodes.push(<a key={key} className="story-link story-count" href={counts[word]}>{count}</a>);
    } else if (year && Number(year) >= 1950 && Number(year) <= 2025) nodes.push(<Link key={key} prefetch={false} className="story-link story-year" href={`/historia/seasons/${year}`}>{year}</Link>);
    else nodes.push(match[0]);
    last = match.index + match[0].length;
  }
  if (last < source.length) nodes.push(source.slice(last));
  return <p>{nodes}</p>;
}
