"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveTimingSnapshot } from "@/lib/live-timing";

type LiveTimingDashboardProps = {
  initialSnapshot: LiveTimingSnapshot;
};

function formatLap(seconds: number | null) {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${minutes}:${rest}`;
}

function formatGap(value: string | number | null, leader = false) {
  if (leader) return "LÍDER";
  if (value === null || value === "") return "—";
  if (typeof value === "number") return `+${value.toFixed(3)}`;
  const normalized = value.toUpperCase();
  return normalized.includes("LAP") ? normalized : normalized.startsWith("+") ? normalized : `+${normalized}`;
}

function sessionLabel(snapshot: LiveTimingSnapshot) {
  if (!snapshot.session) return "SIN SESIÓN";
  const location = [snapshot.session.location, snapshot.session.country].filter(Boolean).join(" · ");
  return `${snapshot.session.name}${location ? ` · ${location}` : ""}`;
}

const statusCopy: Record<LiveTimingSnapshot["mode"], string> = {
  live: "EN DIRECTO",
  replay: "ÚLTIMA SESIÓN",
  waiting: "FUERA DE SESIÓN",
  unavailable: "SIN SEÑAL"
};

export function LiveTimingDashboard({ initialSnapshot }: LiveTimingDashboardProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    setRefreshing(true);
    try {
      const response = await fetch("/api/live-timing", { cache: "no-store" });
      if (response.ok) setSnapshot((await response.json()) as LiveTimingSnapshot);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(refresh, snapshot.mode === "live" ? 15_000 : 60_000);
    return () => window.clearInterval(interval);
  }, [refresh, snapshot.mode]);

  const weatherItems = snapshot.weather
    ? [
        ["PISTA", snapshot.weather.trackTemperature === null ? "—" : `${snapshot.weather.trackTemperature.toFixed(1)}°C`],
        ["AIRE", snapshot.weather.airTemperature === null ? "—" : `${snapshot.weather.airTemperature.toFixed(1)}°C`],
        ["HUMEDAD", snapshot.weather.humidity === null ? "—" : `${snapshot.weather.humidity.toFixed(0)}%`],
        ["VIENTO", snapshot.weather.windSpeed === null ? "—" : `${snapshot.weather.windSpeed.toFixed(1)} km/h`]
      ]
    : [["PISTA", "—"], ["AIRE", "—"], ["HUMEDAD", "—"], ["VIENTO", "—"]];

  return (
    <section className="timing-center" aria-labelledby="timing-title">
      <div className="timing-heading">
        <div>
          <p className="eyebrow eyebrow-red">RACE CONTROL / OPENF1</p>
          <h2 id="timing-title">TIMING <em>EN PISTA</em></h2>
        </div>
        <div className="timing-status" aria-live="polite">
          <span className={`timing-signal signal-${snapshot.mode}`} aria-hidden="true" />
          <div>
            <strong>{statusCopy[snapshot.mode]}</strong>
            <small>{sessionLabel(snapshot)}</small>
          </div>
          <button type="button" onClick={refresh} disabled={refreshing}>
            {refreshing ? "ACTUALIZANDO" : "ACTUALIZAR"}
          </button>
        </div>
      </div>

      <div className="timing-shell">
        <div className="timing-weather" aria-label="Condiciones de pista">
          {weatherItems.map(([label, value]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong></div>
          ))}
          <div><span>VUELTA</span><strong>{snapshot.drivers[0]?.lapNumber ?? "—"}</strong></div>
        </div>

        <div className="timing-layout">
          <div className="timing-table-wrap">
            <div className="timing-table" role="table" aria-label="Clasificación y telemetría en vivo">
              <div className="timing-row timing-row-head" role="row">
                <span>POS</span><span>PILOTO</span><span>INTERVALO</span><span>GAP</span><span>ÚLTIMA</span><span>MEJOR</span><span>NEUM.</span><span>PITS</span>
              </div>
              {snapshot.drivers.length ? snapshot.drivers.map((driver) => (
                <div className="timing-row" role="row" key={driver.driverNumber}>
                  <strong className="timing-position">{driver.position ?? "—"}</strong>
                  <div className="timing-driver"><i aria-hidden="true" /><b>{driver.acronym}</b><span>{driver.name}<small>{driver.team}</small></span></div>
                  <code>{formatGap(driver.interval)}</code>
                  <code>{formatGap(driver.gap, driver.position === 1)}</code>
                  <code>{formatLap(driver.lastLap)}</code>
                  <code>{formatLap(driver.bestLap)}</code>
                  <span className="tyre-cell"><b>{driver.compound?.slice(0, 1) ?? "—"}</b><small>{driver.tyreAge === null ? "" : `${driver.tyreAge}V`}</small></span>
                  <b className="pit-cell">{driver.pits}</b>
                </div>
              )) : (
                <div className="timing-empty">Todavía no hay pilotos publicados para esta sesión.</div>
              )}
            </div>
          </div>

          <aside className="race-control-feed" aria-label="Mensajes de dirección de carrera">
            <div className="race-control-head"><span>DIRECCIÓN DE CARRERA</span><b>{snapshot.messages.length || "—"}</b></div>
            {snapshot.messages.length ? snapshot.messages.map((message, index) => (
              <article key={`${message.date}-${index}`}>
                <div><span>{message.flag ?? message.category}</span><time>{message.date ? new Date(message.date).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "—"}</time></div>
                <p>{message.message}</p>
              </article>
            )) : (
              <div className="race-control-empty">Los mensajes aparecerán cuando dirección de carrera abra la sesión.</div>
            )}
            <div className="timing-notice">
              <strong>{snapshot.configured ? "SISTEMA PREPARADO" : "ACCESO LIVE PENDIENTE"}</strong>
              <p>{snapshot.notice}</p>
            </div>
          </aside>
        </div>
      </div>

      <div className="timing-credit">
        <span>ACTUALIZACIÓN: {new Date(snapshot.updatedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
        <span>CONCEPTO: <a href="https://github.com/Slowlydev/f1-dash" target="_blank" rel="noreferrer">F1 DASH ↗</a> · DATOS: <a href="https://openf1.org/" target="_blank" rel="noreferrer">OPENF1 ↗</a></span>
      </div>
    </section>
  );
}
