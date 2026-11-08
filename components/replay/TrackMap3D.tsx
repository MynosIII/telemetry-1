"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import { TrackOutline, type TrackMarker, type TrackPoint } from "@/components/replay/TrackOutline";
import { circuitId, fitTrack, loadCircuits, type TrackFit } from "@/lib/track-geo";

/** Free vector tiles with 3D buildings, no key needed. */
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
/** Optional: a Mapbox token adds a satellite layer. */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const VIEW_KEY = "replay-map-view";
const PITCH = 55;

type View = "3d" | "plano";
type Base = "mapa" | "satelite";

/** Used when the tile server cannot be reached: the track and cars still show in perspective. */
const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#121212" } }]
};

const LOCALE = {
  "CooperativeGesturesHandler.WindowsHelpText": "Usá Ctrl + rueda para hacer zoom en el mapa",
  "CooperativeGesturesHandler.MacHelpText": "Usá ⌘ + rueda para hacer zoom en el mapa",
  "CooperativeGesturesHandler.MobileHelpText": "Usá dos dedos para mover el mapa",
  "NavigationControl.ZoomIn": "Acercar",
  "NavigationControl.ZoomOut": "Alejar",
  "NavigationControl.ResetBearing": "Volver al norte"
};

function readView(): View {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "plano" ? "plano" : "3d";
  } catch {
    return "3d";
  }
}

function useCircuitFit(circuit: string, points: TrackPoint[]) {
  const [fit, setFit] = useState<TrackFit | null | undefined>(undefined);
  useEffect(() => {
    const id = circuitId(circuit);
    if (!id || points.length < 20) {
      setFit(null);
      return;
    }
    let cancelled = false;
    setFit(undefined);
    loadCircuits()
      .then((circuits) => {
        if (cancelled) return;
        const geo = circuits[id];
        setFit(geo ? fitTrack(points, geo) : null);
      })
      .catch(() => !cancelled && setFit(null));
    return () => { cancelled = true; };
  }, [circuit, points]);
  return fit;
}

function carsGeoJson(markers: TrackMarker[], fit: TrackFit, selected: number | null) {
  return {
    type: "FeatureCollection" as const,
    features: markers.map((marker, index) => ({
      type: "Feature" as const,
      id: Number(marker.key),
      properties: {
        driver: Number(marker.key),
        color: marker.color,
        label: marker.label ?? "",
        dim: marker.dim ? 1 : 0,
        order: Number(marker.key) === selected ? 1000 : index
      },
      geometry: { type: "Point" as const, coordinates: fit.toLngLat(marker) }
    }))
  };
}

/** The session on the real map, tilted, with every car on track. Falls back to the flat outline. */
export function TrackMap3D({ circuit, points: rawPoints, markers, label, selected, onSelect }: {
  circuit: string;
  points: TrackPoint[];
  markers: TrackMarker[];
  label: string;
  selected: number | null;
  onSelect: (driver: number) => void;
}) {
  const [view, setView] = useState<View>("3d");
  const [base, setBase] = useState<Base>("mapa");
  const [failed, setFailed] = useState(false);
  // Live sessions re-send the same outline every few seconds; only a new outline should move the map.
  const signature = `${rawPoints.length}:${rawPoints[0]?.x}:${rawPoints[0]?.y}:${rawPoints.at(-1)?.x}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const points = useMemo(() => rawPoints, [signature]);
  const fit = useCircuitFit(circuit, points);
  const box = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const ready = useRef(false);
  const latest = useRef({ markers, selected, onSelect });
  latest.current = { markers, selected, onSelect };

  useEffect(() => setView(readView()), []);

  const chooseView = (next: View) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Remembered until the page reloads.
    }
  };

  const trackLine = useMemo(() => {
    if (!fit) return null;
    const coordinates = points.map((point) => fit.toLngLat(point));
    coordinates.push(coordinates[0]);
    return { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates } };
  }, [fit, points]);

  const camera = () => {
    const instance = map.current;
    if (!instance || !trackLine) return;
    const lngs = trackLine.geometry.coordinates.map((c) => c[0]);
    const lats = trackLine.geometry.coordinates.map((c) => c[1]);
    const bearing = ((fit?.heading ?? 90) - 90 + 360) % 360;
    const target = instance.cameraForBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 30, bearing });
    if (target) instance.jumpTo({ ...target, zoom: (target.zoom ?? 14) + 0.35, pitch: PITCH, bearing });
  };

  // Build the map once the circuit is placed.
  useEffect(() => {
    if (view !== "3d" || !fit || !trackLine || !box.current || failed) return;
    let cancelled = false;
    let instance: MapLibreMap | null = null;
    (async () => {
      const maplibre = await import("maplibre-gl");
      const style = await fetch(STYLE_URL).then((response) => (response.ok ? response.json() as Promise<StyleSpecification> : BLANK_STYLE)).catch(() => BLANK_STYLE);
      if (cancelled || !box.current) return;
      try {
        instance = new maplibre.Map({
          container: box.current,
          style,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          locale: LOCALE,
          maxPitch: 75,
          fadeDuration: 0
        });
      } catch {
        setFailed(true);
        return;
      }
      map.current = instance;
      instance.addControl(new maplibre.NavigationControl({ visualizePitch: true }), "top-right");
      instance.on("error", (event) => console.warn("Mapa:", event.error?.message));
      instance.on("load", () => {
        if (!instance) return;
        const firstExtrusion = instance.getStyle().layers.find((layer) => layer.type === "fill-extrusion")?.id;
        if (MAPBOX_TOKEN) {
          instance.addSource("t1-sat", {
            type: "raster",
            tiles: [`https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${MAPBOX_TOKEN}`],
            tileSize: 256,
            maxzoom: 19,
            attribution: "© Mapbox © Maxar"
          });
          instance.addLayer({ id: "t1-sat", type: "raster", source: "t1-sat", layout: { visibility: "none" }, paint: { "raster-brightness-max": 0.85 } }, firstExtrusion);
        }
        // Tone the base map down so the cars stand out.
        instance.addSource("t1-dim", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]] } } });
        instance.addLayer({ id: "t1-dim", type: "fill", source: "t1-dim", paint: { "fill-color": "#000", "fill-opacity": 0.38 } });
        instance.addSource("t1-track", { type: "geojson", data: trackLine });
        instance.addLayer({
          id: "t1-track-edge", type: "line", source: "t1-track",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#0a0a0a", "line-width": ["interpolate", ["exponential", 2], ["zoom"], 12, 3, 15, 12, 18, 80] }
        });
        instance.addLayer({
          id: "t1-track", type: "line", source: "t1-track",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#2e2e2e", "line-width": ["interpolate", ["exponential", 2], ["zoom"], 12, 2, 15, 9, 18, 66] }
        });
        instance.addSource("t1-cars", { type: "geojson", data: carsGeoJson(latest.current.markers, fit, latest.current.selected) });
        instance.addLayer({
          id: "t1-cars", type: "circle", source: "t1-cars",
          layout: { "circle-sort-key": ["get", "order"] },
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 3, 15, 6.5, 18, 14],
            "circle-color": ["get", "color"],
            "circle-stroke-color": "#050505",
            "circle-stroke-width": 1.5,
            "circle-opacity": ["case", ["==", ["get", "dim"], 1], 0.35, 1],
            "circle-stroke-opacity": ["case", ["==", ["get", "dim"], 1], 0.35, 1],
            "circle-pitch-alignment": "map"
          }
        });
        if (instance.getStyle().glyphs) {
          instance.addLayer({
            id: "t1-labels", type: "symbol", source: "t1-cars",
            layout: {
              "text-field": ["get", "label"],
              "text-font": ["Noto Sans Bold"],
              "text-size": 11,
              "text-offset": [0, -1.3],
              "text-allow-overlap": false,
              "symbol-sort-key": ["-", 0, ["get", "order"]]
            },
            paint: { "text-color": "#fff", "text-halo-color": "#050505", "text-halo-width": 1.5, "text-opacity": ["case", ["==", ["get", "dim"], 1], 0.35, 1] }
          });
        }
        instance.on("click", "t1-cars", (event) => {
          const driver = Number(event.features?.[0]?.properties?.driver);
          if (driver) latest.current.onSelect(driver);
        });
        instance.on("mouseenter", "t1-cars", () => { if (instance) instance.getCanvas().style.cursor = "pointer"; });
        instance.on("mouseleave", "t1-cars", () => { if (instance) instance.getCanvas().style.cursor = ""; });
        ready.current = true;
        camera();
      });
    })().catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      ready.current = false;
      map.current = null;
      instance?.remove();
    };
    // camera reads the same fit and trackLine this effect depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, fit, trackLine, failed]);

  // Move the cars.
  useEffect(() => {
    if (!ready.current || !fit) return;
    (map.current?.getSource("t1-cars") as GeoJSONSource | undefined)?.setData(carsGeoJson(markers, fit, selected));
  }, [markers, fit, selected]);

  useEffect(() => {
    if (!ready.current || !map.current?.getLayer("t1-sat")) return;
    map.current.setLayoutProperty("t1-sat", "visibility", base === "satelite" ? "visible" : "none");
  }, [base]);

  const canMap = fit !== null && !failed;
  const showMap = canMap && view === "3d";

  return (
    <div className="track-map">
      {canMap && (
        <div className="track-map-switch" role="radiogroup" aria-label="Vista del mapa">
          <button type="button" role="radio" aria-checked={view === "3d"} onClick={() => chooseView("3d")}>3D</button>
          <button type="button" role="radio" aria-checked={view === "plano"} onClick={() => chooseView("plano")}>Plano</button>
          {showMap && MAPBOX_TOKEN && (
            <button type="button" className="track-map-base" aria-pressed={base === "satelite"} onClick={() => setBase((value) => (value === "satelite" ? "mapa" : "satelite"))}>Satélite</button>
          )}
          {showMap && <button type="button" className="track-map-reset" onClick={camera}>Recentrar</button>}
        </div>
      )}
      {showMap ? (
        <div className="track-map-canvas" ref={box} role="img" aria-label={label}>
          {fit === undefined && <p className="track-map-loading">Ubicando el circuito…</p>}
        </div>
      ) : (
        <TrackOutline points={points} markers={markers} label={label} showLabels />
      )}
    </div>
  );
}
