"use client";

import { useState } from "react";
import Link from "next/link";
import type { CarSummary } from "@/lib/championship-history";
import { ArchiveReference } from "./ArchiveReference";
import { CarPhoto } from "./CarPhoto";
import { carImage } from "@/lib/team-media";

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
  const photos = visible.some(car => carImage(car).sources.length);
  return <div><div className="car-catalogue-filters"><label><span className="sr-only">Buscar modelo o motor</span><input type="search" value={search} placeholder="Buscar: Ferrari 312T, Cosworth…" onChange={e => { setSearch(e.target.value); setPage(0); }} /></label><label><span className="sr-only">Temporada</span><select value={season} onChange={e => { setSeason(e.target.value); setPage(0); }}><option value="">Todas las temporadas</option>{Array.from({ length: 76 }, (_, i) => 2025 - i).map(y => <option key={y}>{y}</option>)}</select></label><label><span className="sr-only">Constructor</span><select value={constructor} onChange={e => { setConstructor(e.target.value); setPage(0); }}><option value="">Todos los constructores</option>{constructors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div><p className="ency-note" role="status">{matches.length.toLocaleString("es-AR")} {matches.length === 1 ? "modelo" : "modelos"}</p><div className="ency-table-scroll"><table className="car-catalogue-table"><thead><tr><th>Chasis</th>{photos ? <th>Foto</th> : null}<th>Constructor</th><th>Motor</th><th>Temporadas</th></tr></thead><tbody>{visible.map(car => <tr key={car.id}><th scope="row"><Link href={car.href} prefetch={false}>{car.name}</Link></th>{photos ? <td><CarPhoto image={carImage(car)} alt={car.name} /></td> : null}<td><ArchiveReference entity={car.constructor} /></td><td>{car.engines.map((e, i) => <span key={e.id}>{i ? ", " : ""}<ArchiveReference entity={e} /></span>)}</td><td>{car.seasons.map((y, i) => <span key={y}>{i ? ", " : ""}<Link href={`/historia/seasons/${y}`} prefetch={false}>{y}</Link></span>)}</td></tr>)}</tbody></table></div>{!matches.length ? <p className="ency-empty">No hay modelos que coincidan con esos filtros.</p> : null}<nav className="catalogue-pagination" aria-label="Páginas del catálogo"><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>← Anterior</button><span>Página {currentPage + 1} / {pageCount}</span><button disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Siguiente →</button></nav></div>;
}
