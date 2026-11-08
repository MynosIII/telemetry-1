import type { Metadata } from "next";
import Link from "next/link";
import { RacePicker } from "@/components/season/RacePicker";
import { SeasonEmpty, SeasonShell, TeamName, decimal } from "@/components/season/SeasonShell";
import { getSeasonData, resultConsistency } from "@/lib/season-analysis";
import { getRacePace, getRaceSessions } from "@/lib/season-pace";

export const metadata: Metadata = {
  title: "Consistencia",
  description: "Qué tan parejos son los pilotos vuelta a vuelta en cada carrera y carrera a carrera en la temporada de Fórmula 1."
};

export default async function ConsistencyPage({ searchParams }: { searchParams: Promise<{ carrera?: string }> }) {
  const [{ carrera }, data] = await Promise.all([searchParams, getSeasonData()]);
  const sessions = await getRaceSessions(data.season);
  const session = sessions.find((item) => String(item.key) === carrera) ?? sessions.filter((item) => !item.sprint).at(-1);
  const pace = session ? await getRacePace(session).catch(() => null) : null;
  const laps = pace ? [...pace.drivers].sort((a, b) => a.consistency - b.consistency) : [];
  const worst = Math.max(...laps.map((driver) => driver.consistency), 0.1);
  const season = resultConsistency(data);

  return (
    <SeasonShell
      title="Consistencia"
      subtitle={data.races.length ? `Temporada ${data.season}.` : undefined}
      method={<>
        <p>Vuelta a vuelta: sobre las mismas vueltas limpias que usa el <Link href="/temporada/ritmo">ritmo de carrera</Link>, se traza una recta por cada stint para quitar el desgaste de los neumáticos y la pérdida de combustible, que bajan o suben los tiempos de forma esperable. La consistencia es la dispersión que queda alrededor de esa recta, en segundos: cuanto más baja, más parejo el piloto.</p>
        <p>Carrera a carrera: desvío estándar de las posiciones finales de cada piloto cuando vio la bandera a cuadros. Los abandonos se cuentan aparte. Necesita al menos tres carreras.</p>
      </>}
    >
      <section className="season-section">
        <h2>Vuelta a vuelta</h2>
        {sessions.length && session ? <RacePicker sessions={sessions} current={session.key} base="/temporada/consistencia" /> : null}
        {laps.length ? (
          <>
            <p className="season-lead">Dispersión de las vueltas limpias en {session?.country || session?.circuit}, una vez quitada la tendencia de cada stint. Barra más corta, piloto más parejo.</p>
            <ol className="hbars">
              {laps.map((driver) => (
                <li key={driver.number} title={`${driver.name}: ${decimal(driver.consistency, 3)} s sobre ${driver.laps} vueltas (sin quitar la tendencia: ${decimal(driver.deviation, 3)} s)`}>
                  <span className="season-team"><i style={{ background: driver.color }} aria-hidden="true" />{driver.name}</span>
                  <div className="track"><span style={{ width: `${(driver.consistency / worst) * 100}%`, background: driver.color }} /></div>
                  <strong>{decimal(driver.consistency, 3)} s</strong>
                </li>
              ))}
            </ol>
          </>
        ) : <SeasonEmpty>{session ? "OpenF1 todavía no tiene los tiempos por vuelta de esta carrera." : "Todavía no hay carreras con tiempos por vuelta, o OpenF1 no respondió."}</SeasonEmpty>}
      </section>

      <section className="season-section">
        <h2>Carrera a carrera</h2>
        {season.length ? (
          <div className="season-scroll">
            <table className="season-table">
              <thead><tr><th>Piloto</th><th>Equipo</th><th className="num">Desvío de posición</th><th className="num">Posición media</th><th className="num">En los puntos</th><th className="num">Terminadas</th><th className="num">Posiciones ganadas</th></tr></thead>
              <tbody>
                {season.map((row) => (
                  <tr key={row.driverId}>
                    <td><Link href={`/pilotos/${row.driverId}`}>{row.name}</Link></td>
                    <td><TeamName id={row.team} /></td>
                    <td className="num">{row.spread === null ? "—" : `± ${decimal(row.spread, 1)}`}</td>
                    <td className="num">{decimal(row.averageFinish, 1)}</td>
                    <td className="num">{row.pointsFinishes} de {row.starts}</td>
                    <td className="num">{row.finishes} de {row.starts}</td>
                    <td className="num">{row.gained === null ? "—" : `${row.gained > 0 ? "+" : ""}${decimal(row.gained, 1)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <SeasonEmpty>Hacen falta al menos tres carreras disputadas.</SeasonEmpty>}
      </section>
    </SeasonShell>
  );
}
