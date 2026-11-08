import type { Metadata } from "next";
import Link from "next/link";
import { SeasonEmpty, SeasonShell, TeamName, decimal } from "@/components/season/SeasonShell";
import { getSeasonData, teammateDuels, type Duel } from "@/lib/season-analysis";
import { seasonTeam } from "@/lib/season-teams";

export const metadata: Metadata = {
  title: "Duelos entre compañeros",
  description: "Head to head de cada pareja de compañeros de equipo en la temporada de Fórmula 1: clasificación, carrera, sprint, puntos y diferencia a una vuelta."
};
export const revalidate = 1800;

function DuelBar({ duel, color, label }: { duel: Duel; color: string; label: string }) {
  const total = duel.a + duel.b;
  if (!total) return <span className="muted">—</span>;
  return (
    <div className="duel" title={`${label}: ${duel.a} a ${duel.b}`}>
      <b className={duel.a >= duel.b ? "lead" : undefined}>{duel.a}</b>
      <div className="duel-bar" role="img" aria-label={`${label}: ${duel.a} a ${duel.b}`}>
        {duel.a ? <span style={{ flex: duel.a, background: color }} /> : null}
        {duel.b ? <span style={{ flex: duel.b, background: color }} /> : null}
      </div>
      <b className={duel.b >= duel.a ? "lead" : undefined}>{duel.b}</b>
    </div>
  );
}

export default async function DuelsPage() {
  const data = await getSeasonData();
  const pairs = teammateDuels(data);
  const regular = pairs.filter((pair) => pair.races >= 3);
  const occasional = pairs.filter((pair) => pair.races < 3);

  return (
    <SeasonShell
      title="Duelos entre compañeros"
      subtitle={data.races.length ? `Temporada ${data.season}, ${data.races.length} carreras disputadas.` : undefined}
      method={<>
        <p>Clasificación: quién largó la qualy más adelante. Carrera y sprint: quién terminó delante, solo cuando los dos vieron la bandera a cuadros, porque un abandono suele decir más del auto que del piloto.</p>
        <p>Diferencia a una vuelta: mediana de la distancia entre los dos en la última tanda de clasificación que compartieron (Q3, Q2 o Q1), en porcentaje del tiempo del compañero. Se descartan las diferencias de más de 2,5 %, que suelen venir de un accidente o una bandera roja.</p>
        <p>Datos de resultados de <a href="https://jolpi.ca" target="_blank" rel="noreferrer">Jolpica</a>.</p>
      </>}
    >
      {!data.live ? <SeasonEmpty>No pudimos leer los resultados de la temporada. Probá de nuevo en unos minutos.</SeasonEmpty> : null}
      {regular.length ? (
        <section className="season-section">
          <div className="season-scroll">
            <table className="season-table">
              <thead>
                <tr><th>Equipo</th><th>Pilotos</th><th>Clasificación</th><th>Carrera</th><th>Sprint</th><th className="num">Puntos</th><th className="num">Diferencia a una vuelta</th></tr>
              </thead>
              <tbody>
                {regular.map((pair) => {
                  const color = seasonTeam(pair.team).color;
                  const faster = pair.qualiGap === null ? null : pair.qualiGap < 0 ? pair.a : pair.b;
                  return (
                    <tr key={`${pair.team}-${pair.a.driverId}-${pair.b.driverId}`}>
                      <td><TeamName id={pair.team} /></td>
                      <td>
                        <div className="duel-names">
                          <Link href={`/pilotos/${pair.a.driverId}`}>{pair.a.name}</Link>
                          <Link href={`/pilotos/${pair.b.driverId}`}>{pair.b.name}</Link>
                          <small>{pair.races} carreras juntos</small>
                        </div>
                      </td>
                      <td><DuelBar duel={pair.qualifying} color={color} label="Clasificación" /></td>
                      <td><DuelBar duel={pair.race} color={color} label="Carrera" /></td>
                      <td><DuelBar duel={pair.sprint} color={color} label="Sprint" /></td>
                      <td className="num">{pair.points.a} – {pair.points.b}</td>
                      <td className="num">
                        {faster && pair.qualiGap !== null ? <>{faster.code} {decimal(Math.abs(pair.qualiGap), 2)} %<br /><small>{pair.qualiGapSamples} clasificaciones</small></> : <span className="muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="season-source">El primer número de cada duelo es del piloto de arriba.</p>
        </section>
      ) : data.live ? <SeasonEmpty>Todavía no hay carreras disputadas esta temporada.</SeasonEmpty> : null}

      {occasional.length ? (
        <section className="season-section">
          <h2>Reemplazos</h2>
          <p className="season-lead">Parejas que coincidieron en una o dos carreras.</p>
          <div className="season-scroll">
            <table className="season-table">
              <thead><tr><th>Equipo</th><th>Pilotos</th><th>Clasificación</th><th>Carrera</th><th className="num">Puntos</th></tr></thead>
              <tbody>
                {occasional.map((pair) => (
                  <tr key={`${pair.team}-${pair.a.driverId}-${pair.b.driverId}`}>
                    <td><TeamName id={pair.team} /></td>
                    <td>{pair.a.name} y {pair.b.name}</td>
                    <td className="num">{pair.qualifying.a} – {pair.qualifying.b}</td>
                    <td className="num">{pair.race.a} – {pair.race.b}</td>
                    <td className="num">{pair.points.a} – {pair.points.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </SeasonShell>
  );
}
