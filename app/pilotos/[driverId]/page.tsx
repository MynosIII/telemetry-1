import type { Metadata } from "next";
import Image from "@/components/ResilientImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatRaceDate } from "@/lib/format";
import { getDriverProfile } from "@/lib/f1-data";

type Props = { params: Promise<{ driverId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { driverId } = await params;
  const profile = await getDriverProfile(driverId);
  if (!profile) return { title: "Piloto" };
  const description = `Perfil, estadísticas y resultados de ${profile.identity.name}.`;
  return {
    title: profile.identity.name,
    description,
    openGraph: { title: `${profile.identity.name} — Telemetry 1`, description, images: profile.identity.image ? [profile.identity.image] : [] },
    twitter: { card: "summary_large_image", title: profile.identity.name, description, images: profile.identity.image ? [profile.identity.image] : [] }
  };
}

function value(value: string | number | undefined) {
  return value ?? "—";
}

export default async function DriverPage({ params }: Props) {
  const { driverId } = await params;
  const profile = await getDriverProfile(driverId);
  if (!profile) notFound();
  const { identity, standing, telemetry } = profile;

  const careerStats = [
    ["CAMPEONATOS", value(telemetry?.championships)],
    ["VICTORIAS", value(telemetry?.wins)],
    ["PODIOS", value(telemetry?.podiums)],
    ["POLES", value(telemetry?.poles)],
    ["GRANDES PREMIOS", value(telemetry?.races)],
    ["MEJOR RESULTADO", telemetry?.bestFinish ? `P${telemetry.bestFinish}` : "—"]
  ];

  return (
    <main id="top" className="inner-page driver-page">
      <SiteHeader />
      <section className="driver-hero">
        <div className="driver-portrait">
          <span className="driver-number">{identity.permanentNumber ?? standing?.position.padStart(2, "0") ?? identity.code ?? "F1"}</span>
          {identity.image ? <Image src={identity.image} alt={identity.name} fill priority sizes="(max-width: 800px) 100vw, 48vw" unoptimized /> : null}
        </div>
        <div className="driver-identity">
          <p className="eyebrow eyebrow-red">{standing ? `P${standing.position} · ${standing.team}` : "ARCHIVO HISTÓRICO"}</p>
          <h1>{identity.name}</h1>
          <div className="driver-identity-line">
            <span>{identity.nationality ?? telemetry?.biography?.nationalityCountryId ?? "Fórmula 1"}</span>
            {identity.dateOfBirth ? <span>{identity.dateOfBirth}</span> : null}
            {telemetry?.debut ? <span>DEBUT {telemetry.debut}</span> : null}
          </div>
          {standing ? <div className="current-score"><strong>{standing.points}</strong><span>PUNTOS</span><b>{standing.wins ?? "0"} VICTORIAS</b></div> : null}
        </div>
      </section>

      <section className="driver-body">
        <div className="driver-stat-grid">
          {careerStats.map(([label, stat]) => <div key={label}><span>{label}</span><strong>{stat}</strong></div>)}
        </div>

        {telemetry?.model ? (
          <div className="model-strip">
            <div><span>RANKING HISTÓRICO</span><strong>{telemetry.model.rank ? `#${telemetry.model.rank}` : "—"}</strong></div>
            <div><span>ELO DE CARRERA</span><strong>{value(telemetry.model.careerRating)}</strong></div>
            <div><span>PICO ELO</span><strong>{value(telemetry.peak?.rating)}</strong></div>
            <div><span>PRIME SOSTENIDO</span><strong>{value(telemetry.model.sustainedPrime)}</strong></div>
          </div>
        ) : null}

        {profile.seasonResults.length ? (
          <>
            <div className="detail-heading">
              <div><p className="eyebrow eyebrow-red">RESULTADOS</p><h2>ÚLTIMAS <em>CARRERAS</em></h2></div>
            </div>
            <div className="driver-race-list">
              {profile.seasonResults.map((race) => {
                const result = race.results.find((item) => item.driverId === driverId);
                if (!result) return null;
                return (
                  <Link href={`/carreras/${race.round}?piloto=${driverId}#vueltas`} key={race.round}>
                    <span>R{race.round.padStart(2, "0")}</span>
                    <div><strong>{race.name}</strong><small>{formatRaceDate(race.date)} · {result.team}</small></div>
                    <b>P{result.position}</b>
                    <code>{result.time}</code>
                    <em>VUELTAS →</em>
                  </Link>
                );
              })}
            </div>
          </>
        ) : null}
      </section>
      <SiteFooter />
    </main>
  );
}
