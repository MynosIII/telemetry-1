"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import type { CarImage } from "@/lib/team-media";
import { FallbackImage } from "./FallbackImage";

export type TeamCar = { id: string; name: string; href: string; seasons: number[]; engines: string[]; image: CarImage };

const PAGE = 24;
const decadeOf = (year: number) => Math.floor(year / 10) * 10;

export function TeamCarIndex({ cars, color }: { cars: TeamCar[]; color: string }) {
  const decades = [...new Set(cars.map(c => decadeOf(c.seasons[0])))].sort((a, b) => a - b);
  const [decade, setDecade] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const matches = decade === null ? cars : cars.filter(c => decadeOf(c.seasons[0]) === decade);
  return <div className="car-index" style={{ ["--team" as string]: color }}>
    <div className="car-index-filters" aria-label="Filtrar por década">
      <button aria-pressed={decade === null} onClick={() => { setDecade(null); setLimit(PAGE); }}>Todos <span>{cars.length}</span></button>
      {decades.map(d => <button key={d} aria-pressed={decade === d} onClick={() => { setDecade(d); setLimit(PAGE); }}>{`${d}s`} <span>{cars.filter(c => decadeOf(c.seasons[0]) === d).length}</span></button>)}
    </div>
    <p className="car-index-count" role="status">{matches.length} {matches.length === 1 ? "modelo" : "modelos"}</p>
    <ol className="car-index-grid">
      {matches.slice(0, limit).map(car => <li key={car.id}>
        <Link href={car.href} prefetch={false} className="car-card">
          <span className="car-card-photo">
            <FallbackImage sources={car.image.sources} alt={car.name} caption={i => {
              const credit = car.image.credits[i];
              return credit?.author ? <small className="car-card-credit">Foto: {credit.author}{credit.license ? ` · ${credit.license}` : ""}</small> : null;
            }} fallback={<span className="car-card-empty" aria-label="Foto pendiente">
              <svg viewBox="0 0 120 40" aria-hidden="true"><path d="M4 28h10l4-7 22-3 14-8h20l8 8 22 2 8 5v3H4z" /><circle cx="24" cy="30" r="6" /><circle cx="96" cy="30" r="6" /></svg>
              <small>Foto pendiente</small>
            </span>} />
          </span>
          <span className="car-card-body">
            <strong>{car.name}</strong>
            <span>{car.seasons.length > 1 ? `${car.seasons[0]}–${car.seasons.at(-1)}` : car.seasons[0]}{car.engines.length ? ` · ${car.engines.join(", ")}` : ""}</span>
          </span>
        </Link>
      </li>)}
    </ol>
    {matches.length > limit ? <button className="car-index-more" onClick={() => setLimit(limit + PAGE)}>Ver {Math.min(PAGE, matches.length - limit)} modelos más</button> : null}
  </div>;
}
