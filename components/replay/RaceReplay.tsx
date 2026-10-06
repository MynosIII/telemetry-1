"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SessionSelect, useSessionList } from "@/components/replay/SessionPicker";
import { TrackOutline, type TrackMarker } from "@/components/replay/TrackOutline";
import { ChampionshipPanel } from "@/components/replay/ChampionshipPanel";
import { DriverTelemetry } from "@/components/replay/DriverTelemetry";
import { PitProjection } from "@/components/replay/PitProjection";
import { RadarPanel } from "@/components/replay/RadarPanel";
import { StintChart } from "@/components/replay/StintChart";
import { IncidentsPanel, RadioPanel } from "@/components/replay/ReplayFeeds";
import { InputsCell, MiniSectors, useFieldInputs } from "@/components/replay/TowerTelemetry";
import { PanelBoundary, PanelOptions, usePanelSettings } from "@/components/replay/ReplayOptions";
import { TyreChip } from "@/components/replay/TyreChip";
import { formatClock, formatElapsed, formatLapTime } from "@/components/replay/format";
import { tyreOnLap, weatherAt } from "@/components/replay/tyres";
import { POSITION_CHUNK_MS } from "@/lib/replay-constants";
import type { ReplayDriver, ReplayIntervalPoint, ReplayPositionsChunk, ReplaySession, ReplayTimeline } from "@/lib/replay";

const SPEEDS = [1, 2, 5, 10, 30];
/** How far behind real time the live view runs, so OpenF1 has published every car's position. */
const LIVE_DELAY_MS = 10_000;
const LIVE_REFRESH_MS = 10_000;

/** Bumped whenever the session or timeline payload changes shape, so year-long caches of the old shape are skipped. */
const PAYLOAD_VERSION = 3;

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<T>;
}

/** Fills fields that older cached payloads lack, so a stale response cannot crash the page. */
function loadSession(key: number, init?: RequestInit) {
  return Promise.all([
    getJson<ReplaySession>(`/api/replay/session?key=${key}&v=${PAYLOAD_VERSION}`, init),
    getJson<ReplayTimeline>(`/api/replay/timeline?key=${key}&v=${PAYLOAD_VERSION}`, init)
  ]).then(([session, timeline]) => {
    for (const laps of Object.values(session.laps)) {
      for (const lap of laps) lap.segments ??= [[], [], []];
    }
    session.stints ??= [];
    session.weather ??= [];
    timeline.radios ??= [];
    timeline.raceControl ??= [];
    timeline.pits ??= [];
    timeline.track ??= [];
    return [session, timeline] as const;
  });
}

/** Last entry whose first element (a timestamp) is at or before `at`. */
function lastBefore<T extends [number, ...unknown[]]>(list: T[] | undefined, at: number): T | undefined {
  if (!list?.length || list[0][0] > at) return undefined;
  let low = 0;
  let high = list.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (list[middle][0] <= at) low = middle;
    else high = middle - 1;
  }
  return list[low];
}

function formatGap(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return value === 0 ? "—" : `+${value.toFixed(3)}`;
  return value.replace(/\s*LAPS?/i, " V");
}

type TrackState = { key: "green" | "yellow" | "sc" | "vsc" | "red" | "chequered" | "none"; label: string };

const TRACK_STATES: Record<TrackState["key"], string> = {
  none: "Sin largada",
  green: "Pista libre",
  yellow: "Bandera amarilla",
  sc: "Safety car",
  vsc: "Safety car virtual",
  red: "Bandera roja",
  chequered: "Bandera a cuadros"
};

function trackState(messages: ReplayTimeline["raceControl"], at: number): TrackState {
  let key: TrackState["key"] = "none";
  for (const message of messages) {
    if (message.at > at) break;
    const text = message.message.toUpperCase();
    const flag = (message.flag ?? "").toUpperCase();
    if (flag === "CHEQUERED") key = "chequered";
    else if (flag === "RED") key = "red";
    else if (text.includes("VIRTUAL SAFETY CAR DEPLOYED")) key = "vsc";
    else if (text.includes("SAFETY CAR DEPLOYED")) key = "sc";
    else if (flag === "GREEN" || text.includes("TRACK CLEAR") || (flag === "CLEAR" && key === "yellow")) key = "green";
    else if ((flag === "YELLOW" || flag === "DOUBLE YELLOW") && (key === "green" || key === "none")) key = "yellow";
  }
  return { key, label: TRACK_STATES[key] };
}

type TowerRow = {
  driver: ReplayDriver;
  position: number | null;
  gap: number | string | null;
  interval: number | string | null;
  lap: number | null;
  lastLap: number | null;
  bestLap: number | null;
  tyre: { compound: string; age: number } | null;
  pits: number;
  inPit: boolean;
};

function readQuery() {
  const params = new URLSearchParams(window.location.search);
  const session = Number(params.get("sesion"));
  const t = Number(params.get("t"));
  return { session: Number.isInteger(session) && session > 0 ? session : null, t: Number.isFinite(t) && t > 0 ? t : null };
}

/** Replays a session; with `liveSession` it follows that session in real time instead. */
export function RaceReplay({ liveSession }: { liveSession?: number } = {}) {
  const live = liveSession !== undefined;
  const [year, setYear] = useState<number | null>(null);
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const [data, setData] = useState<ReplaySession | null>(null);
  const [timeline, setTimeline] = useState<ReplayTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [chunks, setChunks] = useState<Map<number, ReplayPositionsChunk>>(new Map());
  const loadingChunks = useRef(new Set<number>());
  const tRef = useRef(0);
  const startOffset = useRef<number | null>(null);
  const placedFor = useRef<number | null>(null);
  const chunkFetchedAt = useRef(new Map<number, number>());
  const [following, setFollowing] = useState(live);
  const [towerView, setTowerView] = useState<"times" | "telemetry">("times");
  const [now, setNow] = useState(() => Date.now());
  const panels = usePanelSettings();
  const { shows } = panels;

  const chooseYear = useCallback((value: number) => setYear(value), []);
  const { sessions, error: listError } = useSessionList(year, chooseYear, retry);

  useEffect(() => {
    if (live) {
      setSessionKey(liveSession);
      setPlaying(true);
      return;
    }
    const query = readQuery();
    startOffset.current = query.t;
    if (query.session) setSessionKey(query.session);
    else setYear(new Date().getFullYear());
  }, [live, liveSession]);

  // Live: a clock for the live edge, and fresh timing every few seconds.
  useEffect(() => {
    if (!live) return;
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "hidden" || !sessionKey) return;
      loadSession(sessionKey, { cache: "no-store" }).then(([session, sessionTimeline]) => {
        setData(session);
        setTimeline(sessionTimeline);
      }).catch(() => undefined);
    }, LIVE_REFRESH_MS);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(refresh);
    };
  }, [live, sessionKey]);

  // Default to the latest finished race of the season.
  useEffect(() => {
    if (!sessions?.length) return;
    setSessionKey((current) => {
      if (current && sessions.some((item) => item.key === current)) return current;
      const finished = [...sessions].reverse().filter((item) => item.finished);
      return (finished.find((item) => item.type === "Race") ?? finished[0] ?? sessions.at(-1))?.key ?? null;
    });
  }, [sessions]);

  useEffect(() => {
    if (!sessionKey) return;
    let cancelled = false;
    setData(null);
    setTimeline(null);
    setChunks(new Map());
    loadingChunks.current.clear();
    chunkFetchedAt.current.clear();
    placedFor.current = null;
    if (!live) setPlaying(false);
    setError(null);
    loadSession(sessionKey)
      .then(([session, sessionTimeline]) => {
        if (cancelled) return;
        setData(session);
        setTimeline(sessionTimeline);
        const sessionYear = new Date(session.session.startsAt).getFullYear();
        setYear((current) => (current === sessionYear ? current : sessionYear));
      })
      .catch(() => !cancelled && setError(live
        ? "El directo no está disponible en este momento. Cuando termine la sesión, va a estar en Repetición."
        : "No pudimos cargar la sesión desde OpenF1."));
    return () => { cancelled = true; };
  }, [sessionKey, retry, live]);

  const bounds = useMemo(() => {
    if (!data) return null;
    const laps = Object.values(data.laps).flat();
    const starts = laps.map((lap) => lap.start).filter((value): value is number => value !== null);
    const ends = laps.map((lap) => (lap.start !== null && lap.duration !== null ? lap.start + lap.duration * 1000 : null)).filter((value): value is number => value !== null);
    const scheduled = Date.parse(data.session.startsAt);
    const start = starts.length ? Math.min(...starts) - 20_000 : scheduled;
    const end = live
      ? Math.max(start + 1_000, now - LIVE_DELAY_MS)
      : Math.max(start + 60_000, ...(ends.length ? [Math.max(...ends) + 30_000] : [Date.parse(data.session.endsAt)]));
    return { start, end };
  }, [data, live, now]);

  // Jump to the start (or the shared instant) when a session loads.
  useEffect(() => {
    if (!bounds || !sessionKey || placedFor.current === sessionKey) return;
    placedFor.current = sessionKey;
    const offset = startOffset.current;
    startOffset.current = null;
    const next = live ? bounds.end : offset !== null ? Math.min(bounds.end, bounds.start + offset * 1000) : bounds.start;
    tRef.current = next;
    setT(next);
  }, [bounds, sessionKey, live]);

  // Playback clock.
  useEffect(() => {
    if (!playing || !bounds) return;
    let frame = 0;
    let last = performance.now();
    const tick = (frameTime: number) => {
      if (live) {
        // Live: ride the edge, or catch up to it and then ride it.
        const edge = Date.now() - LIVE_DELAY_MS;
        const advanced = tRef.current + (frameTime - last) * (following ? 1 : speed);
        tRef.current = following ? edge : Math.min(edge, advanced);
        if (!following && tRef.current >= edge) setFollowing(true);
        last = frameTime;
        setT(tRef.current);
        frame = requestAnimationFrame(tick);
        return;
      }
      tRef.current = Math.min(bounds.end, tRef.current + (frameTime - last) * speed);
      last = frameTime;
      setT(tRef.current);
      if (tRef.current >= bounds.end) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, bounds, live, following]);

  const seek = (value: number) => {
    tRef.current = value;
    setT(value);
    if (live) setFollowing(value >= Date.now() - LIVE_DELAY_MS - 2_000);
  };

  // Keep the shared link pointing at the paused instant.
  useEffect(() => {
    if (live || !sessionKey || !bounds || playing) return;
    const params = new URLSearchParams({ sesion: String(sessionKey) });
    const offset = Math.round((t - bounds.start) / 1000);
    if (offset > 0) params.set("t", String(offset));
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [live, sessionKey, bounds, playing, t]);

  // Load the position window under the playhead and the next one.
  const chunkIndex = Math.floor(t / POSITION_CHUNK_MS);
  useEffect(() => {
    if (!sessionKey || !bounds) return;
    for (const index of [chunkIndex, chunkIndex + 1]) {
      if (index * POSITION_CHUNK_MS > bounds.end || loadingChunks.current.has(index)) continue;
      // Live windows keep filling in, so re-read them every few seconds until they are final.
      const fetchedAt = chunkFetchedAt.current.get(index);
      const stillFilling = live && (index + 1) * POSITION_CHUNK_MS > (fetchedAt ?? 0) - 180_000;
      if (chunks.has(index) && !(stillFilling && Date.now() - (fetchedAt ?? 0) > 4_000)) continue;
      loadingChunks.current.add(index);
      getJson<ReplayPositionsChunk>(`/api/replay/positions?key=${sessionKey}&chunk=${index}`, live ? { cache: "no-store" } : undefined)
        .then((chunk) => {
          chunkFetchedAt.current.set(index, Date.now());
          setChunks((current) => new Map(current).set(index, chunk));
        })
        .catch(() => undefined)
        .finally(() => loadingChunks.current.delete(index));
    }
  }, [chunkIndex, sessionKey, bounds, chunks, live, now]);

  const cars = useMemo(() => {
    const merged = new Map<number, { t: number[]; x: number[]; y: number[] }>();
    for (const index of [chunkIndex - 1, chunkIndex, chunkIndex + 1]) {
      const chunk = chunks.get(index);
      if (!chunk) continue;
      for (const [driver, car] of Object.entries(chunk.cars)) {
        const target = merged.get(Number(driver)) ?? { t: [], x: [], y: [] };
        car.t.forEach((offset, i) => {
          target.t.push(chunk.from + offset);
          target.x.push(car.x[i]);
          target.y.push(car.y[i]);
        });
        merged.set(Number(driver), target);
      }
    }
    return merged;
  }, [chunks, chunkIndex]);

  const carAt = (driver: number) => {
    const car = cars.get(driver);
    if (!car?.t.length) return null;
    let low = 0;
    let high = car.t.length - 1;
    if (t < car.t[0] - 5_000 || t > car.t[high] + 5_000) return null;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (car.t[middle] <= t) low = middle;
      else high = middle - 1;
    }
    const next = Math.min(car.t.length - 1, low + 1);
    const span = car.t[next] - car.t[low];
    if (span <= 0 || span > 5_000 || t <= car.t[low]) return { x: car.x[low], y: car.y[low] };
    const ratio = Math.min(1, (t - car.t[low]) / span);
    return { x: car.x[low] + (car.x[next] - car.x[low]) * ratio, y: car.y[low] + (car.y[next] - car.y[low]) * ratio };
  };

  // The tower only needs refreshing a few times a second.
  const towerClock = Math.floor(t / 250);
  const tower = useMemo<TowerRow[]>(() => {
    if (!data || !timeline) return [];
    const at = towerClock * 250;
    const isRace = data.session.type === "Race";
    const rows = data.drivers.map((driver) => {
      const laps = data.laps[driver.number] ?? [];
      const started = laps.filter((lap) => lap.start !== null && lap.start <= at);
      const completed = laps.filter((lap) => lap.start !== null && lap.duration !== null && lap.start + lap.duration * 1000 <= at);
      const best = completed.filter((lap) => !lap.pitOut).reduce<number | null>((value, lap) => (value === null || (lap.duration as number) < value ? lap.duration : value), null);
      const lap = started.at(-1)?.lap ?? null;
      const interval: ReplayIntervalPoint | undefined = lastBefore(timeline.intervals[driver.number], at);
      const pits = timeline.pits.filter((pit) => pit.driver === driver.number && pit.at <= at);
      const lastPit = pits.at(-1);
      return {
        driver,
        position: lastBefore(timeline.positions[driver.number], at)?.[1] ?? null,
        gap: interval?.[1] ?? null,
        interval: interval?.[2] ?? null,
        lap,
        lastLap: completed.at(-1)?.duration ?? null,
        bestLap: best,
        tyre: tyreOnLap(data.stints, driver.number, lap ?? 1),
        pits: pits.length,
        inPit: Boolean(lastPit && at - lastPit.at < Math.max(20, lastPit.duration ?? 22) * 1000)
      };
    });
    if (isRace) return rows.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    // Practice and qualifying: order by best lap so far and show the gap to the fastest.
    const sorted = rows.sort((a, b) => (a.bestLap ?? Infinity) - (b.bestLap ?? Infinity) || (a.position ?? 99) - (b.position ?? 99));
    const fastest = sorted[0]?.bestLap ?? null;
    return sorted.map((row, index) => ({
      ...row,
      position: row.bestLap !== null ? index + 1 : row.position,
      gap: row.bestLap !== null && fastest !== null && index > 0 ? Number((row.bestLap - fastest).toFixed(3)) : null,
      interval: row.bestLap !== null && index > 0 && sorted[index - 1].bestLap !== null ? Number((row.bestLap - (sorted[index - 1].bestLap as number)).toFixed(3)) : null
    }));
  }, [data, timeline, towerClock]);

  const messages = useMemo(() => (timeline ? timeline.raceControl.filter((message) => message.at <= t).slice(-40).reverse() : []), [timeline, t]);
  const state = timeline ? trackState(timeline.raceControl, t) : null;
  const weather = data ? weatherAt(data.weather, t) : null;
  const leaderLap = tower.find((row) => row.position === 1)?.lap ?? Math.max(0, ...tower.map((row) => row.lap ?? 0));
  const totalLaps = data ? Math.max(0, ...Object.values(data.laps).map((laps) => laps.at(-1)?.lap ?? 0)) : 0;

  const markers: TrackMarker[] = tower.flatMap((row) => {
    const position = carAt(row.driver.number);
    return position ? [{ key: row.driver.number, x: position.x, y: position.y, color: row.driver.color, label: row.driver.acronym, dim: selected !== null && selected !== row.driver.number }] : [];
  }).reverse();

  const selectedRow = tower.find((row) => row.driver.number === selected);
  const fieldInputs = useFieldInputs(sessionKey, data ? t : 0, live, towerView === "telemetry");
  const currentLaps = useMemo(() => {
    const result = new Map<number, NonNullable<ReplaySession["laps"][number]>[number]>();
    if (!data) return result;
    for (const row of tower) {
      const lap = (data.laps[row.driver.number] ?? []).find((item) => item.lap === row.lap);
      if (lap) result.set(row.driver.number, lap);
    }
    return result;
  }, [data, tower]);
  const driverMap = useMemo(() => new Map((data?.drivers ?? []).map((driver) => [driver.number, driver])), [data]);
  const session = data?.session;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.code !== "Space" || target?.closest("input, select, button, textarea")) return;
      event.preventDefault();
      setPlaying((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="race-replay">
      {!live && (
      <div className="replay-controls replay-controls-two">
        <SessionSelect year={year} onYear={(value) => { setYear(value); setSessionKey(null); }} sessions={sessions} session={sessionKey} onSession={setSessionKey} />
      </div>
      )}

      {(error || (!live && listError)) && (
        <div className="replay-error" role="alert">
          <p>{error ?? "No pudimos leer el calendario de sesiones de OpenF1."}</p>
          <button type="button" onClick={() => { setError(null); setRetry((value) => value + 1); }}>Reintentar</button>
        </div>
      )}

      {sessionKey && !error && (!data || !timeline) && <p className="replay-loading">Cargando la sesión…</p>}

      {data && timeline && bounds && session && (
        <>
          <div className="replay-transport">
            <button type="button" className="replay-play" onClick={() => {
              if (!live && tRef.current >= bounds.end) seek(bounds.start);
              if (live && playing) setFollowing(false);
              setPlaying((value) => !value);
            }} aria-label={playing ? "Pausar" : "Reproducir"}>
              {playing ? <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" /><rect x="9.5" y="2" width="3.5" height="12" /></svg>
                : <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" /></svg>}
            </button>
            <div className="replay-speeds" role="radiogroup" aria-label="Velocidad">
              {SPEEDS.map((value) => (
                <button type="button" role="radio" aria-checked={speed === value} key={value} onClick={() => setSpeed(value)}>{value}×</button>
              ))}
            </div>
            <input
              className="replay-scrubber"
              type="range"
              min={bounds.start}
              max={bounds.end}
              step={1000}
              value={t}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Momento de la sesión"
            />
            {live && (
              <button type="button" className="replay-live" aria-pressed={following} onClick={() => { setFollowing(true); setPlaying(true); }}>
                <i aria-hidden="true" />En directo
              </button>
            )}
            <PanelOptions {...panels} />
            <div className="replay-clock">
              <strong>{formatElapsed(t - bounds.start)}</strong>
              <small>{formatClock(t)} ARG</small>
            </div>
          </div>

          <div className="replay-status">
            <div className="replay-status-title">
              <strong>{session.meeting}</strong>
              <small>{session.name}{leaderLap ? ` · Vuelta ${leaderLap}${session.type === "Race" && totalLaps && !live ? ` de ${totalLaps}` : ""}` : ""}</small>
            </div>
            {state && <div className={`replay-flag flag-${state.key}`}><i aria-hidden="true" />{state.label}</div>}
            {weather && shows("weather") && (
              <dl className="replay-weather">
                <div><dt>Aire</dt><dd>{weather.air?.toFixed(1) ?? "—"}°</dd></div>
                <div><dt>Pista</dt><dd>{weather.track?.toFixed(1) ?? "—"}°</dd></div>
                <div><dt>Humedad</dt><dd>{weather.humidity?.toFixed(0) ?? "—"}%</dd></div>
                <div><dt>Viento</dt><dd>{weather.wind?.toFixed(1) ?? "—"} m/s</dd></div>
                <div><dt>Lluvia</dt><dd className={weather.rain ? "is-rain" : undefined}>{weather.rain ? "Sí" : "No"}</dd></div>
              </dl>
            )}
          </div>

          <div className={shows("map") || shows("radar") ? "replay-stage" : "replay-stage replay-stage-solo"}>
            {(shows("map") || shows("radar")) && (
            <div className="replay-column">
            {shows("map") && (
            <PanelBoundary name="el mapa">
            <section className="replay-panel replay-map">
              <TrackOutline points={timeline.track} markers={markers} label={`Posiciones en pista, ${session.meeting}`} showLabels />
              {selectedRow && (
                <p className="replay-selected">
                  <b>{selectedRow.driver.name}</b> · {selectedRow.driver.team}
                  {selectedRow.lap && (
                    <> · <Link href={`/en-vivo/telemetria?sesion=${session.key}&piloto=${selectedRow.driver.number}&vuelta=${Math.max(1, (selectedRow.lap ?? 2) - 1)}`}>Telemetría de su última vuelta</Link></>
                  )}
                </p>
              )}
            </section>
            </PanelBoundary>
            )}

            {shows("radar") && <PanelBoundary name="la lluvia"><RadarPanel sessionKey={session.key} at={t} /></PanelBoundary>}
            </div>
            )}

            <PanelBoundary name="la clasificación">
            <section className="replay-panel replay-tower" aria-label="Clasificación">
              <div className="replay-speeds tower-views" role="radiogroup" aria-label="Columnas">
                <button type="button" role="radio" aria-checked={towerView === "times"} onClick={() => setTowerView("times")}>Tiempos</button>
                <button type="button" role="radio" aria-checked={towerView === "telemetry"} onClick={() => setTowerView("telemetry")}>Telemetría</button>
              </div>
              {towerView === "times" ? (
                <div className="tower-row tower-head">
                  <span>Pos</span><span>Piloto</span><span>{session.type === "Race" ? "Líder" : "Mejor"}</span><span>Int.</span><span>Última</span><span>Mejor</span><span>Neum.</span><span>Pits</span>
                </div>
              ) : (
                <div className="tower-row tower-head tower-telemetry">
                  <span>Pos</span><span>Piloto</span><span>Int.</span><span>km/h</span><span>Marcha</span><span>Acel. / freno</span><span>Minisectores</span>
                </div>
              )}
              {tower.map((row) => (
                <button
                  type="button"
                  className={towerView === "times" ? "tower-row" : "tower-row tower-telemetry"}
                  key={row.driver.number}
                  aria-pressed={selected === row.driver.number}
                  onClick={() => setSelected((current) => (current === row.driver.number ? null : row.driver.number))}
                >
                  <b className="tower-pos">{row.position ?? "—"}</b>
                  <span className="tower-driver"><i style={{ background: row.driver.color }} /><b>{row.driver.acronym}</b>{row.inPit && <small className="tower-pit">Boxes</small>}</span>
                  {towerView === "times" ? (
                    <>
                      <code>{row.position === 1 && session.type === "Race" ? "Líder" : formatGap(row.gap)}</code>
                      <code>{formatGap(row.interval)}</code>
                      <code>{formatLapTime(row.lastLap)}</code>
                      <code>{formatLapTime(row.bestLap)}</code>
                      <span>{row.tyre ? <TyreChip compound={row.tyre.compound} age={row.tyre.age} /> : "—"}</span>
                      <code>{row.pits}</code>
                    </>
                  ) : (
                    <>
                      <code>{formatGap(row.interval)}</code>
                      <InputsCell inputs={fieldInputs.get(row.driver.number)} />
                      <MiniSectors lap={currentLaps.get(row.driver.number)} at={t} />
                    </>
                  )}
                </button>
              ))}
            </section>
            </PanelBoundary>
          </div>

          {shows("driver") && (selectedRow ? (
            <div className="replay-driver">
              <PanelBoundary name="la telemetría"><DriverTelemetry sessionKey={session.key} driver={selectedRow.driver} at={t} live={live} /></PanelBoundary>
              <PanelBoundary name="el stint"><StintChart data={data} driver={selectedRow.driver} at={t} /></PanelBoundary>
            </div>
          ) : <p className="replay-hint">Elegí un piloto en la clasificación para ver su telemetría y su stint.</p>)}

          {session.type === "Race" && shows("pits") && (
            <PanelBoundary name="las paradas">
            <PitProjection
              data={data}
              timeline={timeline}
              rows={tower}
              at={t}
              neutralised={state?.key === "sc" || state?.key === "vsc"}
              selected={selected}
              onSelect={(driver) => setSelected((current) => (current === driver ? null : driver))}
            />
            </PanelBoundary>
          )}

          {(shows("control") || shows("incidents") || shows("radios")) && (
          <div className="replay-feeds">
          {shows("control") && (
          <section className="replay-panel replay-control-feed" aria-label="Dirección de carrera">
            <h2>Dirección de carrera</h2>
            {messages.length ? (
              <ol>
                {messages.map((message) => (
                  <li key={`${message.at}-${message.message}`}>
                    <time>{formatClock(message.at)}</time>
                    {message.flag && <span className={`rc-flag rc-${message.flag.toLowerCase().replace(/\s+/g, "-")}`}>{message.flag}</span>}
                    <p>{message.message}</p>
                  </li>
                ))}
              </ol>
            ) : <p className="replay-empty">Todavía no hay mensajes en este momento de la sesión.</p>}
          </section>
          )}
          {shows("incidents") && <PanelBoundary name="los incidentes"><IncidentsPanel timeline={timeline} drivers={driverMap} at={t} selected={selected} /></PanelBoundary>}
          {shows("radios") && <PanelBoundary name="las radios"><RadioPanel timeline={timeline} drivers={driverMap} at={t} playing={playing} speed={live && following ? 1 : speed} selected={selected} /></PanelBoundary>}
          </div>
          )}

          {session.type === "Race" && shows("championship") && <PanelBoundary name="el campeonato"><ChampionshipPanel data={data} rows={tower} /></PanelBoundary>}
        </>
      )}
    </div>
  );
}
