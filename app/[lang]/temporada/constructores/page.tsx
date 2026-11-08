import type { Metadata } from "next";
import { PointsRaceChart } from "@/components/season/PointsRaceChart";
import { SeasonEmpty, SeasonShell, TeamName } from "@/components/season/SeasonShell";
import { constructorProgress, destructorsChampionship, getSeasonData } from "@/lib/season-analysis";

export const metadata: Metadata = {
  title: "Campeonato de constructores",
  description: "Clasificación de constructores de Fórmula 1, su evolución carrera a carrera y el campeonato de destructores: quién termina más carreras contra el muro."
};
export const revalidate = 1800;

export default async function ConstructorsPage() {
  const data = await getSeasonData();
  const progress = constructorProgress(data);
  const destructors = destructorsChampionship(data);
  const leader = progress.teams[0];

  return (
    <SeasonShell
      title="Campeonato de constructores"
      subtitle={progress.rounds.length ? `Temporada ${data.season}, después de ${progress.rounds.length} carreras.` : undefined}
      method={<>
        <p>Los puntos suman carreras y sprints, carrera por carrera, a partir de los resultados de <a href="https://jolpi.ca" target="_blank" rel="noreferrer">Jolpica</a>. Pueden diferir del total oficial si una sanción posterior cambió un resultado.</p>
        <p>El campeonato de destructores cuenta los abandonos por accidente, choque, trompo o daño, en carreras y sprints. No incluye golpes en prácticas ni en clasificación, ni estima el costo de las reparaciones, que los equipos no publican.</p>
      </>}
    >
      {!progress.teams.length ? <SeasonEmpty>{data.live ? "Todavía no hay carreras disputadas esta temporada." : "No pudimos leer los resultados de la temporada. Probá de nuevo en unos minutos."}</SeasonEmpty> : (
        <>
          <section className="season-section">
            <div className="season-scroll">
              <table className="season-table">
                <thead><tr><th className="num">Pos.</th><th>Equipo</th><th className="num">Puntos</th><th className="num">Diferencia</th><th className="num">Victorias</th><th className="num">Podios</th></tr></thead>
                <tbody>
                  {progress.teams.map((team, index) => (
                    <tr key={team.team}>
                      <td className="num">{index + 1}</td>
                      <td><TeamName id={team.team} /></td>
                      <td className="num"><b>{team.points}</b></td>
                      <td className="num muted">{index ? `−${leader.points - team.points}` : "—"}</td>
                      <td className="num">{team.wins}</td>
                      <td className="num">{team.podiums}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {progress.rounds.length > 1 ? (
            <section className="season-section">
              <h2>Carrera a carrera</h2>
              <p className="season-lead">Puntos acumulados después de cada Gran Premio.</p>
              <div className="season-chart-frame"><PointsRaceChart progress={progress} /></div>
            </section>
          ) : null}
          <section className="season-section" id="destructores">
            <h2>Campeonato de destructores</h2>
            <p className="season-lead">Carreras y sprints que cada equipo terminó por un accidente, un choque o daño.</p>
            {destructors.length ? (
              <div className="season-scroll">
                <table className="season-table">
                  <thead><tr><th className="num">Pos.</th><th>Equipo</th><th className="num">Abandonos</th><th>Pilotos</th><th>Dónde</th></tr></thead>
                  <tbody>
                    {destructors.map((row, index) => (
                      <tr key={row.team}>
                        <td className="num">{index + 1}</td>
                        <td><TeamName id={row.team} /></td>
                        <td className="num"><b>{row.crashes}</b></td>
                        <td>{Object.entries(row.drivers).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name.split(" ").at(-1)} ${count}`).join(", ")}</td>
                        <td className="muted">{row.records.map((record) => `${record.race}${record.session === "Sprint" ? " (sprint)" : ""}, v. ${record.lap}`).join(" · ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <SeasonEmpty>Nadie abandonó por un accidente esta temporada.</SeasonEmpty>}
          </section>
        </>
      )}
    </SeasonShell>
  );
}
