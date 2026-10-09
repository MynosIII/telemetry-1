import { SiteHeader } from "@/components/SiteHeader";

/** Ranking views are the static lab pages, shown under the site header without any extra chrome. */
export function RankingFrame({ title, source }: { title: string; source: string }) {
  return (
    <main className="ranking-frame">
      <SiteHeader />
      <h1 className="sr-only">{title}</h1>
      <iframe className="ranking-frame-view" src={source} title={title} referrerPolicy="strict-origin-when-cross-origin" />
    </main>
  );
}
