import type { Metadata } from "next";
import Link from "next/link";
import { SeasonEmpty, SeasonShell } from "@/components/season/SeasonShell";
import { getSchedule } from "@/lib/f1-data";
import { getSeasonData } from "@/lib/season-analysis";
import baseline from "@/lib/live-model-baseline.json";
import { trackDna, traits, type TrackDna } from "@/lib/track-dna";

export const metadata: Metadata = {
  title: "ADN de los circuitos",
  description: "El perfil de cada circuito del calendario medido sobre su trazado: rectas, curvas lentas y rápidas, cambios de dirección, y qué pilotos rinden más según el modelo v7.6."
};
export const revalidate = 1800;

function Percent({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="muted">—</span>;
  return <div className="pct" title={`Más que el ${value} % del calendario`}><div className="track"><span style={{ width: `${Math.max(value, 3)}%` }} /></div><small>{value}</small></div>;
}

const lastName = (name: string) => name.split(" ").at(-1);

export default async function TrackDnaPage({ searchParams }: { searchParams: Promise<{ circuito?: string }> }) {
  const [{ circuito }, schedule, data] = await Promise.all([searchParams, getSchedule(), getSeasonData()]);
  const ids = [...new Set(schedule.map((race) => race.circuitId).filter(Boolean))];
  const active = new Set(data.races.flatMap((race) => race.results.map((result) => result.driverId)));
  if (!active.size) {
    for (const [id, driver] of Object.entries((baseline as { drivers: Record<string, { lastSeason: number }> }).drivers)) if (driver.lastSeason >= 2025) active.add(id);
  }
  const profiles = trackDna(ids, active);
  const raceFor = (circuitId: string) => schedule.find((race) => race.circuitId === circuitId);
  const nameFor = (circuitId: string) => raceFor(circuitId)?.name.replace(/^Gran Premio (de la |de los |de |del )?/, "") ?? circuitId;
  const next = schedule.find((race) => race.state === "next");
  const selected: TrackDna | undefined = profiles.find((profile) => profile.circuitId === circuito) ?? profiles.find((profile) => profile.circuitId === next?.circuitId && profile.topology) ?? profiles.find((profile) => profile.topology);
  const leading = selected ? traits.map((trait) => ({ trait, value: selected.percentiles[trait.key] ?? 50 })).sort((a, b) => Math.abs(b.value - 50) - Math.abs(a.value - 50)).slice(0, 3) : [];

  return (
    <SeasonShell
      title="ADN de los circuitos"
      subtitle={`Los ${ids.length} trazados del calendario ${data.season}, comparados entre sí.`}
      method={<>
        <p>Cada rasgo sale de nuestra medición del dibujo del trazado: largo de las rectas, cuánto gira la pista en curvas cerradas y en curvas amplias, cada cuánto cambia de dirección y cuántas chicanas, eses y curvas que se cierran tiene. Es la misma geometría que usa el <Link href="/ranking">modelo v7.6</Link> para estimar qué circuitos le sientan mejor a cada piloto.</p>
        <p>Los números van de 0 a 100: la posición del circuito frente al resto del calendario en ese rasgo. Los circuitos parecidos son los más cercanos sumando todos los rasgos. «Rinden más» son los tres pilotos de la parrilla actual con el mayor efecto de circuito en el modelo.</p>
      </>}
    >
      {selected?.topology ? (
        <section className="dna-detail" aria-labelledby="dna-title">
          <div>
            <h2 id="dna-title">{nameFor(selected.circuitId)}</h2>
            <p className="ency-subtitle">{raceFor(selected.circuitId)?.circuit}{selected.circuitId === next?.circuitId ? ", la próxima carrera" : ""}</p>
            <dl>
              <div><dt>Lo que lo define</dt><dd>{leading.map(({ trait, value }) => (value >= 50 ? trait.high : trait.low)).join(", ").replace(/^./, (letter) => letter.toUpperCase())}.</dd></div>
              <div><dt>Se parece a</dt><dd>{selected.similar.map((id, index) => <span key={id}>{index ? ", " : ""}<Link href={`/temporada/adn?circuito=${id}`} prefetch={false}>{nameFor(id)}</Link></span>)}</dd></div>
              {selected.favoured.length ? <div><dt>Rinden más</dt><dd>{selected.favoured.map((row) => row.name).join(", ")}</dd></div> : null}
              {selected.disfavoured.length ? <div><dt>Les cuesta</dt><dd>{selected.disfavoured.map((row) => row.name).join(", ")}</dd></div> : null}
            </dl>
            <p className="season-source"><Link href={`/circuitos/${selected.circuitId}`}>Ficha del circuito</Link></p>
          </div>
          <div>
            <table className="season-table">
              <tbody>
                {traits.map((trait) => (
                  <tr key={trait.key} title={trait.hint}><td>{trait.label}</td><td style={{ width: "55%" }}><Percent value={selected.percentiles[trait.key]} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : <SeasonEmpty>No pudimos leer el calendario de la temporada.</SeasonEmpty>}

      <section className="season-section">
        <h2>Todo el calendario</h2>
        <div className="season-scroll">
          <table className="season-table">
            <thead>
              <tr><th>Circuito</th>{traits.map((trait) => <th key={trait.key} title={trait.hint}>{trait.label}</th>)}<th>Se parece a</th><th>Rinden más</th></tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.circuitId} aria-current={profile.circuitId === selected?.circuitId ? "true" : undefined}>
                  <td>{profile.topology ? <Link href={`/temporada/adn?circuito=${profile.circuitId}`} prefetch={false}>{nameFor(profile.circuitId)}</Link> : nameFor(profile.circuitId)}</td>
                  {profile.topology ? traits.map((trait) => <td key={trait.key}><Percent value={profile.percentiles[trait.key]} /></td>) : <td colSpan={traits.length} className="muted">Trazado todavía sin medir.</td>}
                  <td className="muted">{profile.similar.map(nameFor).join(", ") || "—"}</td>
                  <td>{profile.favoured.map((row) => lastName(row.name)).join(", ") || <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SeasonShell>
  );
}
