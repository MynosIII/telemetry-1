"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatClock } from "@/components/replay/format";
import { incidentsFrom } from "@/components/replay/incidents";
import type { ReplayDriver, ReplayTimeline } from "@/lib/replay";

function DriverTag({ driver }: { driver: ReplayDriver | undefined }) {
  if (!driver) return null;
  return <span className="feed-driver"><i style={{ background: driver.color }} />{driver.acronym}</span>;
}

export function IncidentsPanel({ timeline, drivers, at, selected }: {
  timeline: ReplayTimeline;
  drivers: Map<number, ReplayDriver>;
  at: number;
  selected: number | null;
}) {
  const [trackLimits, setTrackLimits] = useState(false);
  const all = useMemo(() => incidentsFrom(timeline.raceControl), [timeline.raceControl]);
  const upToNow = all.filter((item) => item.at <= at && (selected === null || item.drivers.includes(selected)));
  const deleted = upToNow.filter((item) => item.kind === "deleted").length;
  const shown = upToNow.filter((item) => trackLimits || item.kind !== "deleted").slice(-40).reverse();
  return (
    <section className="replay-panel replay-feed" aria-label="Incidentes">
      <h2>Incidentes{selected !== null && drivers.get(selected) ? ` de ${drivers.get(selected)?.acronym}` : ""}</h2>
      {deleted > 0 && (
        <label className="feed-toggle">
          <input type="checkbox" checked={trackLimits} onChange={(event) => setTrackLimits(event.target.checked)} />
          Mostrar {deleted} {deleted === 1 ? "tiempo borrado" : "tiempos borrados"} por límites de pista
        </label>
      )}
      {shown.length ? (
        <ol>
          {shown.map((item) => (
            <li key={`${item.at}-${item.message}`} title={item.message}>
              <time>{formatClock(item.at)}{item.lap ? <small>V{item.lap}</small> : null}</time>
              <div>
                <b className={`incident-${item.kind}`}>{item.label}</b>
                {item.drivers.map((number) => <DriverTag key={number} driver={drivers.get(number)} />)}
                <p>{item.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="replay-empty">Sin incidentes hasta este momento.</p>}
    </section>
  );
}

/** Team radio up to the playhead; while playing at 1× or 2× each clip plays as the replay reaches it. */
export function RadioPanel({ timeline, drivers, at, playing, speed, selected }: {
  timeline: ReplayTimeline;
  drivers: Map<number, ReplayDriver>;
  at: number;
  playing: boolean;
  speed: number;
  selected: number | null;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [follow, setFollow] = useState(true);
  const lastAt = useRef(at);
  const radios = timeline.radios.filter((radio) => selected === null || radio.driver === selected);

  const play = (url: string) => {
    const element = audio.current;
    if (!element) return;
    if (current === url && !element.paused) {
      element.pause();
      setCurrent(null);
      return;
    }
    element.src = url;
    element.play().then(() => setCurrent(url)).catch(() => setCurrent(null));
  };

  // Play the clip the playhead just crossed; skip anything passed by a seek.
  useEffect(() => {
    const previous = lastAt.current;
    lastAt.current = at;
    if (!follow || !playing || speed > 2 || at < previous || at - previous > 2_000) return;
    const crossed = radios.filter((radio) => radio.at > previous && radio.at <= at).at(-1);
    if (crossed && audio.current?.paused !== false) play(crossed.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);

  useEffect(() => {
    if (!playing) audio.current?.pause();
  }, [playing]);

  const shown = radios.filter((radio) => radio.at <= at).slice(-40).reverse();
  return (
    <section className="replay-panel replay-feed" aria-label="Radios de equipo">
      <h2>Radios{selected !== null && drivers.get(selected) ? ` de ${drivers.get(selected)?.acronym}` : ""}</h2>
      <audio ref={audio} preload="none" onEnded={() => setCurrent(null)} onPause={() => setCurrent(null)} />
      {timeline.radios.length > 0 && (
        <label className="feed-toggle">
          <input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} />
          Escuchar cada radio al reproducir (1× y 2×)
        </label>
      )}
      {shown.length ? (
        <ol>
          {shown.map((radio) => (
            <li key={`${radio.at}-${radio.url}`}>
              <time>{formatClock(radio.at)}</time>
              <div>
                <button type="button" className="radio-play" aria-pressed={current === radio.url} onClick={() => play(radio.url)} aria-label={current === radio.url ? "Pausar radio" : "Escuchar radio"}>
                  {current === radio.url
                    ? <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" /><rect x="9.5" y="2" width="3.5" height="12" /></svg>
                    : <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" /></svg>}
                </button>
                <DriverTag driver={drivers.get(radio.driver)} />
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="replay-empty">{timeline.radios.length ? "Todavía no hay radios en este momento." : "OpenF1 no publicó radios para esta sesión."}</p>}
    </section>
  );
}
