"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import { loadCircuits } from "@/lib/track-geo";

/** Jolpica circuit id → id in public/maps/f1-circuits.json (bacinger/f1-circuits, MIT). */
const GEO_IDS: Record<string, string> = {
  albert_park: "au-1953", bahrain: "bh-2002", shanghai: "cn-2004", catalunya: "es-1991", monaco: "mc-1929",
  villeneuve: "ca-1978", red_bull_ring: "at-1969", silverstone: "gb-1948", hungaroring: "hu-1986", spa: "be-1925",
  monza: "it-1922", marina_bay: "sg-2008", suzuka: "jp-1962", americas: "us-2012", rodriguez: "mx-1962",
  interlagos: "br-1940", yas_marina: "ae-2009", imola: "it-1953", zandvoort: "nl-1948", jeddah: "sa-2021",
  miami: "us-2022", losail: "qa-2004", madring: "es-2026", baku: "az-2016", vegas: "us-2023"
};

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const BLANK_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#121212" } }] };

/**
 * The circuit on the real map, tilted with 3D buildings and turning slowly until someone touches it.
 * Falls back to the flat drawing when the circuit has no georeferenced line or the map can't load.
 */
export function CircuitMap3D({ circuitId, fallback, label }: { circuitId: string; fallback: string | null; label: string }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(!GEO_IDS[circuitId]);

  useEffect(() => {
    const geoId = GEO_IDS[circuitId];
    if (!geoId || !box.current) return;
    let map: MapLibreMap | null = null;
    let frame = 0;
    let cancelled = false;
    (async () => {
      try {
        const [maplibre, circuits, style] = await Promise.all([
          import("maplibre-gl"),
          loadCircuits(),
          fetch(STYLE_URL).then(r => r.ok ? r.json() as Promise<StyleSpecification> : BLANK_STYLE).catch(() => BLANK_STYLE)
        ]);
        const line = circuits[geoId]?.line;
        if (cancelled || !box.current || !line?.length) { if (!line?.length) setFailed(true); return; }
        const lngs = line.map(p => p[0]);
        const lats = line.map(p => p[1]);
        map = new maplibre.Map({
          container: box.current,
          style,
          bounds: [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          fitBoundsOptions: { padding: 24 },
          pitch: 55,
          maxPitch: 75,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          fadeDuration: 0
        });
        map.on("load", () => {
          if (!map) return;
          map.addSource("t1-dim", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]] } } });
          map.addLayer({ id: "t1-dim", type: "fill", source: "t1-dim", paint: { "fill-color": "#000", "fill-opacity": 0.35 } });
          map.addSource("t1-track", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [...line, line[0]] } } });
          map.addLayer({ id: "t1-track", type: "line", source: "t1-track", layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#e10600", "line-width": ["interpolate", ["exponential", 2], ["zoom"], 12, 2.5, 15, 8, 18, 40] } });
          // A slow turn around the circuit until the visitor takes over.
          const spin = () => { if (!map) return; map.setBearing((map.getBearing() + 0.06) % 360); frame = requestAnimationFrame(spin); };
          if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) frame = requestAnimationFrame(spin);
          const stop = () => cancelAnimationFrame(frame);
          map.on("mousedown", stop);
          map.on("touchstart", stop);
          map.on("wheel", stop);
        });
        map.on("error", () => undefined);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; cancelAnimationFrame(frame); map?.remove(); };
  }, [circuitId]);

  if (failed) return fallback ? <img src={fallback} alt={label} loading="lazy" className="circuit-map-3d-fallback" /> : null;
  return <div ref={box} className="circuit-map-3d" role="img" aria-label={label} />;
}
