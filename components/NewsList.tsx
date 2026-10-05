import Image from "@/components/ResilientImage";
import type { NewsItem } from "@/lib/news";

function when(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value));
}

export function NewsList({ items, compact = false }: { items: NewsItem[]; compact?: boolean }) {
  if (!items.length) {
    return <p className="news-empty">No pudimos cargar las noticias. Volvé a intentar en unos minutos.</p>;
  }
  return (
    <ol className={`news-list${compact ? " news-list-compact" : ""}`}>
      {items.map((item) => (
        <li key={item.link}>
          <a href={item.link} target="_blank" rel="noreferrer">
            {!compact && item.image ? <span className="news-image"><Image src={item.image} alt="" fill sizes="(max-width: 760px) 100vw, 280px" unoptimized /></span> : null}
            <span className="news-copy">
              <small>{item.source}{item.publishedAt ? ` · ${when(item.publishedAt)}` : ""}</small>
              <strong>{item.title}</strong>
              {!compact && item.summary ? <span>{item.summary}</span> : null}
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}
