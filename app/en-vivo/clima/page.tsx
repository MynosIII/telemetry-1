import type { Metadata } from "next";
import { CircuitWeather } from "@/components/CircuitWeather";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getCircuitProfile, getF1HomeData } from "@/lib/f1-data";
export const metadata: Metadata = { title: "Clima en pista", description: "Condiciones, radar y pronóstico meteorológico de los circuitos de Fórmula 1." };
export default async function WeatherPage({ searchParams }: { searchParams: Promise<{ circuito?: string }> }) {
  const [data, params] = await Promise.all([getF1HomeData(), searchParams]);
  const race = data.schedule.find(r => r.circuitId === params.circuito) ?? data.nextRace;
  const circuit = (race.circuitId === data.nextCircuit.id ? data.nextCircuit : await getCircuitProfile(race.circuitId)) ?? data.nextCircuit;
  return <main id="top" className="inner-page live-page"><SiteHeader /><form action="/en-vivo/clima" className="weather-selector"><label htmlFor="weather-circuit">Circuito</label><select id="weather-circuit" name="circuito" defaultValue={circuit.id}>{data.schedule.filter((r, i, rows) => rows.findIndex(other => other.circuitId === r.circuitId) === i).map(r => <option value={r.circuitId} key={r.circuitId}>{r.circuit} · {r.country}</option>)}</select><button type="submit">Ver clima</button></form><CircuitWeather circuit={circuit} raceDate={race.date} /><SiteFooter /></main>;
}
