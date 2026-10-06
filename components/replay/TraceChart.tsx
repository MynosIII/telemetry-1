"use client";

import { useEffect, useRef, useState } from "react";

export type TraceSeries = {
  key: string;
  label: string;
  color: string;
  /** x values, ascending (distance in metres). */
  x: number[];
  y: number[];
};

type TraceChartProps = {
  title: string;
  series: TraceSeries[];
  height?: number;
  domain?: [number, number];
  /** Values to label on the y axis; defaults to the domain ends. */
  ticks?: number[];
  format: (value: number) => string;
  step?: boolean;
  fill?: boolean;
  /** Draw a zero line (delta charts). */
  zero?: boolean;
  maxX: number;
  /** x-axis labels and the tooltip heading; distance in metres by default. */
  formatX?: (x: number) => string;
  xTicks?: number[];
  /** Shaded x ranges drawn behind the data (rain). */
  bands?: [number, number][];
  hover: number | null;
  onHover: (x: number | null) => void;
};

const MARGIN = { top: 10, right: 10, bottom: 20, left: 52 };

/** Index of the last x not greater than target. */
export function indexAt(xs: number[], target: number) {
  let low = 0;
  let high = xs.length - 1;
  if (high < 0) return -1;
  if (target <= xs[0]) return 0;
  if (target >= xs[high]) return high;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (xs[middle] <= target) low = middle;
    else high = middle - 1;
  }
  return low;
}

/** Linear interpolation of y at x. */
export function valueAt(xs: number[], ys: number[], target: number) {
  const i = indexAt(xs, target);
  if (i < 0) return null;
  if (i >= xs.length - 1 || xs[i + 1] === xs[i]) return ys[i];
  const ratio = (target - xs[i]) / (xs[i + 1] - xs[i]);
  return ys[i] + (ys[i + 1] - ys[i]) * Math.max(0, Math.min(1, ratio));
}

function formatDistance(metres: number) {
  if (metres > 0 && metres % 1000 === 0) return `${metres / 1000} km`;
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
}

export function TraceChart({ title, series, height = 180, domain, ticks, format, step, fill, zero, maxX, formatX = formatDistance, xTicks: xTickValues, bands = [], hover, onHover }: TraceChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const values = series.flatMap((item) => item.y).filter(Number.isFinite);
  const [minY, maxY] = domain ?? [Math.min(...values, 0), Math.max(...values, 1)];
  const spanY = maxY - minY || 1;
  const plotWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const sx = (x: number) => MARGIN.left + (x / (maxX || 1)) * plotWidth;
  const sy = (y: number) => MARGIN.top + plotHeight - ((y - minY) / spanY) * plotHeight;
  const yTicks = ticks ?? [minY, maxY];
  const xTicks = xTickValues ?? (maxX > 0 ? Array.from({ length: Math.floor(maxX / 1000) + 1 }, (_, i) => i * 1000).filter((x) => x <= maxX) : []);

  const pathFor = (item: TraceSeries) => {
    let path = "";
    let open = false;
    item.x.forEach((x, i) => {
      if (!Number.isFinite(item.y[i])) {
        open = false;
        return;
      }
      const px = sx(x).toFixed(1);
      const py = sy(item.y[i]).toFixed(1);
      if (!open) path += `M${px},${py}`;
      else if (step) path += `H${px}V${py}`;
      else path += `L${px},${py}`;
      open = true;
    });
    return path;
  };

  const readings = hover === null ? [] : series.map((item) => ({ item, value: step ? item.y[indexAt(item.x, hover)] ?? null : valueAt(item.x, item.y, hover) }));

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left - MARGIN.left) / plotWidth) * maxX;
    onHover(Math.max(0, Math.min(maxX, x)));
  };

  return (
    <figure className="trace-chart">
      <figcaption>{title}</figcaption>
      <div ref={box} className="trace-chart-plot" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} onPointerMove={handleMove} onPointerLeave={() => onHover(null)} role="img" aria-label={title}>
            {bands.map(([from, to]) => (
              <rect key={`${from}-${to}`} x={sx(from)} y={MARGIN.top} width={Math.max(1, sx(to) - sx(from))} height={plotHeight} className="trace-band" />
            ))}
            {yTicks.map((tick) => (
              <g key={tick}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={sy(tick)} y2={sy(tick)} className="trace-grid" />
                <text x={MARGIN.left - 8} y={sy(tick)} className="trace-axis" textAnchor="end" dominantBaseline="middle">{format(tick)}</text>
              </g>
            ))}
            {zero && minY < 0 && maxY > 0 && <line x1={MARGIN.left} x2={width - MARGIN.right} y1={sy(0)} y2={sy(0)} className="trace-zero" />}
            {xTicks.map((tick) => (
              <text key={tick} x={sx(tick)} y={height - 4} className="trace-axis" textAnchor="middle">{tick === 0 && !xTickValues ? "0" : formatX(tick)}</text>
            ))}
            {series.map((item) => (
              <g key={item.key}>
                {fill && item.x.length > 1 && (
                  <path d={`${pathFor(item)}V${sy(minY)}H${sx(item.x[0])}Z`} fill={item.color} opacity={series.length > 1 ? 0.12 : 0.2} />
                )}
                <path d={pathFor(item)} fill="none" stroke={item.color} strokeWidth={series.length > 1 ? 1.6 : 2} strokeLinejoin="round" />
              </g>
            ))}
            {hover !== null && (
              <g pointerEvents="none">
                <line x1={sx(hover)} x2={sx(hover)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} className="trace-cursor" />
                {readings.map(({ item, value }) => value === null || !Number.isFinite(value) ? null : (
                  <circle key={item.key} cx={sx(hover)} cy={sy(value)} r={4} fill={item.color} stroke="#111" strokeWidth={2} />
                ))}
              </g>
            )}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <div className="trace-tooltip" style={sx(hover) > width / 2 ? { right: width - sx(hover) + 12 } : { left: sx(hover) + 12 }}>
            <span>{formatX(hover)}</span>
            {readings.map(({ item, value }) => (
              <b key={item.key}><i style={{ background: item.color }} />{item.label} {value === null || !Number.isFinite(value) ? "—" : format(value)}</b>
            ))}
          </div>
        )}
      </div>
    </figure>
  );
}
