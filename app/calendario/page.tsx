import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCircuitLayoutUrl, getCircuitMapUrl, getCountryFlagUrl } from "@/lib/circuit-visuals";
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
            const layoutUrl = getCircuitLayoutUrl(race.circuitId);
            const flagUrl = getCountryFlagUrl(race.country);
            const mapUrl = getCircuitMapUrl(
              race.latitude,
              race.longitude,
              `${race.circuit}, ${race.locality}, ${race.country}`
            );
            return (
              <article className={`calendar-card state-${race.state}`} key={race.round}>
                <div className="calendar-round">
                  <span>R{race.round.padStart(2, "0")}</span>
                  <div className="calendar-card-status">
                    {race.state === "next" && <b>PRÓXIMA</b>}
                    {flagUrl && (
                      <Image
                        className="calendar-flag"
                        src={flagUrl}
                        alt={`Bandera de ${race.country}`}
                        width={36}
                        height={24}
                        unoptimized
                      />
                    )}
                  </div>
                </div>

                <div className="calendar-card-body">
                  <div className="calendar-card-copy">
                    <p className="calendar-date">{formatRaceDate(race.date)}</p>
                    <h2><Link href={href}>{race.name}</Link></h2>
                    <a
                      className="calendar-map-link"
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir ${race.circuit} en Google Maps`}
                    >
                      {race.circuit} · {race.locality} <span aria-hidden="true">↗</span>
                    </a>
                  </div>

                  {layoutUrl && (
                    <div className="calendar-track">
                      <Image
                        className="calendar-track-image"
                        src={layoutUrl}
                        alt={`Trazado de ${race.circuit}`}
                        fill
                        sizes="(max-width: 680px) 38vw, (max-width: 1060px) 20vw, 14vw"
                        unoptimized
                      />
                    </div>
                  )}
                </div>

                <Link className="calendar-card-cta" href={href}>
                  {race.state === "finished" ? "RESULTADOS" : "HORARIOS"} →
                </Link>
              </article>
            );
          })}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
