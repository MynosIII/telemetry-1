import type { Metadata } from "next";
import Image from "@/components/ResilientImage";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LiveModelPanel } from "@/components/LiveModelPanel";
import { getStandings } from "@/lib/f1-data";
import { getLiveModelSnapshot } from "@/lib/live-model";

export const metadata: Metadata = {
  title: "Estadísticas",
  description: "El laboratorio histórico de pilotos de Telemetry One."
};

export const revalidate = 900;

export default async function StatisticsPage() {
  const [standings, liveModel] = await Promise.all([getStandings(), getLiveModelSnapshot()]);
  return (
    <main id="top" className="inner-page stats-page">
      <SiteHeader />
      <section className="inner-hero compact-hero">
        <p className="eyebrow eyebrow-red">TELEMETRY ONE</p>
        <h1>DATOS QUE <em>EXPLICAN</em></h1>
      </section>

      <section className="stats-dashboard">
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
      </section>
      <SiteFooter />
    </main>
  );
}
