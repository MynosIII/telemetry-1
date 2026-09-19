import type { Metadata } from "next";
import Image from "@/components/ResilientImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LapExplorer } from "@/components/LapExplorer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatRaceDate } from "@/lib/format";
import { getRaceDetail } from "@/lib/f1-data";

type Props = {
  params: Promise<{ round: string }>;
  searchParams: Promise<{ piloto?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { round } = await params;
  return { title: `Carrera · Ronda ${round}`, description: "Resultados y tiempos vuelta a vuelta." };
}

export default async function RacePage({ params, searchParams }: Props) {
  const [{ round }, query] = await Promise.all([params, searchParams]);
  const race = await getRaceDetail(round, query.piloto);
  if (!race) notFound();

  return (
    <main id="top" className="inner-page race-page">
      <SiteHeader />
      <section className="race-detail-hero">
        <div>
          <p className="eyebrow eyebrow-red">RONDA {race.round} · {formatRaceDate(race.date)}</p>
          <h1>{race.name}</h1>
          <Link href={`/circuitos/${race.circuitId}`}>{race.circuit} · {race.locality} →</Link>
        </div>
        <span className="race-finish-mark">FINAL</span>
      </section>

      <section className="race-detail-body">
        <div className="detail-heading">
          <div><p className="eyebrow eyebrow-red">CLASIFICACIÓN</p><h2>RESULTADO <em>FINAL</em></h2></div>
        </div>
        <div className="full-results">
          {race.results.map((driver) => (
            <div className="full-result-row" key={driver.driverId}>
              <strong className="full-position">{driver.position}</strong>
              <span className="driver-avatar">
                {driver.image ? <Image src={driver.image} alt="" fill sizes="46px" unoptimized /> : driver.name.slice(0, 1)}
              </span>
              <div><Link href={`/pilotos/${driver.driverId}`}>{driver.name}</Link><span>{driver.team}</span></div>
              <span className="grid-stat">P{driver.grid ?? "—"}<small>PARRILLA</small></span>
              <Link className="result-time" href={`?piloto=${driver.driverId}#vueltas`}>{driver.time} →</Link>
              <b>{driver.points} PTS</b>
            </div>
          ))}
        </div>

        <div className="detail-heading lap-heading" id="vueltas">
          <div><p className="eyebrow eyebrow-red">TELEMETRÍA</p><h2>VUELTA A <em>VUELTA</em></h2></div>
        </div>
        <LapExplorer driver={race.laps[0]} options={race.results} round={race.round} />
      </section>
      <SiteFooter />
    </main>
  );
}
