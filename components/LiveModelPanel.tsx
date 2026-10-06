"use client";

import { useEffect, useState } from "react";
import type { LiveModelSnapshot } from "@/lib/live-model";
import { getCountryFlagUrl } from "@/lib/circuit-visuals";

function formatDate(value?: string) {
  if (!value) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export function LiveModelPanel({ snapshot: initialSnapshot }: { snapshot: LiveModelSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  useEffect(() => {
    if (snapshot.probabilityRefresh.mode !== "session") return;
    const refresh = async () => {
      try {
        const response = await fetch("/api/live-model", { cache: "no-store" });
        if (response.ok) setSnapshot(await response.json());
      } catch {
        // Keep the last verified probabilities if the source is temporarily unavailable.
      }
    };
    const timer = window.setInterval(refresh, snapshot.probabilityRefresh.seconds * 1000);
    return () => window.clearInterval(timer);
  }, [snapshot.probabilityRefresh.mode, snapshot.probabilityRefresh.seconds]);

  if (snapshot.status !== "ready") {
    return (
      <section className="live-model live-model-unavailable" id="modelo-2026">
        <p className="eyebrow eyebrow-red">PRONÓSTICO</p>
        <h2>DATOS TEMPORALMENTE <em>NO DISPONIBLES</em></h2>
        <p>La predicción volverá a aparecer cuando se restablezcan los datos.</p>
      </section>
    );
  }

  const favorite = snapshot.prediction[0];
  return (
    <section className="live-model" id="modelo-2026">
      <div className="live-model-heading">
        <div>
          <p className="eyebrow eyebrow-red">PRONÓSTICO</p>
          <h2>PRÓXIMA <em>CARRERA</em></h2>
        </div>
        <span className="live-model-status"><i /> {snapshot.probabilityRefresh.mode === "session" ? "ACTUALIZACIÓN CADA 15 MIN" : "ACTUALIZACIÓN POSTCARRERA"}</span>
      </div>

      <div className="live-model-grid">
        <article className="prediction-lead">
          <span>FAVORITO DEL MODELO</span>
          <strong>{favorite?.name ?? "Sin predicción"}</strong>
          <b>{favorite?.probability.toFixed(1) ?? "0.0"}%</b>
          <p>Probabilidad relativa del modelo, no cuota ni certeza de victoria.</p>
        </article>
        <article className="next-race-card">
          <span>PRÓXIMA CARRERA</span>
          <strong>{snapshot.nextRace?.name ?? "Por confirmar"}</strong>
          <p>{snapshot.nextRace?.circuit} · {getCountryFlagUrl(snapshot.nextRace?.country ?? "") ? <img className="race-tab-flag" src={getCountryFlagUrl(snapshot.nextRace?.country ?? "")} alt="" width={18} height={12} /> : null}{snapshot.nextRace?.country}</p>
          <b>{formatDate(snapshot.nextRace?.date)}</b>
        </article>
        <article className="coverage-card">
          <span>CARRERAS COMPLETADAS</span>
          <strong>{snapshot.coverage.completedRaces}/{snapshot.coverage.scheduledRaces}</strong>
          <p>Grandes Premios de la temporada</p>
          <b>Hasta {snapshot.coverage.latestRace?.name ?? "sin carreras"}</b>
        </article>
      </div>

      <div className="prediction-board">
        <div className="prediction-list">
          <div className="prediction-list-title"><span>TOP 5</span><span>PROBABILIDAD RELATIVA</span></div>
          {snapshot.prediction.slice(0, 5).map((driver, index) => (
            <div className="prediction-row" key={driver.driverId}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <div><strong>{driver.name}</strong><span>{driver.team}{driver.qualifyingPosition ? ` · Q${driver.qualifyingPosition}` : ""}</span></div>
              <div className="prediction-meter"><i style={{ width: `${Math.max(3, driver.probability)}%` }} /></div>
              <em>{driver.probability.toFixed(1)}%</em>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
