import type { MetadataRoute } from "next";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { editorialArticles } from "@/lib/editorial-articles";
import { games } from "@/lib/games";
import { SITE_URL } from "@/lib/site";

const RACES = path.join(process.cwd(), "public", "history", "races");
const CARS = path.join(process.cwd(), "public", "history", "cars");

const STATIC_PAGES = [
  "/", "/noticias", "/articulos", "/temporada", "/calendario",
  "/temporada/constructores", "/temporada/duelos", "/temporada/ritmo", "/temporada/consistencia", "/temporada/boxes",
  "/temporada/desarrollo", "/temporada/motores", "/temporada/adn",
  "/informe", "/ranking", "/ranking/fan-index", "/ranking/encuesta",
  "/historia", "/historia/autos", "/historia/neumaticos", "/historia/records", "/historia/comparar",
  "/juegos", "/juegos/predestinato",
  "/en-vivo", "/en-vivo/clima", "/en-vivo/repeticion", "/en-vivo/telemetria", "/privacidad"
];

async function jsonNames(folder: string) {
  try {
    return (await readdir(folder)).filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = JSON.parse(await readFile(path.join(process.cwd(), "public", "history", "index.json"), "utf8")) as { entities: { id: string; category: string }[] };
  const [races, cars] = await Promise.all([jsonNames(RACES), jsonNames(CARS)]);

  const urls = [
    ...STATIC_PAGES,
    ...games.map((game) => `/juegos/${game.slug}`),
    ...editorialArticles.map((article) => `/articulos/${article.slug}`),
    ...index.entities.map((entity) => entity.category === "drivers" ? `/pilotos/${entity.id}` : `/historia/${entity.category}/${entity.id}`),
    ...races.map((id) => id.match(/^(\d{4})-(\d+)$/)).filter((match) => match !== null).map((match) => `/historia/carreras/${match[1]}/${match[2]}`),
    ...cars.map((id) => `/historia/autos/${id}`)
  ];

  return [...new Set(urls)].map((url) => ({ url: `${SITE_URL}${url === "/" ? "" : url}` }));
}
