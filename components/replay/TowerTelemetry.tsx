"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { indexAt } from "@/components/replay/TraceChart";
import { POSITION_CHUNK_MS } from "@/lib/replay-constants";
import type { FieldInputsChunk, ReplayLap } from "@/lib/replay";

export type CarInputs = { speed: number; gear: number; throttle: number; brake: number };

/** Every car's throttle, brake, gear and speed at the playhead, from two-minute windows of car_data. */
export function useFieldInputs(sessionKey: number | null, at: number, live: boolean, enabled: boolean) {
  const [chunks, setChunks] = useState<Map<number, FieldInputsChunk>>(new Map());
  const loading = useRef(new Set<number>());
  const fetchedAt = useRef(new Map<number, number>());

  useEffect(() => {
    setChunks(new Map());
    loading.current.clear();
    fetchedAt.current.clear();
  }, [sessionKey]);

  const index = Math.floor(at / POSITION_CHUNK_MS);
  const clock = Math.floor(at / 2000);
  useEffect(() => {
    if (!enabled || !sessionKey || at <= 0) return;
    for (const chunk of [index, index + 1]) {
      if (loading.current.has(chunk) || chunk * POSITION_CHUNK_MS > Date.now()) continue;
      const last = fetchedAt.current.get(chunk);
      const filling = live && (chunk + 1) * POSITION_CHUNK_MS > (last ?? 0) - 180_000;
      if (last !== undefined && !(filling && Date.now() - last > 4_000)) continue;
      loading.current.add(chunk);
      fetch(`/api/replay/inputs?key=${sessionKey}&chunk=${chunk}`, live ? { cache: "no-store" } : undefined)
        .then((response) => (response.ok ? (response.json() as Promise<FieldInputsChunk>) : Promise.reject(new Error(String(response.status)))))
        .then((data) => {
          fetchedAt.current.set(chunk, Date.now());
          setChunks((current) => {
            const next = new Map(current).set(chunk, data);
            // Keep memory flat on long sessions.
            for (const key of next.keys()) if (Math.abs(key - chunk) > 2) next.delete(key);
            return next;
          });
        })
        .catch(() => undefined)
        .finally(() => loading.current.delete(chunk));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, clock, sessionKey, live, enabled]);

  const tick = Math.floor(at / 250) * 250;
  return useMemo(() => {
    const result = new Map<number, CarInputs>();
    const chunk = chunks.get(Math.floor(tick / POSITION_CHUNK_MS));
    if (!chunk) return result;
    for (const [driver, car] of Object.entries(chunk.cars)) {
      if (!car.t.length) continue;
      const offset = tick - chunk.from;
      if (offset < car.t[0] - 2_000 || offset > car.t[car.t.length - 1] + 3_000) continue;
      const i = indexAt(car.t, offset);
      result.set(Number(driver), { speed: car.speed[i], gear: car.gear[i], throttle: car.throttle[i], brake: car.brake[i] });
    }
    return result;
  }, [chunks, tick]);
}

const SEGMENT_CLASS: Record<number, string> = { 2048: "seg-yellow", 2049: "seg-green", 2051: "seg-purple", 2064: "seg-pit" };

/**
 * Mini-sectors of the lap in progress. OpenF1 gives each lap's mini-sector colours but not when each
 * was crossed, so they fill in proportionally through each sector's time.
 */
export function MiniSectors({ lap, at }: { lap: ReplayLap | undefined; at: number }) {
  if (!lap || lap.start === null || !lap.segments.some((sector) => sector.length)) return <span className="minisectors" />;
  const elapsed = (at - lap.start) / 1000;
  let sectorStart = 0;
  return (
    <span className="minisectors" aria-hidden="true">
      {lap.segments.map((segments, sector) => {
        const duration = lap.sectors[sector];
        const begin = sectorStart;
        sectorStart += duration ?? 0;
        return (
          <span key={sector} className="minisector-group">
            {segments.map((code, k) => {
              const crossed = duration === null ? code !== 0 : elapsed >= begin + ((k + 1) / segments.length) * duration;
              return <i key={k} className={crossed ? SEGMENT_CLASS[code] ?? "seg-none" : undefined} />;
            })}
          </span>
        );
      })}
    </span>
  );
}

export function InputsCell({ inputs }: { inputs: CarInputs | undefined }) {
  if (!inputs) return <><span className="pit-muted">—</span><span /><span /></>;
  return (
    <>
      <code>{inputs.speed}</code>
      <b className="tower-gear">{inputs.gear || "N"}</b>
      <span className="tower-pedals" title={`Acelerador ${inputs.throttle}%${inputs.brake ? ", frenando" : ""}`}>
        <i className="dt-throttle" style={{ width: `${inputs.throttle}%` }} />
        <i className="dt-brake" style={{ width: inputs.brake ? "100%" : "0%" }} />
      </span>
    </>
  );
}
