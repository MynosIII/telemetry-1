import type { Metadata } from "next";
import Image from "@/components/ResilientImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RaceSchedule } from "@/components/RaceSchedule";
import { CircuitIntelligence } from "@/components/CircuitIntelligence";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCircuitProfile, getSchedule } from "@/lib/f1-data";
import { getCircuitTopology } from "@/lib/circuit-topology";

type Props = { params: Promise<{ circuitId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { circuitId } = await params;
  const circuit = await getCircuitProfile(circuitId);
  if (!circuit) return { title: "Circuito" };
  return {
    title: circuit.name,
    description: circuit.description,
    openGraph: { title: `${circuit.name} — Telemetry 1`, description: circuit.description, images: circuit.image ? [circuit.image] : [] },
    twitter: { card: "summary_large_image", title: circuit.name, description: circuit.description, images: circuit.image ? [circuit.image] : [] }
  };
}

export default async function CircuitPage({ params }: Props) {
  const { circuitId } = await params;
  const [circuit, schedule] = await Promise.all([getCircuitProfile(circuitId), getSchedule()]);
  if (!circuit) notFound();
  const race = schedule.find((item) => item.circuitId === circuitId);
  if (!race) notFound();
  const topology = getCircuitTopology(circuitId);

  return (
    <main id="top" className="inner-page circuit-page">
      <SiteHeader />
      <section className="circuit-hero">
        <div className="circuit-hero-image">
          {circuit.image ? <Image src={circuit.image} alt={`Vista de ${circuit.name}`} fill priority sizes="100vw" unoptimized /> : null}
          <div className="live-visual-shade" />
        </div>
        <div className="circuit-hero-copy">
          <p className="eyebrow eyebrow-yellow">RONDA {race.round} · {circuit.country}</p>
          <h1>{circuit.name}</h1>
          <p>{circuit.description}</p>
        </div>
      </section>

      <section className="circuit-body">
        <div className="circuit-stats" aria-label="Datos del circuito">
          <div><span>INAUGURADO</span><strong>{circuit.opened}</strong></div>
          <div><span>LONGITUD</span><strong>{circuit.length}</strong></div>
          <div><span>VUELTAS</span><strong>{circuit.laps}</strong></div>
          <div><span>PERFIL</span><strong>{circuit.character}</strong></div>
        </div>
        <CircuitIntelligence circuit={circuit} topology={topology} />
        <div className="detail-heading">
          <div><p className="eyebrow eyebrow-red">HORARIOS</p><h2>FIN DE <em>SEMANA</em></h2></div>
          {race.state === "finished" ? <Link className="button button-dark" href={`/carreras/${race.round}`}>VER RESULTADOS →</Link> : null}
        </div>
        <RaceSchedule race={race} circuit={circuit} />
      </section>
      <SiteFooter />
    </main>
  );
}
