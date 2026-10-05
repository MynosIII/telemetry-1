"use client";

import { useState } from "react";
import Link from "next/link";
import type { CarSummary } from "@/lib/championship-history";
import { ArchiveReference } from "./ArchiveReference";
import { ArchiveMediaFigure } from "./ArchiveMediaFigure";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function CarCatalogue({ cars, initialSeason }: { cars: CarSummary[]; initialSeason: string }) {
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState(initialSeason);
  const [constructor, setConstructor] = useState("");
  const [page, setPage] = useState(0);
  const constructors = [...new Map(cars.map(c => [c.constructor.id, c.constructor])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const matches = cars.filter(c => (!season || c.seasons.includes(Number(season))) && (!constructor || c.constructor.id === constructor) && (!search || normalize(`${c.name} ${c.constructor.name} ${c.engines.map(e => e.name).join(" ")}`).includes(normalize(search))));
  const pageCount = Math.max(1, Math.ceil(matches.length / 30));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = matches.slice(currentPage * 30, (currentPage + 1) * 30);
  return <div><div className="car-catalogue-filters"><label>Buscar modelo o motor<input type="search" value={search} placeholder="Ferrari 312T, Cosworth…" onChange={e => { setSearch(e.target.value); setPage(0); }} /></label><label>Temporada<select value={season} onChange={e => { setSeason(e.target.value); setPage(0); }}><option value="">Todas las temporadas</option>{Array.from({ length: 76 }, (_, i) => 2025 - i).map(y => <option key={y}>{y}</option>)}</select></label><label>Constructor<select value={constructor} onChange={e => { setConstructor(e.target.value); setPage(0); }}><option value="">Todos los constructores</option>{constructors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div><p className="ency-note" role="status">{matches.length} modelos encontrados · {matches.length ? currentPage * 30 + 1 : 0}–{Math.min((currentPage + 1) * 30, matches.length)}</p><div className="ency-table-scroll"><table className="car-catalogue-table"><caption>Modelos de auto del Campeonato Mundial, 1950–2025</caption><thead><tr><th>Chasis</th><th>Fotografía documentada</th><th>Constructor / motor</th><th>Temporadas con inscripción</th></tr></thead><tbody>{visible.map(car => <tr key={car.id}><th scope="row"><Link href={car.href} prefetch={false}>{car.name} →</Link></th><td>{car.photo ? <ArchiveMediaFigure media={car.photo} alt={car.name} /> : <div className="car-no-photo"><span>{car.name}</span><small>Fotografía por documentar</small></div>}</td><td><ArchiveReference entity={car.constructor} />{car.engines.map(e => <small key={e.id}><ArchiveReference entity={e} /></small>)}</td><td>{car.seasons.map((y, i) => <span key={y}>{i ? ", " : ""}<Link href={`/historia/seasons/${y}`} prefetch={false}>{y}</Link></span>)}</td></tr>)}</tbody></table></div>{!matches.length ? <p className="ency-empty">No hay modelos que coincidan con esos filtros.</p> : null}<nav className="catalogue-pagination" aria-label="Páginas del catálogo"><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>← Anterior</button><span>Página {currentPage + 1} / {pageCount}</span><button disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Siguiente →</button></nav></div>;
}
