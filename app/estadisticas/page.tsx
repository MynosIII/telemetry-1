import type { Metadata } from "next";
import Image from "@/components/ResilientImage";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LiveModelPanel } from "@/components/LiveModelPanel";
import { getStandings, isSeasonDataLive } from "@/lib/f1-data";
import { StaleDataNotice } from "@/components/StaleDataNotice";
import { getLiveModelSnapshot } from "@/lib/live-model";

export const metadata: Metadata = {
  title: "Estadísticas",
  description: "El laboratorio histórico de pilotos de Telemetry One."
};

export const revalidate = 900;

export default async function StatisticsPage() {
  const [standings, liveModel, live] = await Promise.all([getStandings(), getLiveModelSnapshot(), isSeasonDataLive()]);
  return (
    <main id="top" className="inner-page stats-page">
      <SiteHeader />
      <StaleDataNotice live={live} />
      <section className="inner-hero compact-hero">
        <p className="eyebrow eyebrow-red">TELEMETRY ONE</p>
        <h1>DATOS QUE <em>EXPLICAN</em></h1>
      </section>

      <section className="stats-dashboard">
        <div className="detail-heading"><div><p className="eyebrow eyebrow-red">1950–2025 · HISTORIA CONECTADA</p><h2>EL ARCHIVO <em>COMPLETO</em></h2></div><Link className="button button-dark" href="/historia">PILOTOS, EQUIPOS Y MOTORES →</Link></div>
        <LiveModelPanel snapshot={liveModel} />
        <div className="detail-heading">
          <div><p className="eyebrow eyebrow-red">CAMPEONATO</p><h2>CLASIFICACIÓN DE <em>PILOTOS</em></h2></div>
          <Link className="button button-dark" href="/estadisticas/laboratorio">LABORATORIO HISTÓRICO →</Link>
        </div>
        <div className="standings-table">
          {standings.map((driver) => (
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
        <div className="detail-heading stats-links-heading"><div><p className="eyebrow eyebrow-red">SEGUÍ EXPLORANDO</p><h2>MÁS <em>DATOS</em></h2></div></div>
        <nav className="stats-links" aria-label="Secciones de estadísticas">
          <Link href="/estadisticas/laboratorio"><strong>Laboratorio histórico →</strong><span>Compará el ELO de pilotos y autos de todas las épocas, carrera por carrera.</span></Link>
          <Link href="/historia/seasons/2025"><strong>Temporadas y carreras →</strong><span>Cada campeonato desde 1950, con su calendario, balance y evolución.</span></Link>
          <Link href="/historia/autos"><strong>Índice de autos →</strong><span>Los modelos del campeonato y sus resultados.</span></Link>
          <Link href="/calendario"><strong>Calendario →</strong><span>Fechas, horarios y circuitos de la temporada en curso.</span></Link>
        </nav>
      </section>
      <SiteFooter />
    </main>
  );
}
