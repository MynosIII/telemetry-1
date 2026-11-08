import type { Metadata } from "next";
import Link from "next/link";
import { SeasonShell, TeamName } from "@/components/season/SeasonShell";
import { seasonTeam, seasonTeams } from "@/lib/season-teams";
import { componentLabel, reasonGroups, reasonLabels, updateSeason } from "@/lib/season-updates";

export const metadata: Metadata = {
  title: "Evoluciones técnicas",
  description: "Las piezas nuevas que cada equipo de Fórmula 1 presentó ante la FIA en cada Gran Premio de la temporada."
};

// Three-letter column heads; Australia and Austria would both be AUS otherwise.
const shortCodes: Record<string, string> = {
  australia: "AUS", china: "CHN", japon: "JPN", miami: "MIA", canada: "CAN", monaco: "MON", barcelona: "BAR", austria: "AUT",
  "gran-bretana": "GBR", belgica: "BEL", hungria: "HUN", "paises-bajos": "NED", italia: "ITA", espana: "MAD", azerbaiyan: "AZE",
  singapur: "SIN", "estados-unidos": "USA", mexico: "MEX", "sao-paulo": "SAP"
};

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ equipo?: string }> }) {
  const { equipo } = await searchParams;
  const team = seasonTeams.find((item) => item.id === equipo)?.id;
  const events = updateSeason.events;
  const counts = seasonTeams.map((item) => ({
    team: item.id,
    perEvent: events.map((event) => event.updates.filter((update) => update.team === item.id).length),
    groups: reasonGroups.map((group) => events.reduce((sum, event) => sum + event.updates.filter((update) => update.team === item.id && group.reasons.includes(update.reason)).length, 0))
  })).map((row) => ({ ...row, total: row.perEvent.reduce((sum, value) => sum + value, 0) }))
    .sort((a, b) => b.total - a.total);
  const maxCell = Math.max(...counts.flatMap((row) => row.perEvent), 1);

  return (
    <SeasonShell
      title="Evoluciones técnicas"
      subtitle={`${events.reduce((sum, event) => sum + event.updates.length, 0)} piezas declaradas en ${events.length} Grandes Premios de ${updateSeason.season}.`}
      method={<>
        <p>Antes de cada Gran Premio, cada equipo le presenta a la FIA las piezas que cambió respecto de la carrera anterior y el motivo principal. Este registro las reúne. En Australia los equipos describieron el auto con el que empezaron el año.</p>
        <p>Una fila de la FIA puede agrupar varias piezas pequeñas; contamos filas, no cantidad de piezas. Las descripciones están resumidas y traducidas. Fuente: <a href={updateSeason.sourceUrl} target="_blank" rel="noreferrer">documentos de la FIA</a>, cada carrera enlaza el suyo.</p>
      </>}
    >
      <section className="season-section">
        <h2>Temporada por equipo</h2>
        <p className="season-lead">Piezas presentadas en cada carrera. Elegí un equipo para ver solo las suyas.</p>
        <div className="season-scroll">
          <table className="season-table">
            <thead>
              <tr>
                <th>Equipo</th>
                {events.map((event) => <th key={event.id} className="num" title={event.gp}>{shortCodes[event.id] ?? event.id.slice(0, 3).toUpperCase()}</th>)}
                <th className="num">Total</th>
                {reasonGroups.map((group) => <th key={group.label} className="num">{group.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {counts.map((row) => (
                <tr key={row.team} aria-current={row.team === team ? "true" : undefined}>
                  <td><Link href={row.team === team ? "/temporada/desarrollo" : `/temporada/desarrollo?equipo=${row.team}`} prefetch={false}><TeamName id={row.team} /></Link></td>
                  {row.perEvent.map((value, index) => (
                    <td key={events[index].id} className="num" title={`${seasonTeam(row.team).name}, ${events[index].gp}: ${value}`}>
                      <span className={value ? "heat" : "heat heat-0"} style={value ? { background: `color-mix(in srgb, ${seasonTeam(row.team).color} ${Math.round(18 + (value / maxCell) * 62)}%, transparent)` } : undefined}>{value || "·"}</span>
                    </td>
                  ))}
                  <td className="num"><b>{row.total}</b></td>
                  {row.groups.map((value, index) => <td key={reasonGroups[index].label} className="num muted">{value}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="season-section">
        <h2>{team ? `Piezas de ${seasonTeam(team).name}` : "Carrera por carrera"}</h2>
        {team ? <p className="season-lead"><Link href="/temporada/desarrollo">Ver todos los equipos</Link></p> : null}
        {[...events].reverse().map((event) => {
          const list = event.updates.filter((update) => !team || update.team === team);
          if (!list.length) return null;
          const byTeam = new Map<string, typeof list>();
          for (const update of list) byTeam.set(update.team, [...(byTeam.get(update.team) ?? []), update]);
          return (
            <article key={event.id} className="updates-gp" id={event.id}>
              <h3>{event.gp}<small>{list.length} {list.length === 1 ? "pieza" : "piezas"} · <a href={event.url} target="_blank" rel="noreferrer">documento FIA</a></small></h3>
              {[...byTeam.entries()].map(([teamId, items]) => (
                <div className="updates-team" key={teamId}>
                  <TeamName id={teamId} />
                  <ul>
                    {items.map((update, index) => (
                      <li key={index}><b>{componentLabel(update.component)}</b><em>{reasonLabels[update.reason]}</em><br /><span>{update.description}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          );
        })}
      </section>
    </SeasonShell>
  );
}
