import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HistoryDossier } from "@/components/HistoryDossier";
import { getHistoryEntity, historyCategories } from "@/lib/history";
import { getCarCatalogue, getChampionship } from "@/lib/championship-history";
import { SeasonDossier } from "@/components/SeasonDossier";

type Props = { params: Promise<{ category: string; entityId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, entityId } = await params;
  if (category === "seasons") {
    const season = await getChampionship(entityId);
    return season ? { title: `Temporada ${season.year} de Fórmula 1`, description: `Calendario, participantes, resultados, campeonatos, estadísticas y análisis TelemetryOne de la temporada ${season.year}.` } : { title: "Temporada histórica" };
  }
  const entity = await getHistoryEntity(category, entityId);
  return entity ? { title: `${entity.name} · Historia`, description: `Historia, estadísticas, temporadas y conexiones de ${entity.name} en el Campeonato Mundial, ${entity.firstSeason}–${entity.lastSeason}.` } : { title: "Archivo histórico" };
}
export default async function EntityPage({ params }: Props) {
  const { category, entityId } = await params;
  if (category === "seasons") {
    const [season, catalogue] = await Promise.all([getChampionship(entityId), getCarCatalogue()]);
    if (!season) notFound();
    return <SeasonDossier season={season} cars={catalogue.cars.filter(car => car.seasons.includes(season.year))} />;
  }
  const entity = await getHistoryEntity(category, entityId);
  if (!entity) notFound();
  if (category === "drivers") redirect(`/pilotos/${entity.id}`);
  return <main id="top" className="inner-page history-page"><SiteHeader /><section className="inner-hero compact-hero"><Link className="history-breadcrumb" href="/historia">← Archivo histórico</Link><p className="eyebrow eyebrow-red">{historyCategories[entity.category]} · {entity.country ?? "CAMPEONATO MUNDIAL"} · {entity.firstSeason}–{entity.lastSeason}</p><h1>{entity.name.toLocaleUpperCase("es")}</h1>{entity.fullName !== entity.name ? <p className="history-intro">{entity.fullName}</p> : null}</section><div className="history-content"><HistoryDossier entity={entity} /></div><SiteFooter /></main>;
}
