"use client";

import Image from "@/components/ResilientImage";
import Link from "next/link";
import { useState } from "react";
import type { RaceResult } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" })
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "")
    .toUpperCase();
}

export function RaceBoard({ races }: { races: RaceResult[] }) {
  const [selected, setSelected] = useState(0);
  const race = races[selected];

  function moveTab(index: number, direction: number) {
    const next = (index + direction + races.length) % races.length;
    setSelected(next);
    document.getElementById(`race-tab-${next}`)?.focus();
  }

  return (
    <div className="race-board">
      <div className="race-tabs" role="tablist" aria-label="Últimas carreras">
        {races.map((item, index) => (
          <button
            className={index === selected ? "race-tab is-active" : "race-tab"}
            key={item.round}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") moveTab(index, 1);
              if (event.key === "ArrowLeft") moveTab(index, -1);
            }}
            role="tab"
            id={`race-tab-${index}`}
            aria-controls="race-classification"
            aria-selected={index === selected}
            tabIndex={index === selected ? 0 : -1}
          >
            <span>{formatDate(item.date)}</span>
            <strong>{item.country}</strong>
          </button>
        ))}
      </div>

      <div className="race-heading">
        <div>
          <p className="eyebrow">RONDA {race.round} · RESULTADO FINAL</p>
          <h3>{race.name}</h3>
          <p>{race.circuit} · {race.locality}</p>
        </div>
        <Link className="classified-pill" href={`/carreras/${race.round}`}>VER CARRERA →</Link>
      </div>

      <div
        className="classification"
        role="tabpanel"
        id="race-classification"
        aria-labelledby={`race-tab-${selected}`}
      >
        {race.results.map((driver, index) => (
          <div className={index === 0 ? "result-row is-winner" : "result-row"} key={driver.name}>
            <span className="result-position">{driver.position}</span>
            <div className="driver-avatar" aria-hidden="true">
              {driver.image ? (
                <Image
                  src={driver.image}
                  alt=""
                  fill
                  sizes="52px"
                  unoptimized
                />
              ) : (
                <span>{driver.name.split(" ").map((part) => part[0]).slice(-2).join("")}</span>
              )}
            </div>
            <div className="driver-result-name">
              <Link href={`/pilotos/${driver.driverId}`}><strong>{driver.name}</strong></Link>
              <span>{driver.team}</span>
            </div>
            <Link className="result-time" href={`/carreras/${race.round}?piloto=${driver.driverId}#vueltas`}>
              {driver.time} <span aria-hidden="true">→</span>
            </Link>
            <span className="result-points">+{driver.points} PTS</span>
          </div>
        ))}
      </div>
    </div>
  );
}
