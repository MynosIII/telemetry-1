"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { indexAt, valueAt } from "@/components/replay/TraceChart";
import { POSITION_CHUNK_MS } from "@/lib/replay-constants";
import type { CarDataChunk, ReplayDriver } from "@/lib/replay";

const WINDOW_MS = 20_000;
const MAX_RPM = 13_000;
const HEIGHT = 150;
const BAND = 14;

type Samples = { t: number[]; speed: number[]; rpm: number[]; gear: number[]; throttle: number[]; brake: number[]; drs: number[] };

function drsState(value: number) {
  if (value >= 10) return { label: "Abierto", open: true };
  if (value === 8) return { label: "Habilitado", open: false };
  return { label: "Cerrado", open: false };
}

/** Throttle, brake, gear, speed, RPM and DRS of one car at the replay instant, with the last 20 seconds traced. */
export function DriverTelemetry({ sessionKey, driver, at, live }: { sessionKey: number; driver: ReplayDriver; at: number; live: boolean }) {
  const [chunks, setChunks] = useState<Map<number, CarDataChunk>>(new Map());
  const loading = useRef(new Set<number>());
  const [traceBox, setTraceBox] = useState<HTMLDivElement | null>(null);
  const [WIDTH, setWidth] = useState(520);
  useEffect(() => {
    const element = traceBox;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [traceBox]);
  const fetchedAt = useRef(new Map<number, number>());

  useEffect(() => {
    setChunks(new Map());
    loading.current.clear();
    fetchedAt.current.clear();
  }, [sessionKey, driver.number]);

  const index = Math.floor(at / POSITION_CHUNK_MS);
  const clock = Math.floor(at / 1000);
  useEffect(() => {
    for (const chunk of [index - 1, index, index + 1]) {
      if (chunk < 0 || loading.current.has(chunk)) continue;
      const last = fetchedAt.current.get(chunk);
      const filling = live && (chunk + 1) * POSITION_CHUNK_MS > (last ?? 0) - 180_000;
      if (last !== undefined && !(filling && Date.now() - last > 4_000)) continue;
      if (chunk * POSITION_CHUNK_MS > Date.now()) continue;
      loading.current.add(chunk);
      fetch(`/api/replay/car?key=${sessionKey}&driver=${driver.number}&chunk=${chunk}`, live ? { cache: "no-store" } : undefined)
        .then((response) => (response.ok ? (response.json() as Promise<CarDataChunk>) : Promise.reject(new Error(String(response.status)))))
        .then((data) => {
          fetchedAt.current.set(chunk, Date.now());
          if (data.driver === driver.number) setChunks((current) => new Map(current).set(chunk, data));
        })
        .catch(() => undefined)
        .finally(() => loading.current.delete(chunk));
    }
  }, [index, clock, sessionKey, driver.number, live]);

  const samples = useMemo<Samples>(() => {
    const merged: Samples = { t: [], speed: [], rpm: [], gear: [], throttle: [], brake: [], drs: [] };
    for (const chunk of [index - 1, index, index + 1]) {
      const data = chunks.get(chunk);
      if (!data) continue;
      data.t.forEach((offset, i) => {
        merged.t.push(data.from + offset);
        merged.speed.push(data.speed[i]);
        merged.rpm.push(data.rpm[i]);
        merged.gear.push(data.gear[i]);
        merged.throttle.push(data.throttle[i]);
        merged.brake.push(data.brake[i]);
        merged.drs.push(data.drs[i]);
      });
    }
    return merged;
  }, [chunks, index]);

  // Readouts and the trace only need ~10 updates a second.
  const tick = Math.floor(at / 100) * 100;
  const view = useMemo(() => {
    if (!samples.t.length || tick < samples.t[0] - 2_000 || tick > samples.t.at(-1)! + 2_000) return null;
    const i = indexAt(samples.t, tick);
    const start = tick - WINDOW_MS;
    const from = Math.max(0, indexAt(samples.t, start));
    const xOf = (value: number) => ((value - start) / WINDOW_MS) * WIDTH;
    const plot = HEIGHT - BAND * 2 - 6;
    const yOf = (speed: number) => 4 + plot - (Math.min(360, speed) / 360) * plot;
    let line = "";
    const throttle: string[] = [];
    const brake: string[] = [];
    for (let k = from; k <= i; k += 1) {
      const x = xOf(samples.t[k]);
      if (x < 0) continue;
      line += `${line ? "L" : "M"}${x.toFixed(1)},${yOf(samples.speed[k]).toFixed(1)}`;
      const next = k < i ? xOf(samples.t[k + 1]) : xOf(tick);
      const width = Math.max(0.5, next - x);
      if (samples.throttle[k] > 0) throttle.push(`M${x.toFixed(1)},${HEIGHT - BAND * 2}h${width.toFixed(1)}v${(BAND * samples.throttle[k] / 100).toFixed(1)}h${(-width).toFixed(1)}z`);
      if (samples.brake[k] > 0) brake.push(`M${x.toFixed(1)},${HEIGHT - BAND}h${width.toFixed(1)}v${BAND}h${(-width).toFixed(1)}z`);
    }
    return {
      speed: Math.round(valueAt(samples.t, samples.speed, tick) ?? 0),
      rpm: samples.rpm[i],
      gear: samples.gear[i],
      throttle: samples.throttle[i],
      brake: samples.brake[i],
      drs: drsState(samples.drs[i]),
      line,
      throttlePath: throttle.join(""),
      brakePath: brake.join(""),
      speedTicks: [100, 200, 300].map((value) => ({ value, y: yOf(value) }))
    };
  }, [samples, tick, WIDTH]);

  return (
    <section className="replay-panel driver-telemetry" aria-label={`Telemetría de ${driver.name}`}>
      <h2>Telemetría de {driver.acronym}</h2>
      {view ? (
        <div className="driver-telemetry-body">
          <div className="dt-readouts">
            <div className="dt-big"><strong>{view.speed}</strong><small>km/h</small></div>
            <div className="dt-big"><strong>{view.gear || "N"}</strong><small>marcha</small></div>
            <div className="dt-pedals" aria-label={`Acelerador ${view.throttle}%, freno ${view.brake ? "pisado" : "suelto"}`}>
              <div><span className="dt-pedal"><i className="dt-throttle" style={{ height: `${view.throttle}%` }} /></span><small>Acel.</small></div>
              <div><span className="dt-pedal"><i className="dt-brake" style={{ height: `${view.brake}%` }} /></span><small>Freno</small></div>
            </div>
            <dl className="dt-small">
              <div><dt>RPM</dt><dd>{view.rpm.toLocaleString("es-AR")}<span className="dt-rpm"><i style={{ width: `${Math.min(100, (view.rpm / MAX_RPM) * 100)}%` }} /></span></dd></div>
              <div><dt>DRS</dt><dd className={view.drs.open ? "is-open" : undefined}>{view.drs.label}</dd></div>
            </dl>
          </div>
          <div ref={setTraceBox} className="dt-trace-box">
          <svg className="dt-trace" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Velocidad, acelerador y freno de los últimos 20 segundos">
            {view.speedTicks.map((item) => (
              <g key={item.value}>
                <line x1={0} x2={WIDTH} y1={item.y} y2={item.y} className="dt-grid" />
                <text x={4} y={item.y - 3} className="dt-tick">{item.value}</text>
              </g>
            ))}
            <path d={view.throttlePath} className="dt-throttle" />
            <path d={view.brakePath} className="dt-brake" />
            <path d={view.line} fill="none" stroke={driver.color} strokeWidth={2} />
          </svg>
          </div>
        </div>
      ) : <p className="replay-empty">{chunks.size ? "Sin datos del auto en este momento." : "Cargando telemetría…"}</p>}
    </section>
  );
}
