import Link from "next/link";
import Image from "./ResilientImage";
import { getHistoryIndex, type HistoryEntity } from "@/lib/history";
import type { DriverProfile } from "@/lib/types";

const number = (value: number) => value.toLocaleString("es-AR", { maximumFractionDigits: 2 });
const date = (value?: string) => value ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : undefined;
const best = (values: (number | null | undefined)[]) => {
  const classified = values.filter((value): value is number => typeof value === "number" && value > 0);
  return classified.length ? Math.min(...classified) : undefined;
};
const rate = (value: number, starts: number) => starts ? `${number(value / starts * 100)}%` : undefined;

type Metric = { label: string; value: number | string | null | undefined; detail?: string; href?: string };

function MetricGroup({ title, metrics }: { title: string; metrics: Metric[] }) {
  return <div className="driver-summary-group"><h2>{title}</h2><dl>{metrics.map(metric => <div key={metric.label}><dt>{metric.href ? <a href={metric.href}>{metric.label} ↗</a> : metric.label}</dt><dd>{typeof metric.value === "number" ? number(metric.value) : metric.value ?? "—"}{metric.detail ? <small>{` (${metric.detail})`}</small> : null}</dd></div>)}</dl></div>;
}

export async function DriverOverview({ profile, history }: { profile: DriverProfile; history?: HistoryEntity }) {
  const { identity, standing, telemetry } = profile;
  const index = history ? await getHistoryIndex() : undefined;
  const drivers = index?.entities.filter(entity => entity.category === "drivers").sort((a, b) => a.name.localeCompare(b.name, "es")) ?? [];
  const driverIndex = drivers.findIndex(driver => driver.id === identity.driverId);
  const previous = driverIndex > 0 ? drivers[driverIndex - 1] : undefined;
  const next = driverIndex >= 0 ? drivers[driverIndex + 1] : undefined;
  const records = history?.raceResults ?? [];
  const first = records[0];
  const last = records.at(-1);
  const bestFinish = best(records.map(record => record.position)) ?? telemetry?.bestFinish;
  const bestGrid = best(records.map(record => record.grid));
  const nation = history?.relations.find(group => group.category === "nations")?.items[0];
  const constructors = history?.relations.find(group => group.category === "constructors")?.items.length;
  const engines = history?.relations.find(group => group.category === "engines")?.items.length;
  const circuits = history?.relations.find(group => group.category === "circuits")?.items.length;
  const titleSeasons = history?.titleSeasons ?? [];
  const stats = history?.stats;
  const standings = history?.seasonStandings ?? [];
  const topPosition = Math.max(2, ...standings.map(season => Number(season.position)).filter(position => Number.isFinite(position) && position > 0));
  const years = history ? Array.from({ length: history.lastSeason - history.firstSeason + 1 }, (_, i) => history.firstSeason + i) : [];
  const birthDate = history?.biography.dateOfBirth ?? identity.dateOfBirth;
  const deathDate = history?.biography.dateOfDeath;
  const fullName = history?.fullName ?? identity.name;
  const archiveEnd = index?.meta.lastSeason;

  return <section className="driver-overview" aria-labelledby="driver-overview-name">
    <header className="driver-overview-header">
      {previous ? <Link prefetch={false} href={previous.href} aria-label={`Piloto anterior: ${previous.name}`} title={previous.name}>←<span>Anterior</span></Link> : <span />}
      <div><p className="eyebrow eyebrow-red">FICHA DEL PILOTO</p><h1 id="driver-overview-name">{identity.name}</h1></div>
      {next ? <Link prefetch={false} href={next.href} aria-label={`Piloto siguiente: ${next.name}`} title={next.name}><span>Siguiente</span>→</Link> : <span />}
    </header>

    <div className="driver-overview-main">
      <div className="driver-overview-portrait">
        {identity.image ? <Image src={identity.image} alt={`Retrato de ${identity.name}`} fill priority sizes="(max-width: 700px) 120px, 220px" unoptimized /> : <div className="driver-overview-monogram" aria-label="Retrato no disponible"><span>{identity.name.split(" ").map(part => part[0]).slice(0, 2).join("")}</span><small>ARCHIVO F1</small></div>}
        <span className="driver-overview-era">{history ? `ARCHIVO ${history.firstSeason === history.lastSeason ? history.firstSeason : `${history.firstSeason}—${history.lastSeason}`}` : identity.code ?? "FÓRMULA 1"}</span>
      </div>
      <div className="driver-overview-identity">
        {fullName !== identity.name ? <p className="driver-overview-fullname">{fullName}</p> : null}
        <dl className="driver-overview-facts">
          <div><dt>Nacimiento</dt><dd>{date(birthDate) ?? "Sin registro"}{history?.biography.placeOfBirth ? ` · ${history.biography.placeOfBirth}` : ""}</dd></div>
          {deathDate ? <div><dt>Fallecimiento</dt><dd>{date(deathDate)}</dd></div> : null}
          <div><dt>Nacionalidad</dt><dd>{nation ? <Link prefetch={false} href={nation.href}>{nation.name} ↗</Link> : history?.country ?? identity.nationality ?? "Sin registro"}</dd></div>
          <div><dt>Primer GP registrado</dt><dd>{first ? <Link prefetch={false} href={`/historia/carreras/${first.season}/${first.round}`}>{first.event} · {first.season} ↗</Link> : history?.firstSeason ?? telemetry?.debut ?? "—"}</dd></div>
          <div><dt>Último GP del archivo</dt><dd>{last ? <Link prefetch={false} href={`/historia/carreras/${last.season}/${last.round}`}>{last.event} · {last.season} ↗</Link> : history?.lastSeason ?? telemetry?.lastSeason ?? "—"}</dd></div>
          <div><dt>Mejor resultado</dt><dd>{bestFinish ? `P${bestFinish}` : "Sin clasificación"}</dd></div>
          <div><dt>Mejor posición de salida</dt><dd>{bestGrid ? `P${bestGrid}` : "Sin registro"}</dd></div>
        </dl>
        <div className="driver-overview-titles"><span>Campeonatos del mundo{archiveEnd ? ` (hasta ${archiveEnd})` : ""}</span><strong>{history ? titleSeasons.length : telemetry?.championships ?? "—"}</strong><div>{titleSeasons.length ? titleSeasons.map(year => <Link prefetch={false} key={year} href={`/historia/seasons/${year}`}>{year}</Link>) : <span>{history ? "Sin títulos" : "Sin registro histórico"}</span>}</div></div>
        {standing ? <p className="driver-overview-current"><span>TEMPORADA EN CURSO</span> <strong>P{standing.position}</strong> · {standing.team} · <strong>{standing.points} puntos</strong>{standing.wins ? <> · <strong>{standing.wins === "1" ? "1 victoria" : `${standing.wins} victorias`}</strong></> : null}{archiveEnd ? <small> No se suma a las cifras del archivo, que llegan hasta {archiveEnd}.</small> : null}</p> : null}
      </div>
    </div>

    {history ? <figure className="driver-season-summary"><figcaption><strong>Posición en el campeonato, año por año</strong><span>La barra más alta indica la mejor posición. Dorado: campeón.</span></figcaption><div className="driver-season-track">{years.map(year => {
      const season = history.seasons.find(season => season.season === year);
      const position = Number(season?.position);
      const classified = Number.isFinite(position) && position > 0;
      const champion = titleSeasons.includes(year);
      const description = season ? `${year}: ${classified ? `P${position}` : "sin clasificación en el campeonato"}, ${number(season.points ?? 0)} puntos` : `${year}: sin inscripciones registradas`;
      return <Link prefetch={false} href={`/historia/seasons/${year}`} className={`driver-season-cell${champion ? " is-champion" : ""}${!season ? " is-gap" : ""}`} key={year} title={description} aria-label={description}><span>{year}</span><b>{season ? classified ? position : "SC" : "—"}</b><div className="driver-season-bar"><i style={{ height: `${classified ? 16 + (1 - (position - 1) / topPosition) * 48 : season ? 8 : 2}px` }} /></div></Link>;
    })}</div></figure> : null}

    {history ? <p className="driver-overview-scope">CIFRAS DEL ARCHIVO {index?.meta.firstSeason ?? 1950}–{archiveEnd} · NO INCLUYEN LA TEMPORADA EN CURSO</p> : null}
    <div className="driver-overview-metrics">
      <MetricGroup title="Participación" metrics={[
        { label: "Inscripciones", value: stats?.entries, href: "#conexiones" },
        { label: "Carreras iniciadas", value: stats?.starts },
        { label: "Sin largada", value: stats ? stats.entries - stats.starts : undefined },
        { label: "Temporadas", value: stats?.seasons },
      ]} />
      <MetricGroup title="Palmarés" metrics={[
        { label: "Victorias", value: stats?.wins ?? telemetry?.wins, detail: stats ? rate(stats.wins, stats.starts) : undefined },
        { label: "Podios", value: stats?.podiums ?? telemetry?.podiums, detail: stats ? rate(stats.podiums, stats.starts) : undefined },
        { label: "Salidas P1", value: stats?.poles ?? telemetry?.poles, detail: stats ? rate(stats.poles, stats.starts) : undefined },
        { label: "Vueltas rápidas", value: stats?.fastestLaps, detail: stats ? rate(stats.fastestLaps, stats.starts) : undefined },
      ]} />
      <MetricGroup title="Puntos y recorrido" metrics={[
        { label: "Puntos de campeonato", value: history?.officialPoints ?? telemetry?.officialPoints },
        { label: "Puntos / largada", value: stats && stats.starts && history?.officialPoints !== null ? number((history?.officialPoints ?? 0) / stats.starts) : undefined },
        { label: "Vueltas registradas", value: stats?.laps },
        { label: "Abandonos", value: stats?.retirements, detail: stats ? rate(stats.retirements, stats.starts) : undefined },
      ]} />
      <MetricGroup title="Conexiones" metrics={[
        { label: "Constructores", value: constructors, href: "#conexiones" },
        { label: "Motoristas", value: engines, href: "#conexiones" },
        { label: "Circuitos", value: circuits, href: "#conexiones" },
        { label: "Compañeros del modelo", value: history?.model?.teammates?.length, href: "#conexiones" },
      ]} />
    </div>
    <p className="driver-overview-note">{history ? "Archivo 1950–2025 · Porcentajes sobre carreras iniciadas. P1 describe la grilla, no necesariamente la pole oficial. Puntos según el reglamento de cada año; inscripciones sin registro de clasificación pueden faltar." : "Los datos históricos sin cobertura se muestran como —."} <a href="#fuentes">Fuentes y criterios ↗</a></p>
  </section>;
}
