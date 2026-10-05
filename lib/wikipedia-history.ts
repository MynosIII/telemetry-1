import { cache } from "react";

type Claim = { mainsnak?: { datavalue?: { value?: { id?: string; time?: string } } } };
type WikiEntity = { labels?: Record<string, { value: string }>; claims?: Record<string, Claim[]> };
export type WikipediaHistory = {
  title: string; url: string; revisionUrl?: string;
  facts: { label: string; value: string }[];
  sections: { title: string; url: string }[];
  wikidataUrl?: string;
};

async function json(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000),
    headers: { "User-Agent": "TelemetryOneHistory/1.0 (https://telemetry-1.vercel.app/historia)" }
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return response.json();
}

/** Exact article lookup, then structured facts: never republish the article prose. */
export const getWikipediaHistory = cache(async (title: string): Promise<WikipediaHistory | undefined> => {
  try {
    const params = new URLSearchParams({ action: "query", titles: title, redirects: "1", prop: "info|pageprops|revisions", inprop: "url", rvprop: "ids", format: "json", formatversion: "2" });
    const data = await json(`https://en.wikipedia.org/w/api.php?${params}`);
    const page = data.query?.pages?.[0];
    if (!page || page.missing || page.pageprops?.disambiguation !== undefined || !page.fullurl) return undefined;
    const result: WikipediaHistory = { title: page.title, url: page.fullurl, revisionUrl: page.revisions?.[0]?.revid ? `https://en.wikipedia.org/w/index.php?oldid=${page.revisions[0].revid}` : undefined, facts: [], sections: [] };
    const itemId: string | undefined = page.pageprops?.wikibase_item;
    const sectionsParams = new URLSearchParams({ action: "parse", pageid: String(page.pageid), prop: "sections", format: "json" });
    const [sections, entities] = await Promise.all([
      json(`https://en.wikipedia.org/w/api.php?${sectionsParams}`).catch(() => undefined),
      itemId && /^Q\d+$/.test(itemId) ? json(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${itemId}&props=claims&format=json`).catch(() => undefined) : undefined
    ]);
    result.sections = (sections?.parse?.sections ?? [])
      .filter((s: { toclevel: number; line: string }) => s.toclevel === 1 && !/references|external links|notes|bibliography|see also|further reading/i.test(s.line))
      .slice(0, 8).map((s: { line: string; anchor: string }) => ({ title: s.line.replace(/<[^>]*>/g, ""), url: `${page.fullurl}#${encodeURIComponent(s.anchor)}` }));
    const entity: WikiEntity | undefined = itemId ? entities?.entities?.[itemId] : undefined;
    if (entity?.claims && itemId) {
      result.wikidataUrl = `https://www.wikidata.org/wiki/${itemId}`;
      const fields = [{ property: "P19", label: "Lugar de nacimiento" }, { property: "P112", label: "Fundador" }, { property: "P159", label: "Sede" }, { property: "P17", label: "País" }, { property: "P27", label: "Ciudadanía" }];
      const refs = fields.flatMap(field => (entity.claims?.[field.property] ?? []).slice(0, 3).flatMap(claim => {
        const id = claim.mainsnak?.datavalue?.value?.id;
        return id && /^Q\d+$/.test(id) ? [{ ...field, id }] : [];
      }));
      if (refs.length) {
        const labels = await json(`https://www.wikidata.org/w/api.php?${new URLSearchParams({ action: "wbgetentities", ids: [...new Set(refs.map(r => r.id))].join("|"), props: "labels", languages: "es|en", format: "json" })}`).catch(() => undefined);
        for (const ref of refs) {
          const value = labels?.entities?.[ref.id]?.labels?.es?.value ?? labels?.entities?.[ref.id]?.labels?.en?.value;
          if (value) result.facts.push({ label: ref.label, value });
        }
      }
    }
    return result;
  } catch {
    return undefined;
  }
});
