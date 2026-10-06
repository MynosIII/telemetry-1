import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HistoryDossier } from "@/components/HistoryDossier";
import { getHistoryEntity, historyCategories } from "@/lib/history";
import { getCarCatalogue, getChampionship } from "@/lib/championship-history";
import { SeasonDossier } from "@/components/SeasonDossier";
import { TyreDossier } from "@/components/TyreDossier";
import { getTyreAnalysis, tyreCompanies } from "@/lib/tyre-history";
import { TeamHistory } from "@/components/TeamHistory";
import type { LineageView } from "@/components/LineageExplorer";
import { lineageFor, teamColor } from "@/lib/team-lineage";
import { carImage, teamLogo } from "@/lib/team-media";
import { getCountryFlagUrl } from "@/lib/circuit-visuals";
import { translate } from "@/lib/dictionary";
import "../../../team-history.css";

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
  if (category === "tyres" && Object.hasOwn(tyreCompanies, entity.id)) {
    const analysis = (await getTyreAnalysis()).tyres[entity.id];
    if (analysis) return <TyreDossier entity={entity} analysis={analysis} />;
  }
  if (category === "constructors") {
    const lineage = lineageFor(entity.id);
    const [catalogue, members] = await Promise.all([getCarCatalogue(), lineage ? Promise.all(lineage.steps.map(step => getHistoryEntity("constructors", step.id))) : []]);
    const cars = catalogue.cars.filter(car => car.constructor.id === entity.id)
      .sort((a, b) => a.seasons[0] - b.seasons[0] || a.name.localeCompare(b.name, "es", { numeric: true }))
      .map(car => ({ id: car.id, name: car.name, href: car.href, seasons: car.seasons, engines: car.engines.map(e => e.name), image: carImage(car) }));
    const steps: LineageView[] = lineage ? lineage.steps.flatMap((step, i) => {
      const member = members[i];
      if (!member) return [];
      const seasons = member.seasons.filter(s => s.season >= step.from && s.season <= step.to);
      const constructorPosition = (year: number) => {
        // seasonStandings lists one row per standings table the team appears in; the best is the constructors' row.
        const rows = member.seasonStandings.filter(row => row.season === year && typeof row.position === "number");
        return rows.length ? Math.min(...rows.map(row => row.position as number)) : null;
      };
      const positions = seasons.map(s => constructorPosition(s.season)).filter((p): p is number => p !== null);
      return [{
        id: step.id, name: member.name, href: member.href, from: step.from, to: step.to, color: teamColor(step.id), logo: teamLogo(step.id),
        wins: seasons.reduce((sum, s) => sum + s.wins, 0), podiums: seasons.reduce((sum, s) => sum + s.podiums, 0), races: seasons.reduce((sum, s) => sum + s.races, 0),
        titles: member.milestones.filter(m => m.label === "Campeón mundial" && /constructores/i.test(m.event) && m.season >= step.from && m.season <= step.to).map(m => m.season),
        best: positions.length ? Math.min(...positions) : null,
        seasons: seasons.map(s => ({ season: s.season, position: constructorPosition(s.season), wins: s.wins, podiums: s.podiums, champion: s.champion }))
      }];
    }) : [];
    // A team with two stints in one lineage (Renault, Sauber) lands on its latest one.
    const current = steps.map(s => s.id).lastIndexOf(entity.id);
    return <main id="top" className="inner-page history-page team-page"><SiteHeader /><TeamHistory entity={entity} color={teamColor(entity.id)} logo={teamLogo(entity.id)} cars={cars} lineage={lineage && steps.length > 1 && current >= 0 ? { base: lineage.base, steps, current } : null} /><SiteFooter /></main>;
  }
  const stats = entity.stats, number = (value: number) => value.toLocaleString("es-AR");
  const country = entity.country ?? (entity.category === "nations" ? entity.name : undefined);
  const flag = country ? getCountryFlagUrl(country) : undefined;
  const figures = [["Grandes Premios", stats.races], ["Victorias", stats.wins], ["Podios", stats.podiums], ["Salidas P1", stats.poles], ["Vueltas rápidas", stats.fastestLaps]] as const;
  return <main id="top" className="inner-page history-page"><SiteHeader /><div className="history-content">
    <header className="archive-head">
      <nav className="archive-crumb" aria-label="Ruta"><Link href="/historia">Estadísticas</Link><span>/</span><span>{historyCategories[entity.category]}</span></nav>
      <h1>{flag ? <img className="archive-flag" src={flag} alt={`Bandera de ${translate(country ?? "", "countries")}`} width={36} height={24} /> : null}{entity.category === "nations" ? translate(entity.name, "countries") : entity.name}</h1>
      <p className="archive-meta">{[entity.fullName !== entity.name ? entity.fullName : null, entity.country ? translate(entity.country, "countries") : null, entity.firstSeason === entity.lastSeason ? entity.firstSeason : `${entity.firstSeason}–${entity.lastSeason}`].filter(Boolean).join(" · ")}</p>
      <dl className="archive-figures">{figures.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number(value)}</dd></div>)}</dl>
    </header>
    <HistoryDossier entity={entity} />
  </div><SiteFooter /></main>;
}
