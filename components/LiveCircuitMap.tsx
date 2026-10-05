"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "@/components/ResilientImage";
import type { LiveTimingDriver, LiveTimingSnapshot, LiveTrackPoint } from "@/lib/live-timing";
import type { WeatherRadarImage } from "@/lib/weather-radar";

export type LiveMapContext = {
  name: string;
  latitude?: number;
  longitude?: number;
  circuitImage?: string;
  radar: WeatherRadarImage | null;
};

type MapMode = "track" | "radar" | "satellite";

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 560;
const MAP_PADDING = 58;

function projectTrack(points: LiveTrackPoint[], drivers: LiveTimingDriver[]) {
  const positions = drivers.flatMap((driver) => driver.x === null || driver.y === null ? [] : [{ x: driver.x, y: driver.y }]);
  const all = [...points, ...positions];
  if (all.length < 2) return { path: "", drivers: new Map<number, { x: number; y: number }>() };
  const xs = all.map((point) => point.x);
  const ys = all.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = Math.max(1, maxX - minX);
  const rangeY = Math.max(1, maxY - minY);
  const scale = Math.min((MAP_WIDTH - MAP_PADDING * 2) / rangeX, (MAP_HEIGHT - MAP_PADDING * 2) / rangeY);
  const offsetX = (MAP_WIDTH - rangeX * scale) / 2;
  const offsetY = (MAP_HEIGHT - rangeY * scale) / 2;
  const project = (point: LiveTrackPoint) => ({
    x: offsetX + (point.x - minX) * scale,
    y: MAP_HEIGHT - (offsetY + (point.y - minY) * scale)
  });
  const driverMap = new Map<number, { x: number; y: number }>();
  drivers.forEach((driver) => {
    if (driver.x === null || driver.y === null) return;
    driverMap.set(driver.driverNumber, project({ x: driver.x, y: driver.y }));
  });
  return {
    path: points.map((point) => {
      const projected = project(point);
      return `${projected.x.toFixed(1)},${projected.y.toFixed(1)}`;
    }).join(" "),
    drivers: driverMap
  };
}

function satelliteLayer(context: LiveMapContext, zoom: number) {
  if (!Number.isFinite(context.latitude) || !Number.isFinite(context.longitude)) {
    return { tiles: [], offsetX: 0, offsetY: 0 };
  }
  const latitude = Math.max(-85.0511, Math.min(85.0511, context.latitude as number));
  const longitude = context.longitude as number;
  const scale = 2 ** zoom;
  const latitudeRadians = latitude * Math.PI / 180;
  const worldX = (longitude + 180) / 360 * scale;
  const worldY = (1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2 * scale;
  const centerX = Math.floor(worldX);
  const centerY = Math.floor(worldY);
  const tiles = [-1, 0, 1].flatMap((rowOffset) => [-2, -1, 0, 1, 2].map((columnOffset) => {
    const x = (centerX + columnOffset + scale) % scale;
    const y = Math.max(0, Math.min(scale - 1, centerY + rowOffset));
    return {
      key: `${zoom}-${x}-${y}`,
      url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`
    };
  }));
  return {
    tiles,
    offsetX: (2 + worldX - centerX) * 256,
    offsetY: (1 + worldY - centerY) * 256
  };
}

function numeric(value: number | null, suffix = "") {
  return value === null ? "—" : `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${suffix}`;
}

function utcTime(value: string) {
  return new Date(value).toISOString().slice(11, 16);
}

export function LiveCircuitMap({ snapshot, context }: { snapshot: LiveTimingSnapshot; context: LiveMapContext }) {
  const [mode, setMode] = useState<MapMode>("track");
  const [selectedNumber, setSelectedNumber] = useState<number | null>(snapshot.drivers[0]?.driverNumber ?? null);
  const projected = useMemo(() => projectTrack(snapshot.track.points, snapshot.drivers), [snapshot.track.points, snapshot.drivers]);
  const selected = snapshot.drivers.find((driver) => driver.driverNumber === selectedNumber) ?? snapshot.drivers[0];
  const hasGeo = Number.isFinite(context.latitude) && Number.isFinite(context.longitude);
  const tileLayer = useMemo(() => satelliteLayer(context, mode === "radar" ? 7 : 15), [context, mode]);

  useEffect(() => {
    if (selectedNumber === null && snapshot.drivers[0]) setSelectedNumber(snapshot.drivers[0].driverNumber);
  }, [selectedNumber, snapshot.drivers]);

  return (
    <section className="live-circuit-map" aria-labelledby="live-map-title">
      <header className="live-map-toolbar">
        <div>
          <span>MAPA DE PISTA</span>
          <strong id="live-map-title">{snapshot.session?.circuit || context.name}</strong>
        </div>
        <div className="map-mode-switch" aria-label="Capa del mapa">
          <button type="button" className={mode === "track" ? "is-active" : ""} onClick={() => setMode("track")}>PISTA 2D</button>
          <button type="button" className={mode === "radar" ? "is-active" : ""} onClick={() => setMode("radar")} disabled={!hasGeo || !context.radar}>RADAR</button>
          <button type="button" className={mode === "satellite" ? "is-active" : ""} onClick={() => setMode("satellite")} disabled={!hasGeo}>SATÉLITE</button>
        </div>
      </header>

      <div className="live-map-layout">
        <div className={`live-map-stage mode-${mode}`}>
          {mode === "track" ? (
            projected.path ? (
              <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label={`Posiciones sobre ${snapshot.session?.circuit || context.name}`}>
                <polyline className="track-shadow" points={projected.path} />
                <polyline className="track-line" points={projected.path} />
                {snapshot.drivers.map((driver) => {
                  const point = projected.drivers.get(driver.driverNumber);
                  if (!point) return null;
                  const active = selected?.driverNumber === driver.driverNumber;
                  const color = driver.teamColor && /^[0-9a-f]{6}$/i.test(driver.teamColor) ? `#${driver.teamColor}` : "#e10600";
                  return (
                    <g
                      className={`track-driver-marker${active ? " is-selected" : ""}`}
                      key={driver.driverNumber}
                      onClick={() => setSelectedNumber(driver.driverNumber)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedNumber(driver.driverNumber); }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${driver.name}, posición ${driver.position ?? "sin posición"}`}
                      transform={`translate(${point.x} ${point.y})`}
                    >
                      <circle r={active ? 19 : 14} fill={color} />
                      <text y="4">{driver.acronym}</text>
                    </g>
                  );
                })}
              </svg>
            ) : context.circuitImage ? (
              <div className="live-track-fallback"><Image src={context.circuitImage} alt={`Trazado de ${context.name}`} fill sizes="(max-width: 900px) 100vw, 70vw" unoptimized /></div>
            ) : (
              <div className="live-map-empty">El trazado aparecerá cuando la sesión publique posiciones.</div>
            )
          ) : tileLayer.tiles.length ? (
            <>
              <div
                className="satellite-tile-grid"
                aria-label={`Vista satelital de ${context.name}`}
                style={{ marginLeft: -tileLayer.offsetX, marginTop: -tileLayer.offsetY }}
              >
                {tileLayer.tiles.map((tile) => <img key={tile.key} src={tile.url} alt="" loading="lazy" width="256" height="256" />)}
              </div>
              {mode === "radar" && context.radar ? <img className="radar-overlay" src={context.radar.url} alt="Radar de precipitación sobre el circuito" /> : null}
              {projected.path ? (
                <svg className={`geo-track-overlay${mode === "radar" ? " radar-track-overlay" : ""}`} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} aria-hidden="true">
                  <polyline className="geo-track-shadow" points={projected.path} />
                  <polyline className="geo-track-line" points={projected.path} />
                </svg>
              ) : null}
              <div className="map-attribution">
                <span>IMÁGENES ESRI · MAXAR · EARTHSTAR</span>
                {mode === "radar" ? <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RADAR RAINVIEWER · {context.radar ? utcTime(context.radar.observedAt) + " UTC" : ""}</a> : null}
              </div>
            </>
          ) : <div className="live-map-empty">Mapa geográfico no disponible.</div>}
        </div>

        <aside className="car-telemetry" aria-label="Telemetría del auto seleccionado">
          <label htmlFor="telemetry-driver">AUTO</label>
          <select id="telemetry-driver" value={selected?.driverNumber ?? ""} onChange={(event) => setSelectedNumber(Number(event.target.value))}>
            {snapshot.drivers.map((driver) => <option value={driver.driverNumber} key={driver.driverNumber}>{driver.acronym} · {driver.name}</option>)}
          </select>
          <div className="car-telemetry-primary">
            <div><span>VELOCIDAD</span><strong>{numeric(selected?.speed ?? null, " KM/H")}</strong></div>
            <div><span>MARCHA</span><strong>{selected?.gear === 0 ? "N" : numeric(selected?.gear ?? null)}</strong></div>
            <div><span>RPM</span><strong>{numeric(selected?.rpm ?? null)}</strong></div>
          </div>
          <div className="pedal-readout">
            <div><span>ACELERADOR</span><b>{numeric(selected?.throttle ?? null, "%")}</b></div>
            <i><span style={{ width: `${Math.max(0, Math.min(100, selected?.throttle ?? 0))}%` }} /></i>
          </div>
          <div className="car-state-grid">
            <div className={(selected?.brake ?? 0) > 0 ? "is-on" : ""}><span>FRENO</span><strong>{selected?.brake === null || selected === undefined ? "—" : selected.brake > 0 ? "ACTIVO" : "LIBRE"}</strong></div>
            <div className={(selected?.drs ?? 0) >= 10 ? "is-on" : ""}><span>DRS</span><strong>{selected?.drs === null || selected === undefined ? "—" : selected.drs >= 10 ? "ABIERTO" : "CERRADO"}</strong></div>
          </div>
          {!selected || selected.speed === null ? <p className="telemetry-waiting">La lectura del auto se activa con la señal de telemetría.</p> : null}
        </aside>
      </div>
    </section>
  );
}
