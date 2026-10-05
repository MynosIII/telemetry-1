import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RaceDossier } from "@/components/RaceDossier";
import { getCarCatalogue, getChampionship, getHistoricRace } from "@/lib/championship-history";

type Props = { params: Promise<{ year: string; round: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year, round } = await params;
  const race = await getHistoricRace(year, round);
  return { title: race ? `${race.eventName} ${year} · Historia` : "Gran Premio histórico", description: race ? `${race.name}: resultados, clasificación, parrilla, campeonato y análisis de TelemetryOne v7.6.` : undefined };
}
export default async function RacePage({ params }: Props) {
  const { year, round } = await params;
  const [race, season, catalogue] = await Promise.all([getHistoricRace(year, round), getChampionship(year), getCarCatalogue()]);
  if (!race || !season) notFound();
  const ids = new Set(race.model.map(m => m.carModel));
  const cars = catalogue.cars.filter(car => ids.has(car.id)).map(car => ({ id: car.id, name: car.name, href: car.href }));
  return <RaceDossier race={race} season={season} cars={cars} />;
}
