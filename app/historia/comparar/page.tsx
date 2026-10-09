import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getCountryFlagUrl } from "@/lib/circuit-visuals";
import { translate } from "@/lib/dictionary";
import { findDriver, headToHead, ratingSeries, type DuelTotals, type RatingPoint } from "@/lib/compare";
import { getHistoryEntity, getHistoryIndex, type HistoryEntity } from "@/lib/history";
import "./compare.css";

export const metadata: Metadata = { title: "Comparar pilotos", description: "Dos pilotos de Fórmula 1 frente a frente: números de carrera, duelos en pista y la evolución de su ELO en el modelo v7.6." };

type Query = { a?: string; b?: string; eje?: string };
const COLORS = ["#e10600", "#5aa9ff"];
const SUGGESTIONS: [string, string][] = [["senna", "prost"], ["hamilton", "max_verstappen"], ["michael_schumacher", "hakkinen"], ["fangio", "moss"], ["alonso", "vettel"], ["lauda", "hunt"]];

const pct = (part: number, whole: number) => whole ? `${(part / whole * 100).toFixed(1).replace(".", ",")} %` : "—";
const num = (value: number | null | undefined, digits = 0) => value == null ? "—" : value.toLocaleString("es-AR", { maximumFractionDigits: digits });

function Name({ entity, color }: { entity: HistoryEntity; color: string }) {
  const flag = entity.country ? getCountryFlagUrl(entity.country) : undefined;
  return <span className="compare-name"><i style={{ background: color }} aria-hidden="true" />{flag ? <img src={flag} alt="" width={18} height={12} /> : null}<Link href={entity.href} prefetch={false}>{entity.name}</Link></span>;
}

type Row = { label: string; a: number | null | undefined; b: number | null | undefined; text?: [string, string]; lowerWins?: boolean; digits?: number };
function StatRow({ row }: { row: Row }) {
  const { a, b } = row;
  const winner = a == null || b == null || a === b ? 0 : (a > b) !== Boolean(row.lowerWins) ? -1 : 1;
  return <tr><td className={winner < 0 ? "is-better" : undefined}>{row.text?.[0] ?? num(a, row.digits)}</td><th scope="row">{row.label}</th><td className={winner > 0 ? "is-better" : undefined}>{row.text?.[1] ?? num(b, row.digits)}</td></tr>;
}

function Duels({ title, totals, a, b }: { title: string; totals: DuelTotals; a: HistoryEntity; b: HistoryEntity }) {
  if (!totals.races) return null;
  const bar = (x: number, y: number) => {
    const sum = x + y || 1;
    return <div className="compare-bar" aria-hidden="true"><span style={{ width: `${x / sum * 100}%`, background: COLORS[0] }} /><span style={{ width: `${y / sum * 100}%`, background: COLORS[1] }} /></div>;
  };
  return <section className="compare-duel">
    <h3>{title} <small>{totals.races} {totals.races === 1 ? "carrera" : "carreras"}</small></h3>
    <div className="compare-duel-row"><strong>{totals.aRace}</strong><span>Terminó delante</span><strong>{totals.bRace}</strong></div>
    {bar(totals.aRace, totals.bRace)}
    <div className="compare-duel-row"><strong>{totals.aGrid}</strong><span>Largó delante</span><strong>{totals.bGrid}</strong></div>
    {bar(totals.aGrid, totals.bGrid)}
    <p className="ency-note">{a.name} a la izquierda, {b.name} a la derecha. Sin desempate cuando los dos abandonaron en la misma vuelta.</p>
  </section>;
}

function RatingChart({ series, axis, names }: { series: RatingPoint[][][]; axis: "fecha" | "edad"; names: string[] }) {
  const points = series.flat(2);
  if (!points.length) return <p className="ency-note">El modelo v7.6 no tiene ratings para estos pilotos.</p>;
  const minX = Math.floor(Math.min(...points.map(p => p.x))), maxX = Math.ceil(Math.max(...points.map(p => p.x)));
  const low = Math.floor(Math.min(...points.map(p => p.rating)) / 100) * 100, high = Math.ceil(Math.max(...points.map(p => p.rating)) / 100) * 100;
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(100, high - low);
  const x = (v: number) => 54 + (v - minX) / spanX * 714, y = (v: number) => 220 - (v - low) / spanY * 190;
  const step = spanX > 30 ? 10 : spanX > 12 ? 5 : spanX > 6 ? 2 : 1;
  const ticks = Array.from({ length: spanX + 1 }, (_, i) => minX + i).filter(v => v % step === 0);
  return <figure className="compare-chart">
    <svg viewBox="0 0 800 260" role="img" aria-label={`ELO v7.6 de ${names.join(" y ")} por ${axis === "edad" ? "edad" : "año"}, escala ${low} a ${high}.`}>
      {[0, .5, 1].map(f => <g key={f}><line x1="54" x2="768" y1={y(low + f * spanY)} y2={y(low + f * spanY)} stroke="#2a2a2a" /><text x="4" y={y(low + f * spanY) + 4}>{Math.round(low + f * spanY)}</text></g>)}
      {ticks.map(t => <text key={t} x={x(t)} y="250" textAnchor="middle">{axis === "edad" ? `${t} años` : t}</text>)}
      {series.map((segments, i) => segments.map((segment, j) => <polyline key={`${i}-${j}`} points={segment.map(p => `${x(p.x).toFixed(1)},${y(p.rating).toFixed(1)}`).join(" ")} fill="none" stroke={COLORS[i]} strokeWidth="2.5" strokeLinejoin="round" />))}
    </svg>
  </figure>;
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<Query> }) {
  const [index, query] = await Promise.all([getHistoryIndex(), searchParams]);
  const drivers = index.entities.filter(e => e.category === "drivers").sort((x, y) => x.name.localeCompare(y.name, "es"));
  const foundA = findDriver(drivers, query.a), foundB = findDriver(drivers, query.b);
  const axis = query.eje === "edad" ? "edad" : "fecha";
  // Names typed in the form resolve to archive ids so the address can be shared.
  if ((foundA && foundA.id !== query.a) || (foundB && foundB.id !== query.b)) {
    const params = new URLSearchParams();
    if (foundA) params.set("a", foundA.id);
    if (foundB) params.set("b", foundB.id);
    if (axis === "edad") params.set("eje", "edad");
    redirect(`/historia/comparar?${params}`);
  }
  const [a, b] = await Promise.all([foundA ? getHistoryEntity("drivers", foundA.id) : undefined, foundB ? getHistoryEntity("drivers", foundB.id) : undefined]);
  const missing = [query.a && !foundA ? query.a : null, query.b && !foundB ? query.b : null].filter(Boolean);
  const link = (extra: Partial<Query>) => `/historia/comparar?${new URLSearchParams(Object.entries({ a: a?.id, b: b?.id, ...extra }).filter(([, v]) => v) as [string, string][])}`;

  const form = <form className="compare-form" action="/historia/comparar">
    <label><span>Piloto 1</span><input name="a" list="compare-drivers" defaultValue={a?.name ?? ""} placeholder="Ej.: Ayrton Senna" required /></label>
    <span className="compare-vs" aria-hidden="true">vs</span>
    <label><span>Piloto 2</span><input name="b" list="compare-drivers" defaultValue={b?.name ?? ""} placeholder="Ej.: Alain Prost" required /></label>
    {axis === "edad" ? <input type="hidden" name="eje" value="edad" /> : null}
    <button type="submit">Comparar</button>
    <datalist id="compare-drivers">{drivers.map(d => <option key={d.id} value={d.name}>{`${d.firstSeason}–${d.lastSeason}`}</option>)}</datalist>
  </form>;

  let body = null;
  if (a && b) {
    const h2h = headToHead(a, b);
    const ma = a.model, mb = b.model;
    const rows: Row[] = [
      { label: "Temporadas", a: null, b: null, text: [`${a.firstSeason}–${a.lastSeason}`, `${b.firstSeason}–${b.lastSeason}`] },
      { label: "Títulos", a: a.titleSeasons.length, b: b.titleSeasons.length },
      { label: "Grandes Premios largados", a: a.stats.starts, b: b.stats.starts },
      { label: "Victorias", a: a.stats.wins, b: b.stats.wins },
      { label: "% de victorias", a: a.stats.wins / (a.stats.starts || 1), b: b.stats.wins / (b.stats.starts || 1), text: [pct(a.stats.wins, a.stats.starts), pct(b.stats.wins, b.stats.starts)] },
      { label: "Poles", a: a.stats.poles, b: b.stats.poles },
      { label: "% de poles", a: a.stats.poles / (a.stats.starts || 1), b: b.stats.poles / (b.stats.starts || 1), text: [pct(a.stats.poles, a.stats.starts), pct(b.stats.poles, b.stats.starts)] },
      { label: "Podios", a: a.stats.podiums, b: b.stats.podiums },
      { label: "Vueltas rápidas", a: a.stats.fastestLaps, b: b.stats.fastestLaps },
      { label: "Puntos oficiales", a: a.officialPoints, b: b.officialPoints, digits: 1 },
      { label: "Abandonos", a: a.stats.retirements, b: b.stats.retirements, lowerWins: true }
    ];
    const model: Row[] = [
      { label: "Ranking histórico", a: ma?.model?.rank, b: mb?.model?.rank, lowerWins: true, text: [ma?.model?.rank ? `#${ma.model.rank}` : "—", mb?.model?.rank ? `#${mb.model.rank}` : "—"] },
      { label: "ELO de carrera", a: ma?.model?.careerRating, b: mb?.model?.careerRating, digits: 1 },
      { label: "ELO pico", a: ma?.peak?.rating, b: mb?.peak?.rating, digits: 1 },
      { label: "Prime sostenido", a: ma?.model?.sustainedPrime, b: mb?.model?.sustainedPrime, digits: 1 },
      { label: "Victorias esperadas", a: ma?.model?.expectedWins, b: mb?.model?.expectedWins, digits: 1 },
      { label: "Victorias sobre lo esperado", a: ma?.model?.winsAboveExpected, b: mb?.model?.winsAboveExpected, digits: 1 }
    ];
    const peak = (e: HistoryEntity) => e.model?.peak ? `${translate(e.model.peak.event ?? "", "races")} ${e.model.peak.season}` : null;
    body = <>
      <div className="compare-heads"><Name entity={a} color={COLORS[0]} /><Name entity={b} color={COLORS[1]} /></div>
      <div className="compare-columns">
        <section>
          <h2>Números de carrera</h2>
          <div className="ency-table-scroll"><table className="compare-table"><tbody>{rows.map(r => <StatRow key={r.label} row={r} />)}</tbody></table></div>
        </section>
        <section>
          <h2>Frente a frente</h2>
          {h2h.all.races ? <>
            <Duels title="En la misma carrera" totals={h2h.all} a={a} b={b} />
            {h2h.teammates.races ? <Duels title="Como compañeros de equipo" totals={h2h.teammates} a={a} b={b} /> : null}
          </> : <p className="ency-note">Nunca largaron la misma carrera.</p>}
        </section>
      </div>
      <section className="compare-model">
        <h2>Según el modelo v7.6</h2>
        <nav className="ency-controls" aria-label="Eje del gráfico">
          <Link href={link({})} aria-current={axis === "fecha" ? "page" : undefined}>Por año</Link>
          <Link href={link({ eje: "edad" })} aria-current={axis === "edad" ? "page" : undefined}>Por edad</Link>
        </nav>
        <RatingChart series={[ratingSeries(a, axis), ratingSeries(b, axis)]} axis={axis} names={[a.name, b.name]} />
        <div className="ency-table-scroll"><table className="compare-table"><tbody>{model.map(r => <StatRow key={r.label} row={r} />)}</tbody></table></div>
        <p className="ency-note">{[peak(a) ? `Pico de ${a.name}: ${peak(a)}.` : null, peak(b) ? `Pico de ${b.name}: ${peak(b)}.` : null].filter(Boolean).join(" ")} Por edad alinea a los dos pilotos el mismo día de su vida. El ELO es una estimación retrospectiva propia. <Link href="/ranking">Cómo funciona el modelo</Link>.</p>
      </section>
      {h2h.duels.length ? <details className="ency-method compare-races">
        <summary>Las {h2h.duels.length} carreras que compartieron</summary>
        <div className="ency-table-scroll"><table>
          <thead><tr><th>Año</th><th>Gran Premio</th><th>Grilla</th><th>{a.name}</th><th>{b.name}</th><th>Grilla</th></tr></thead>
          <tbody>{h2h.duels.map(d => <tr key={`${d.season}/${d.round}`} className={d.teammates ? "is-teammates" : undefined}>
            <td>{d.season}</td><td><Link href={`/historia/carreras/${d.season}/${d.round}`} prefetch={false}>{d.event}</Link></td>
            <td>{d.a.grid ?? "—"}</td><td className={d.race < 0 ? "is-better" : undefined}>{d.a.position ?? d.a.status}</td>
            <td className={d.race > 0 ? "is-better" : undefined}>{d.b.position ?? d.b.status}</td><td>{d.b.grid ?? "—"}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="ency-note">Resaltadas, las carreras como compañeros de equipo.</p>
      </details> : null}
    </>;
  }

  return <main id="top" className="ency-page"><SiteHeader /><div className="ency-page-wrap compare-wrap">
    <header className="ency-title">
      <nav className="ency-breadcrumb" aria-label="Ruta del artículo"><Link href="/historia">Estadísticas</Link><span>/</span><span>Comparar pilotos</span></nav>
      <h1>{a && b ? `${a.name} vs ${b.name}` : "Comparar pilotos"}</h1>
      <p className="ency-subtitle">Campeonato Mundial {index.meta.firstSeason}–{index.meta.lastSeason}.</p>
    </header>
    {form}
    {missing.length ? <p className="ency-note" role="alert">No encontramos {missing.map(m => `«${m}»`).join(" ni ")} en el archivo.</p> : null}
    {body ?? <section className="compare-suggestions"><h2>Duelos para empezar</h2><ul>{SUGGESTIONS.map(([x, y]) => {
      const dx = drivers.find(d => d.id === x), dy = drivers.find(d => d.id === y);
      return dx && dy ? <li key={`${x}-${y}`}><Link href={`/historia/comparar?a=${x}&b=${y}`}>{dx.name} vs {dy.name}</Link></li> : null;
    })}</ul></section>}
  </div><SiteFooter /></main>;
}
