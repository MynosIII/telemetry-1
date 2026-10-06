"use client";

import { useMemo } from "react";

export type TrackPoint = { x: number; y: number };
export type TrackMarker = { key: string | number; x: number; y: number; color: string; label?: string; dim?: boolean };

const SIZE = 1000;
const PADDING = 60;

/** Fits the OpenF1 x/y plane into a square viewBox, keeping proportions (y grows upwards in OpenF1). */
export function useTrackProjection(points: TrackPoint[]) {
  return useMemo(() => {
    if (points.length < 2) return null;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const rangeX = Math.max(1, Math.max(...xs) - minX);
    const rangeY = Math.max(1, Math.max(...ys) - minY);
    const scale = (SIZE - PADDING * 2) / Math.max(rangeX, rangeY);
    const width = rangeX * scale + PADDING * 2;
    const height = rangeY * scale + PADDING * 2;
    const project = (point: TrackPoint) => ({
      x: PADDING + (point.x - minX) * scale,
      y: height - PADDING - (point.y - minY) * scale
    });
    const path = points.map((point, i) => {
      const p = project(point);
      return `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join("");
    return { project, path, width, height };
  }, [points]);
}

export function TrackOutline({ points, markers = [], label, showLabels = false }: {
  points: TrackPoint[];
  markers?: TrackMarker[];
  label: string;
  showLabels?: boolean;
}) {
  const projection = useTrackProjection(points);
  if (!projection) return <div className="track-outline track-outline-empty">Sin datos de posición</div>;
  return (
    <svg className="track-outline" viewBox={`0 0 ${projection.width.toFixed(0)} ${projection.height.toFixed(0)}`} role="img" aria-label={label}>
      <path d={projection.path} className="track-outline-line" />
      {markers.map((marker) => {
        const p = projection.project(marker);
        return (
          <g key={marker.key} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`} opacity={marker.dim ? 0.35 : 1}>
            <circle r={showLabels ? 13 : 15} fill={marker.color} stroke="#0d0d0d" strokeWidth={4} />
            {showLabels && marker.label && <text x={20} y={6} className="track-outline-label">{marker.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}
