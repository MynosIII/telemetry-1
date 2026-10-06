"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/components/replay/format";
import { RADAR_STEP_MS } from "@/lib/replay-constants";

/** NASA's satellite precipitation estimate around the circuit for the half hour under the playhead. */
export function RadarPanel({ sessionKey, at }: { sessionKey: number; at: number }) {
  const frame = Math.floor(at / RADAR_STEP_MS);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState<number | null>(null);
  const src = (value: number) => `/api/replay/radar?key=${sessionKey}&frame=${value}`;

  useEffect(() => {
    setFailed(new Set());
    setLoaded(null);
  }, [sessionKey]);

  // Warm the next frame so the change at the half hour is instant.
  useEffect(() => {
    const next = new Image();
    next.src = src(frame + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, sessionKey]);

  if (failed.size >= 3 && loaded === null) return null;
  const from = frame * RADAR_STEP_MS;
  return (
    <section className="replay-panel replay-radar" aria-label="Lluvia por satélite">
      <h2>Lluvia por satélite · {formatClock(from).slice(0, 5)} a {formatClock(from + RADAR_STEP_MS).slice(0, 5)}</h2>
      <div className="radar-frame">
        {failed.has(frame) ? <p className="replay-empty">No hay imagen para esta media hora.</p> : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={frame}
            src={src(frame)}
            alt="Precipitación estimada alrededor del circuito"
            onLoad={() => setLoaded(frame)}
            onError={() => setFailed((current) => new Set(current).add(frame))}
          />
        )}
        <i className="radar-pin" aria-hidden="true" />
      </div>
      <p className="stint-note">Estimación de NASA (IMERG) cada 30 minutos, unos 330 km alrededor del circuito, marcado en el centro.</p>
    </section>
  );
}
