export type NewsItem = {
  title: string;
  link: string;
  summary: string;
  image?: string;
  publishedAt?: string;
  source: string;
};

/** Spanish-language F1 feeds (RSS 2.0). Order sets priority when the same story appears twice. */
const feeds = [
  { source: "Motorsport.com", url: "https://lat.motorsport.com/rss/f1/news/" },
  { source: "Motorsport.com", url: "https://es.motorsport.com/rss/f1/news/" }
];

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}

function tag(item: string, name: string) {
  const match = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decode(match[1]) : "";
}

function image(item: string) {
  const enclosure = item.match(/<enclosure[^>]+url="([^"]+)"[^>]*type="image/i) ?? item.match(/<enclosure[^>]+type="image[^"]*"[^>]*url="([^"]+)"/i);
  const media = item.match(/<media:(?:content|thumbnail)[^>]+url="([^"]+)"/i);
  const url = enclosure?.[1] ?? media?.[1];
  return url?.startsWith("https://") ? url.replace(/&amp;/g, "&") : undefined;
}

export function parseRss(xml: string, source: string): NewsItem[] {
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].flatMap(([item]) => {
    const title = tag(item, "title");
    const link = tag(item, "link");
    if (!title || !/^https?:\/\//.test(link)) return [];
    const date = tag(item, "pubDate");
    const published = date ? new Date(date) : undefined;
    const summary = tag(item, "description");
    return [{
      title,
      link,
      summary: summary.length > 220 ? `${summary.slice(0, 217).replace(/\s+\S*$/, "")}…` : summary,
      image: image(item),
      publishedAt: published && !Number.isNaN(published.getTime()) ? published.toISOString() : undefined,
      source
    }];
  });
}

const key = (title: string) => title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Latest headlines from every feed that answers; an empty list means none did. */
export async function getNews(limit = 30): Promise<NewsItem[]> {
  const results = await Promise.all(feeds.map(async ({ source, url }) => {
    try {
      const response = await fetch(url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(8000) });
      return response.ok ? parseRss(await response.text(), source) : [];
    } catch {
      return [];
    }
  }));
  const seen = new Set<string>();
  return results.flat()
    .filter((item) => !seen.has(key(item.title)) && seen.add(key(item.title)))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, limit);
}
