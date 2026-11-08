import type { Metadata } from "next";
import { connection } from "next/server";
import { SeasonEmpty, SeasonShell, TeamName, decimal } from "@/components/season/SeasonShell";
import { getSeasonData } from "@/lib/season-analysis";
import { getPitSeason } from "@/lib/season-pace";

export const metadata: Metadata = {
  title: "Paradas en boxes",
  description: "Las paradas en boxes más rápidas de la temporada de Fórmula 1 y la mediana de cada equipo."
};

export default async function PitStopsPage() {
  // Built on request: a cold cache needs one OpenF1 call per race, too slow for the build.
  await connection();
  const data = await getSeasonData();
  const pits = await getPitSeason(data.season);
  const measure = pits?.hasStationary ? "detenido" : "en el pit lane";
  const valueOf = (team: NonNullable<typeof pits>["teams"][number]) => (pits?.hasStationary ? team.median : team.laneMedian);
  const ranked = pits?.teams.filter((team) => valueOf(team) !== null) ?? [];
  const best = ranked.length ? valueOf(ranked[0])! : 0;
  const worst = ranked.length ? valueOf(ranked.at(-1)!)! : 1;
  const fastest = pits
    ? [...pits.stops].filter((stop) => (pits.hasStationary ? stop.stop : stop.lane) !== null)
      .sort((a, b) => (pits.hasStationary ? a.stop! - b.stop! : a.lane! - b.lane!)).slice(0, 20)
    : [];

  return (
    <SeasonShell
      title="Paradas en boxes"
      subtitle={pits ? `${pits.stops.length} paradas en ${pits.races} carreras de ${data.season}.` : undefined}
      method={<>
        <p>{pits?.hasStationary ? "El tiempo detenido va desde que el auto frena en su box hasta que vuelve a moverse." : "OpenF1 no tiene el tiempo detenido de estas carreras, así que usamos el tiempo total en el pit lane, de la entrada a la salida."} Se descartan los pasos por boxes que no fueron un cambio de neumáticos normal: menos de 1,5 o más de 15 segundos detenido.</p>
        <p>La mediana deja afuera las paradas largas por un problema con una tuerca o una reparación, que con un promedio pesarían demasiado. Datos de <a href="https://openf1.org" target="_blank" rel="noreferrer">OpenF1</a>.</p>
      </>}
    >
      {!pits || !pits.stops.length ? <SeasonEmpty>No pudimos leer las paradas de la temporada en OpenF1. Probá de nuevo en unos minutos.</SeasonEmpty> : (
        <>
          <section className="season-section">
            <h2>Mediana por equipo</h2>
            <p className="season-lead">Tiempo {measure} en una parada típica de cada equipo.</p>
            <ol className="hbars">
              {ranked.map((team) => {
                const value = valueOf(team)!;
                // Bars start a little before the quickest team so the differences stay visible.
                const floor = best * 0.85;
                return (
                  <li key={team.team} title={`${team.name}: ${team.stops} paradas${pits.hasStationary ? `, ${team.under3} en menos de 3 s` : ""}`}>
                    <TeamName id={team.team} />
                    <div className="track"><span style={{ width: `${((value - floor) / (worst - floor)) * 100}%`, background: team.color }} /></div>
                    <strong>{decimal(value, 2)} s</strong>
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="season-section">
            <h2>Equipos</h2>
            <div className="season-scroll">
              <table className="season-table">
                <thead><tr><th>Equipo</th><th className="num">Paradas</th><th className="num">Mediana detenido</th>{pits.hasStationary ? <th className="num">Menos de 3 s</th> : null}<th className="num">Mediana en el pit lane</th><th>Más rápida</th></tr></thead>
                <tbody>
                  {pits.teams.map((team) => (
                    <tr key={team.team}>
                      <td><TeamName id={team.team} /></td>
                      <td className="num">{team.stops}</td>
                      <td className="num">{team.median === null ? "—" : `${decimal(team.median, 2)} s`}</td>
                      {pits.hasStationary ? <td className="num">{team.under3}</td> : null}
                      <td className="num">{team.laneMedian === null ? "—" : `${decimal(team.laneMedian, 1)} s`}</td>
                      <td>{team.best ? <>{decimal(team.best.stop, 2)} s <small>{team.best.code}, {team.best.race}</small></> : <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="season-section">
            <h2>Las 20 más rápidas</h2>
            <div className="season-scroll">
              <table className="season-table">
                <thead><tr><th className="num">#</th><th>Piloto</th><th>Equipo</th><th>Carrera</th><th className="num">Vuelta</th><th className="num">Tiempo {measure}</th></tr></thead>
                <tbody>
                  {fastest.map((stop, index) => (
                    <tr key={`${stop.date}-${stop.code}-${stop.lap}`}>
                      <td className="num">{index + 1}</td>
                      <td>{stop.driver}</td>
                      <td><TeamName id={stop.team} /></td>
                      <td>{stop.race}</td>
                      <td className="num">{stop.lap}</td>
                      <td className="num">{decimal(pits.hasStationary ? stop.stop : stop.lane, 2)} s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </SeasonShell>
  );
}
