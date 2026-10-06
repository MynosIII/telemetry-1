import type { Metadata } from "next";
import { Suspense } from "react";
import { CircuitWeather } from "@/components/CircuitWeather";
<<<<<<< HEAD
import { Suspense } from "react";
import { LiveTimingDashboard } from "@/components/LiveTimingDashboard";
=======
>>>>>>> origin/main
import { NextRacePanel } from "@/components/NextRacePanel";
import { LiveCenter } from "@/components/replay/LiveCenter";
import { ReplaySource } from "@/components/replay/ReplaySource";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StaleDataNotice } from "@/components/StaleDataNotice";
<<<<<<< HEAD
import { getCircuitProfile, getF1HomeData } from "@/lib/f1-data";
import { getLiveTimingSnapshot } from "@/lib/live-timing";
import { getWeatherRadarImage } from "@/lib/weather-radar";
import { CircuitWeather } from "@/components/CircuitWeather";
=======
import { getF1HomeData } from "@/lib/f1-data";
>>>>>>> origin/main

export const metadata: Metadata = {
  title: "En vivo",
  description: "La sesión en pista en directo: mapa con los autos, tiempos, neumáticos, clima y dirección de carrera."
};

export default async function LivePage() {
  const data = await getF1HomeData();
  return (
    <main id="top" className="inner-page replay-page live-page">
      <SiteHeader />
      <StaleDataNotice live={data.live} />
<<<<<<< HEAD
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
      <Suspense fallback={<p id="clima" className="weather-unavailable" role="status">Cargando el clima del circuito…</p>}><CircuitWeather circuit={mapCircuit} raceDate={(sessionRace ?? data.nextRace).date} /></Suspense>
=======
      <div className="replay-content">
        <header className="replay-head">
          <h1>En directo</h1>
        </header>
        <LiveCenter />
        <ReplaySource />
      </div>
>>>>>>> origin/main
      <Suspense fallback={<p id="clima" className="weather-unavailable" role="status">Cargando el clima del próximo circuito…</p>}><CircuitWeather circuit={data.nextCircuit} raceDate={data.nextRace.date} /></Suspense>
      <NextRacePanel race={data.nextRace} circuit={data.nextCircuit} />
      <SiteFooter />
    </main>
  );
}
