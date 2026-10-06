import Link from "next/link";
import type { HistoryEntity } from "@/lib/history";
import { getDriverAchievements } from "@/lib/driver-achievements";
type Race = NonNullable<HistoryEntity["raceResults"]>[number];
function RaceLink({ race }: { race?: Race }) {
  return race ? <Link prefetch={false} href={`/historia/carreras/${race.season}/${race.round}`}><strong>{race.event} · {race.season} ↗</strong><small>{new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${race.date}T12:00:00Z`))}</small></Link> : <strong>Sin registro</strong>;
}
export async function DriverCareer({ history }: { history: HistoryEntity }) {
  const data = await getDriverAchievements();
  const extra = data.drivers[history.id];
  const races = [...(history.raceResults ?? [])].sort((a, b) => a.season - b.season || a.round - b.round);
  const started = new Set(extra?.starts.map(r => `${r.season}-${r.round}`));
  // A driver could share more than one car in early races; count the event once.
  const byEvent = new Map<string, Race>();
  for (const race of races) {
    const key = `${race.season}-${race.round}`;
    if (!started.has(key)) continue;
    const previous = byEvent.get(key);
    if (!previous || (race.position ?? Infinity) < (previous.position ?? Infinity)) byEvent.set(key, race);
  }
  const starts = [...byEvent.values()];
  let streak = 0, longest = 0, beginning: Race | undefined, streakFirst: Race | undefined, streakLast: Race | undefined;
  for (const race of starts) {
    if (race.position === 1) {
      if (!streak) beginning = race;
      streak++;
      if (streak > longest) { longest = streak; streakFirst = beginning; streakLast = race; }
    } else streak = 0;
  }
  const minimum = (values: (number | null)[]) => { const valid = values.filter((v): v is number => typeof v === "number" && v > 0); return valid.length ? `P${Math.min(...valid)}` : "Sin clasificación"; };
  const metrics = [["Campeonatos", history.titleSeasons.length], ["Victorias", history.stats.wins], ["Podios", history.stats.podiums], ["Salidas P1", history.stats.poles], ["Vueltas rápidas", history.stats.fastestLaps], ["Inscripciones", history.stats.entries], ["Puntos de campeonato", history.officialPoints ?? "Sin registro"], ["Piloto del día", extra?.votesCovered ? extra.driverOfTheDay.length : "Sin cobertura"], ["Grand Slams", extra ? extra.grandSlams.length : "Sin cobertura"]] as const;
  return <section className="driver-career" aria-label="Logros e hitos de carrera">
    {extra?.code || extra?.number ? <p className="driver-overview-note">{extra.code ? `Código: ${extra.code}` : ""}{extra.number ? ` · Número permanente: ${extra.number}` : ""}</p> : null}
    <dl className="driver-career-cards">{metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{typeof value === "number" ? value.toLocaleString("es-AR", { maximumFractionDigits: 2 }) : value}</dd></div>)}</dl>
    <h2>Mejores resultados de carrera</h2>
    <dl className="driver-career-cards driver-career-bests">{[["Campeonato", minimum(history.seasonStandings.map(s => Number(s.position)))], ["Posición de salida", minimum(races.map(r => r.grid))], ["Resultado en carrera", minimum(races.map(r => r.position))]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <h2>Hitos de carrera</h2>
    <div className="driver-career-milestones">
      <article><h3>Primera carrera iniciada</h3><RaceLink race={starts[0]} /></article>
      <article><h3>Última carrera iniciada del archivo</h3><RaceLink race={starts.at(-1)} /></article>
      <article><h3>Primera victoria</h3>{history.stats.wins ? <RaceLink race={races.find(r => r.position === 1)} /> : <strong>Sin victorias</strong>}</article>
      <article><h3>Mayor racha de victorias</h3><strong>{longest} {longest === 1 ? "carrera" : "carreras"}</strong>{streakFirst && streakLast ? <p><RaceLink race={streakFirst} /><span>hasta</span><RaceLink race={streakLast} /></p> : null}<small>En largadas consecutivas del piloto; las ausencias no interrumpen la racha.</small></article>
    </div>
    <p className="driver-overview-note">Grand Slam: victoria, pole, vuelta rápida y liderazgo de todas las vueltas, según registros explícitos de F1DB. Piloto del día: votaciones disponibles desde 2016{extra?.votesCovered ? `; ${extra.votesCovered} participaciones con votación` : ""}. Salidas P1 describe la grilla, no necesariamente la pole oficial. Archivo hasta {data.meta.through}. <a href="https://github.com/f1db/f1db">Fuente: F1DB ↗</a></p>
    {extra?.grandSlams.length ? <details><summary>Carreras con Grand Slam ({extra.grandSlams.length})</summary><ul>{extra.grandSlams.map(race => <li key={`${race.season}-${race.round}`}><RaceLink race={races.find(r => r.season === race.season && r.round === race.round)} /></li>)}</ul></details> : null}
  </section>;
}
