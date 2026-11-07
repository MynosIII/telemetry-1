"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ArchiveRef, CarSummary } from "@/lib/championship-history";
import { ArchiveReference } from "./ArchiveReference";
import { CarPhoto } from "./CarPhoto";
import { carImage } from "@/lib/team-media";

const PAGE_SIZE = 30;
const SHOWN_DRIVERS = 4;
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const byName = (a: ArchiveRef, b: ArchiveRef) => a.name.localeCompare(b.name, "es");
const unique = (refs: ArchiveRef[]) => [...new Map(refs.map(r => [r.id, r])).values()].sort(byName);

type Filters = { search: string; decade: string; season: string; team: string; engine: string; driver: string };

export function CarCatalogue({ cars, initialSeason, initialDriver = "", cutoff = 2025 }: { cars: CarSummary[]; initialSeason: string; initialDriver?: string; cutoff?: number }) {
  const [filters, setFilters] = useState<Filters>({ search: "", decade: "", season: initialSeason, team: "", engine: "", driver: initialDriver });
  const [page, setPage] = useState(0);
  const set = (patch: Partial<Filters>) => { setFilters(f => ({ ...f, ...patch })); setPage(0); };
  const { search, decade, season, team, engine, driver } = filters;

  const years = Array.from({ length: cutoff - 1949 }, (_, i) => cutoff - i);
  const decades = [...new Set(years.map(y => y - (y % 10)))];
  const seasonOptions = decade ? years.filter(y => y - (y % 10) === Number(decade)) : years;

  // Options for constructor, engine and driver narrow to the chosen period so the lists stay short.
  const inPeriod = useMemo(() => cars.filter(c => season ? c.seasons.includes(Number(season)) : !decade || c.seasons.some(y => y - (y % 10) === Number(decade))), [cars, season, decade]);
  const constructors = useMemo(() => unique(inPeriod.map(c => c.constructor)), [inPeriod]);
  const engines = useMemo(() => unique(inPeriod.filter(c => !team || c.constructor.id === team).flatMap(c => c.engines)), [inPeriod, team]);
  const drivers = useMemo(() => unique(inPeriod.filter(c => (!team || c.constructor.id === team) && (!engine || c.engines.some(e => e.id === engine))).flatMap(c => c.drivers ?? [])), [inPeriod, team, engine]);

  const driverQuery = normalize(driver);
  const searchQuery = normalize(search);
  const matches = inPeriod.filter(c =>
    (!team || c.constructor.id === team) &&
    (!engine || c.engines.some(e => e.id === engine)) &&
    (!driverQuery || (c.drivers ?? []).some(d => d.id === driver || normalize(d.name).includes(driverQuery))) &&
    (!searchQuery || normalize(`${c.name} ${c.constructor.name} ${c.engines.map(e => e.name).join(" ")} ${(c.drivers ?? []).map(d => d.name).join(" ")}`).includes(searchQuery)));
  const active = Object.values(filters).some(Boolean);

  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = matches.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const photos = visible.some(car => carImage(car).sources.length);

  return <div>
    <div className="car-catalogue-filters">
      <label className="car-filter-search"><span className="sr-only">Buscar modelo, motor o piloto</span><input type="search" value={search} placeholder="Buscar: Ferrari 312T, Cosworth, Lauda…" onChange={e => set({ search: e.target.value })} /></label>
      <label><span className="sr-only">Década</span><select value={decade} onChange={e => set({ decade: e.target.value, season: season && e.target.value && Number(season) - (Number(season) % 10) !== Number(e.target.value) ? "" : season })}><option value="">Década</option>{decades.map(d => <option key={d} value={d}>{d}s</option>)}</select></label>
      <label><span className="sr-only">Temporada</span><select value={season} onChange={e => set({ season: e.target.value })}><option value="">Temporada</option>{seasonOptions.map(y => <option key={y}>{y}</option>)}</select></label>
      <label><span className="sr-only">Constructor</span><select value={team} onChange={e => set({ team: e.target.value })}><option value="">Constructor</option>{team && !constructors.some(c => c.id === team) ? <option value={team}>{cars.find(c => c.constructor.id === team)?.constructor.name}</option> : null}{constructors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label><span className="sr-only">Motor</span><select value={engine} onChange={e => set({ engine: e.target.value })}><option value="">Motor</option>{engine && !engines.some(e => e.id === engine) ? <option value={engine}>{cars.flatMap(c => c.engines).find(e => e.id === engine)?.name}</option> : null}{engines.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
      <label><span className="sr-only">Piloto</span><input list="car-catalogue-drivers" value={drivers.find(d => d.id === driver)?.name ?? driver} placeholder="Piloto" onChange={e => set({ driver: drivers.find(d => d.name === e.target.value)?.id ?? e.target.value })} /><datalist id="car-catalogue-drivers">{drivers.map(d => <option key={d.id} value={d.name} />)}</datalist></label>
    </div>
    <div className="car-catalogue-status"><p className="ency-note" role="status">{matches.length.toLocaleString("es-AR")} {matches.length === 1 ? "modelo" : "modelos"}</p>{active ? <button type="button" onClick={() => set({ search: "", decade: "", season: "", team: "", engine: "", driver: "" })}>Quitar filtros</button> : null}</div>
    <div className="ency-table-scroll"><table className="car-catalogue-table"><thead><tr><th>Chasis</th>{photos ? <th>Foto</th> : null}<th>Constructor</th><th>Motor</th><th>Pilotos</th><th>Temporadas</th></tr></thead><tbody>{visible.map(car => {
      const list = car.drivers ?? [];
      const highlighted = driverQuery ? list.filter(d => d.id === driver || normalize(d.name).includes(driverQuery)) : [];
      const shown = [...highlighted, ...list.filter(d => !highlighted.includes(d))].slice(0, SHOWN_DRIVERS);
      return <tr key={car.id}>
        <th scope="row"><Link href={car.href} prefetch={false}>{car.name}</Link></th>
        {photos ? <td><CarPhoto image={carImage(car)} alt={car.name} /></td> : null}
        <td><ArchiveReference entity={car.constructor} /></td>
        <td>{car.engines.map((e, i) => <span key={e.id}>{i ? ", " : ""}<ArchiveReference entity={e} /></span>)}</td>
        <td className="car-catalogue-drivers">{shown.map((d, i) => <span key={d.id}>{i ? ", " : ""}{highlighted.includes(d) ? <strong><ArchiveReference entity={d} /></strong> : <ArchiveReference entity={d} />}</span>)}{list.length > shown.length ? <> <Link href={`${car.href}#inscripciones`} prefetch={false} className="car-catalogue-more">+{list.length - shown.length}</Link></> : null}</td>
        <td>{car.seasons.map((y, i) => <span key={y}>{i ? ", " : ""}<Link href={`/historia/seasons/${y}`} prefetch={false}>{y}</Link></span>)}</td>
      </tr>;
    })}</tbody></table></div>
    {!matches.length ? <p className="ency-empty">No hay modelos que coincidan con esos filtros.</p> : null}
    <nav className="catalogue-pagination" aria-label="Páginas del catálogo"><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>← Anterior</button><span>Página {currentPage + 1} / {pageCount}</span><button disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Siguiente →</button></nav>
  </div>;
}
