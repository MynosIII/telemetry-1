import type { Metadata } from "next";
import { PaceBoxPlot } from "@/components/season/PaceBoxPlot";
import { RacePicker } from "@/components/season/RacePicker";
import { SeasonEmpty, SeasonShell, TeamName, decimal } from "@/components/season/SeasonShell";
import { getRacePace, getRaceSessions } from "@/lib/season-pace";
import { getSeasonData } from "@/lib/season-analysis";

export const metadata: Metadata = {
  title: "Ritmo de carrera",
  description: "Ritmo de carrera de cada piloto y equipo en las vueltas limpias de cada Gran Premio de la temporada."
};

export default async function RacePacePage({ searchParams }: { searchParams: Promise<{ carrera?: string }> }) {
  const [{ carrera }, data] = await Promise.all([searchParams, getSeasonData()]);
  const sessions = await getRaceSessions(data.season);
  const races = sessions.filter((session) => !session.sprint);
  const session = sessions.find((item) => String(item.key) === carrera) ?? races.at(-1) ?? sessions.at(-1);
  const pace = session ? await getRacePace(session).catch(() => null) : null;
  const bestTeam = pace?.teams[0];
  const slowestTeamGap = Math.max(...(pace?.teams.map((team) => team.gap) ?? [1]), 0.1);

  return (
    <SeasonShell
      title="Ritmo de carrera"
      subtitle={session ? `${session.country || session.circuit}${session.sprint ? ", sprint" : ""}, ${new Date(`${session.date}T12:00:00Z`).toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "UTC" })}.` : undefined}
      method={<>
        <p>Solo cuentan las vueltas limpias: afuera la primera vuelta, las de entrada y salida de boxes, las que se corrieron con auto de seguridad o bandera roja (cuando la mediana de todo el pelotón en esa vuelta supera en 8 % a la de la carrera) y las de cada piloto que quedaron 5 % por encima de su propia mediana, por tráfico o un error.</p>
        <p>El ritmo es la mediana de esas vueltas. El equipo toma el ritmo de su auto más rápido. Datos de tiempos por vuelta de <a href="https://openf1.org" target="_blank" rel="noreferrer">OpenF1</a>.</p>
      </>}
    >
      {sessions.length && session ? <RacePicker sessions={sessions} current={session.key} base="/temporada/ritmo" /> : null}
      {!session ? <SeasonEmpty>Todavía no hay carreras con tiempos por vuelta esta temporada, o OpenF1 no respondió.</SeasonEmpty> : null}
      {session && !pace ? <SeasonEmpty>OpenF1 todavía no tiene los tiempos por vuelta de esta carrera.</SeasonEmpty> : null}
      {pace ? (
        <>
          <section className="season-section">
            <h2>Pilotos</h2>
            <p className="season-lead">
              La caja cubre la mitad central de las vueltas limpias y la raya blanca marca la mediana. Ordenado de más rápido a más lento.
              {pace.neutralisedLaps.length ? ` Se descartaron ${pace.neutralisedLaps.length} vueltas neutralizadas de ${pace.totalLaps}.` : ""}
            </p>
            <div className="season-chart-frame"><PaceBoxPlot drivers={pace.drivers} /></div>
          </section>
          <section className="season-section">
            <h2>Equipos</h2>
            <p className="season-lead">Diferencia con {bestTeam?.name}, el más rápido, por vuelta.</p>
            <ol className="hbars">
              {pace.teams.map((team) => (
                <li key={team.team}>
                  <TeamName id={team.team} />
                  <div className="track"><span style={{ width: `${Math.max((team.gap / slowestTeamGap) * 100, 0.6)}%`, background: team.color }} /></div>
                  <strong>{team.gap ? `+${decimal(team.gap, 3)}` : "—"}</strong>
                </li>
              ))}
            </ol>
          </section>
          <section className="season-section">
            <h2>Detalle</h2>
            <div className="season-scroll">
              <table className="season-table">
                <thead><tr><th>Piloto</th><th>Equipo</th><th className="num">Vueltas limpias</th><th className="num">Mediana</th><th className="num">Diferencia</th><th className="num">Mejor</th></tr></thead>
                <tbody>
                  {pace.drivers.map((driver) => (
                    <tr key={driver.number}>
                      <td>{driver.name}</td>
                      <td><TeamName id={driver.team} /></td>
                      <td className="num">{driver.laps}</td>
                      <td className="num">{decimal(driver.median, 3)} s</td>
                      <td className="num">{driver.gap ? `+${decimal(driver.gap, 3)}` : "—"}</td>
                      <td className="num">{decimal(driver.best, 3)} s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </SeasonShell>
  );
}
