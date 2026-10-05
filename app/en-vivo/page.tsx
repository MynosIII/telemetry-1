import type { Metadata } from "next";
import { LiveTimingDashboard } from "@/components/LiveTimingDashboard";
import { NextRacePanel } from "@/components/NextRacePanel";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StaleDataNotice } from "@/components/StaleDataNotice";
import { getCircuitProfile, getF1HomeData } from "@/lib/f1-data";
import { getLiveTimingSnapshot } from "@/lib/live-timing";
import { getWeatherRadarImage } from "@/lib/weather-radar";

export const metadata: Metadata = {
  title: "En vivo",
  description: "Timing, posiciones, intervalos y estado del próximo fin de semana de Fórmula 1."
};

function searchKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export default async function LivePage() {
  const [data, liveTiming] = await Promise.all([getF1HomeData(), getLiveTimingSnapshot()]);
  const sessionTerms = [
    liveTiming.session?.circuit,
    liveTiming.session?.location,
    liveTiming.session?.country
  ].filter((value): value is string => Boolean(value)).map(searchKey);
  const sessionRace = data.schedule.find((race) => {
    const raceTerms = [race.circuit, race.locality, race.country].map(searchKey);
    return sessionTerms.some((sessionTerm) => raceTerms.some((raceTerm) =>
      sessionTerm === raceTerm || sessionTerm.includes(raceTerm) || raceTerm.includes(sessionTerm)
    ));
  });
  const sessionCircuit = sessionRace
    ? await getCircuitProfile(sessionRace.circuitId)
    : undefined;
  const mapCircuit = sessionCircuit ?? data.nextCircuit;
  const radar = await getWeatherRadarImage(mapCircuit.latitude, mapCircuit.longitude);
  return (
    <main id="top" className="inner-page live-page">
      <SiteHeader />
      <StaleDataNotice live={data.live} />
      <section className="inner-hero compact-hero">
        <p className="eyebrow eyebrow-red">PISTA</p>
        <h1>CENTRO <em>EN VIVO</em></h1>
      </section>
      <LiveTimingDashboard
        initialSnapshot={liveTiming}
        mapContext={{
          name: mapCircuit.name,
          latitude: mapCircuit.latitude,
          longitude: mapCircuit.longitude,
          circuitImage: mapCircuit.image,
          radar
        }}
      />
      <NextRacePanel race={data.nextRace} circuit={data.nextCircuit} />
      <SiteFooter />
    </main>
  );
}
