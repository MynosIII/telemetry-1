import { games } from "@/lib/games";

export type SubLink = { href: string; label: string };
export type SiteSection = {
  href: string;
  label: string;
  /** Path prefixes that belong to this section. */
  match: string[];
  /** Shown as a second bar only while you are inside the section. */
  links?: SubLink[];
};

export const siteSections: SiteSection[] = [
  { href: "/noticias", label: "Noticias", match: ["/noticias"] },
  {
    href: "/temporada",
    label: "Temporada",
    match: ["/temporada", "/calendario", "/en-vivo", "/carreras", "/circuitos"],
    links: [
      { href: "/temporada", label: "Clasificación" },
      { href: "/temporada#modelo-2026", label: "Pronóstico" },
      { href: "/temporada#resultados", label: "Resultados" },
      { href: "/calendario", label: "Calendario" },
      { href: "/en-vivo", label: "En vivo" }
    ]
  },
  {
    href: "/ranking",
    label: "Ranking",
    match: ["/ranking"],
    links: [
      { href: "/ranking", label: "Índice estadístico" },
      { href: "/ranking/fan-index", label: "Fan Index" },
      { href: "/ranking/encuesta", label: "Encuesta" },
      { href: "/ranking/modelo", label: "Modelo v7.6" }
    ]
  },
  {
    href: "/historia",
    label: "Estadísticas",
    match: ["/historia", "/pilotos"],
    links: [
      { href: "/historia?categoria=seasons", label: "Temporadas" },
      { href: "/historia?categoria=grands-prix", label: "Grandes Premios" },
      { href: "/historia?categoria=drivers", label: "Pilotos" },
      { href: "/historia?categoria=constructors", label: "Constructores" },
      { href: "/historia?categoria=engines", label: "Motores" },
      { href: "/historia?categoria=tyres", label: "Neumáticos" },
      { href: "/historia?categoria=nations", label: "Naciones" },
      { href: "/historia?categoria=circuits", label: "Circuitos" },
      { href: "/historia/autos", label: "Autos" }
    ]
  },
  {
    href: "/juegos",
    label: "Juegos",
    match: ["/juegos"],
    links: [
      { href: "/juegos/predestinato", label: "El Predestinado" },
      ...games.map((game) => ({ href: `/juegos/${game.slug}`, label: game.title }))
    ]
  }
];

const startsWith = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function sectionFor(pathname: string) {
  return siteSections.find((section) => section.match.some((prefix) => startsWith(pathname, prefix)));
}

/** Estadísticas sub-links map to archive categories, which also show up as path segments (/historia/constructors/ferrari). */
const categoryForPath: Record<string, string> = { "/pilotos": "drivers" };

export function activeSubLink(section: SiteSection, pathname: string, categoria: string | null, hash: string) {
  const links = section.links ?? [];
  const exact = links.find((link) => link.href === `${pathname}${hash}`);
  if (exact) return exact.href;
  const category = categoria
    ?? Object.entries(categoryForPath).find(([prefix]) => startsWith(pathname, prefix))?.[1]
    ?? pathname.match(/^\/historia\/([a-z-]+)\//)?.[1];
  if (category) {
    const byCategory = links.find((link) => link.href.endsWith(`categoria=${category}`));
    if (byCategory) return byCategory.href;
  }
  // Longest matching path wins (/historia/autos/x → Autos).
  return links
    .filter((link) => !link.href.includes("?") && !link.href.includes("#") && startsWith(pathname, link.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}
