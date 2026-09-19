"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LiveModelSnapshot } from "@/lib/live-model";

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
        <p className="eyebrow eyebrow-red">MODELO 2026 EN VIVO</p>
        <h2>FUENTE TEMPORALMENTE <em>NO DISPONIBLE</em></h2>
        <p>No mostramos una predicción con datos incompletos. Jolpica se volverá a consultar automáticamente.</p>
      </section>
    );
  }

  const favorite = snapshot.prediction[0];
  return (
    <section className="live-model" id="modelo-2026">
      <div className="live-model-heading">
        <div>
          <p className="eyebrow eyebrow-red">MODELO 2026 EN VIVO</p>
          <h2>PRÓXIMA CARRERA, <em>PRIMERA SEÑAL</em></h2>
        </div>
        <span className="live-model-status"><i /> {snapshot.probabilityRefresh.mode === "session" ? "PROBABILIDADES · CADA 15 MIN" : "ELO · ACTUALIZACIÓN POSTCARRERA"}</span>
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
          <p>{snapshot.nextRace?.circuit} · {snapshot.nextRace?.country}</p>
          <b>{formatDate(snapshot.nextRace?.date)}</b>
        </article>
        <article className="coverage-card">
          <span>COBERTURA 2026</span>
          <strong>{snapshot.coverage.completedRaces}/{snapshot.coverage.scheduledRaces}</strong>
          <p>Grandes Premios completos integrados</p>
          <b>Hasta {snapshot.coverage.latestRace?.name ?? "sin carreras"}</b>
        </article>
      </div>

      <div className="prediction-board">
        <div className="prediction-list">
          <div className="prediction-list-title"><span>TOP 5</span><span>PROBABILIDAD RELATIVA</span></div>
          {snapshot.prediction.slice(0, 5).map((driver, index) => (
            <div className="prediction-row" key={driver.driverId}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <div><strong>{driver.name}</strong><span>{driver.team} · ELO {driver.liveElo.toFixed(1)}{driver.qualifyingPosition ? ` · Q${driver.qualifyingPosition}` : ""}</span></div>
              <div className="prediction-meter"><i style={{ width: `${Math.max(3, driver.probability)}%` }} /></div>
              <em>{driver.probability.toFixed(1)}%</em>
            </div>
          ))}
        </div>
        <aside className="model-method">
          <span>CÓMO SE CALCULA</span>
          <ul>{snapshot.methodology.inputs.map((input) => <li key={input}>{input}</li>)}</ul>
          <p>{snapshot.methodology.caveat}</p>
          <div className="model-sources">
            <a href="https://api.jolpi.ca/ergast/f1/" target="_blank" rel="noreferrer">FUENTE JOLPICA ↗</a>
            <Link href="/estadisticas/laboratorio">ABRIR LABORATORIO →</Link>
          </div>
        </aside>
      </div>
      <footer className="model-receipt">
        <span>BASE HISTÓRICA {snapshot.historicalBase.model} · {snapshot.historicalBase.events.toLocaleString("es-AR")} GP · {snapshot.historicalBase.observations.toLocaleString("es-AR")} OBS.</span>
        <span>{snapshot.coverage.uniqueRows} FILAS 2026 VALIDADAS · {snapshot.coverage.rejectedRaces} CARRERAS RECHAZADAS</span>
      </footer>
    </section>
  );
}
