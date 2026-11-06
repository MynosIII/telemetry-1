import type { Metadata } from "next";
import Image from "@/components/ResilientImage";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LiveModelPanel } from "@/components/LiveModelPanel";
import { RaceBoard } from "@/components/RaceBoard";
import { getF1HomeData } from "@/lib/f1-data";
import { StaleDataNotice } from "@/components/StaleDataNotice";
import { getLiveModelSnapshot } from "@/lib/live-model";

export const metadata: Metadata = {
  title: "Temporada",
  description: "Clasificación, pronóstico de la próxima carrera y últimos resultados de la temporada de Fórmula 1."
};

export const revalidate = 900;

export default async function SeasonPage() {
  const [data, liveModel] = await Promise.all([getF1HomeData(), getLiveModelSnapshot()]);
  const season = data.nextRace.date?.slice(0, 4) ?? "";
  return (
    <main id="top" className="inner-page stats-page">
      <SiteHeader />
      <StaleDataNotice live={data.live} />
      <section className="inner-hero compact-hero">
        <p className="eyebrow eyebrow-red">TEMPORADA {season}</p>
        <h1>EL CAMPEONATO, <em>HOY</em></h1>
      </section>

      <section className="stats-dashboard">
        <div className="detail-heading" id="clasificacion">
          <div><p className="eyebrow eyebrow-red">CAMPEONATO</p><h2>CLASIFICACIÓN DE <em>PILOTOS</em></h2></div>
          <Link className="button button-dark" href="/calendario">CALENDARIO →</Link>
        </div>
        <div className="standings-table">
          {data.standings.map((driver) => (
            <Link href={`/pilotos/${driver.driverId}`} className="standing-row" key={driver.driverId}>
              <strong>{driver.position.padStart(2, "0")}</strong>
              <span className="driver-avatar">
                {driver.image ? <Image src={driver.image} alt="" fill sizes="48px" unoptimized /> : driver.name.slice(0, 1)}
              </span>
              <div><b>{driver.name}</b><span>{driver.team}</span></div>
              <span>{driver.wins ?? "0"}<small>VICTORIAS</small></span>
              <em>{driver.points}<small>PTS</small></em>
              <i>PERFIL →</i>
            </Link>
          ))}
        </div>
        <LiveModelPanel snapshot={liveModel} />
      </section>

      <section className="section section-light" id="resultados" aria-labelledby="results-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-red">RESULTADOS</p>
            <h2 id="results-title">ÚLTIMAS <em>CARRERAS</em></h2>
          </div>
        </div>
        <RaceBoard races={data.races} />
      </section>
      <SiteFooter />
    </main>
  );
}
