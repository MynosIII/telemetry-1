import type { Metadata } from "next";
import { LiveTimingDashboard } from "@/components/LiveTimingDashboard";
import { NextRacePanel } from "@/components/NextRacePanel";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getF1HomeData } from "@/lib/f1-data";
import { getLiveTimingSnapshot } from "@/lib/live-timing";

export const metadata: Metadata = {
  title: "En vivo",
  description: "Timing, posiciones, intervalos y estado del próximo fin de semana de Fórmula 1."
};

export default async function LivePage() {
  const [data, liveTiming] = await Promise.all([getF1HomeData(), getLiveTimingSnapshot()]);
  return (
    <main id="top" className="inner-page live-page">
      <SiteHeader />
      <section className="inner-hero compact-hero">
        <p className="eyebrow eyebrow-red">PISTA</p>
        <h1>CENTRO <em>EN VIVO</em></h1>
      </section>
      <LiveTimingDashboard initialSnapshot={liveTiming} />
      <NextRacePanel race={data.nextRace} circuit={data.nextCircuit} />
      <SiteFooter />
    </main>
  );
}
