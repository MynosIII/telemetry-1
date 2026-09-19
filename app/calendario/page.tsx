import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatRaceDate } from "@/lib/format";
import { getSchedule } from "@/lib/f1-data";

export const metadata: Metadata = {
  title: "Calendario",
  description: "Todas las fechas de la temporada de Fórmula 1."
};

export default async function CalendarPage() {
  const schedule = await getSchedule();

  return (
    <main id="top" className="inner-page">
      <SiteHeader />
      <section className="inner-hero compact-hero">
        <p className="eyebrow eyebrow-red">CALENDARIO</p>
        <h1>TODA LA <em>TEMPORADA</em></h1>
      </section>
      <section className="calendar-section" aria-label="Calendario de carreras">
        <div className="calendar-grid">
          {schedule.map((race) => {
            const href = race.state === "finished" ? `/carreras/${race.round}` : `/circuitos/${race.circuitId}`;
            return (
              <Link className={`calendar-card state-${race.state}`} href={href} key={race.round}>
                <div className="calendar-round"><span>R{race.round.padStart(2, "0")}</span><b>{race.state === "finished" ? "FINAL" : race.state === "next" ? "PRÓXIMA" : "FECHA"}</b></div>
                <p>{formatRaceDate(race.date)}</p>
                <h2>{race.name}</h2>
                <span>{race.circuit} · {race.locality}</span>
                <strong>{race.state === "finished" ? "RESULTADOS" : "HORARIOS"} →</strong>
              </Link>
            );
          })}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
