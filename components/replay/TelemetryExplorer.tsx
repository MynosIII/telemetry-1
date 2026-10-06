"use client";

import { useEffect, useMemo, useState } from "react";
import { TraceChart, valueAt, indexAt, type TraceSeries } from "@/components/replay/TraceChart";
import { TrackOutline, type TrackMarker } from "@/components/replay/TrackOutline";
import { formatDelta, formatLapTime } from "@/components/replay/format";
import { SessionConditions } from "@/components/replay/SessionConditions";
import { TyreChip } from "@/components/replay/TyreChip";
import { compoundInfo, rainedBetween, tyreOnLap, weatherAt } from "@/components/replay/tyres";
import type { LapTelemetry, ReplayDriver, ReplayLap, ReplaySession, ReplaySessionSummary } from "@/lib/replay";

const PRIMARY_COLOR = "#ef3b33";
const COMPARE_COLOR = "#3d8fe0";
const FIRST_YEAR = 2023;

type Selection = { session: number | null; driver: number | null; lap: number | null; rival: number | null; rivalLap: number | null };

const lapCache = new Map<string, Promise<LapTelemetry>>();

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<T>;
}

function loadLap(session: number, driver: number, lap: number) {
  const key = `${session}-${driver}-${lap}`;
  let pending = lapCache.get(key);
  if (!pending) {
    pending = getJson<LapTelemetry>(`/api/replay/lap?session=${session}&driver=${driver}&lap=${lap}`);
    pending.catch(() => lapCache.delete(key));
    lapCache.set(key, pending);
  }
  return pending;
}

export function fastestLap(laps: ReplayLap[] | undefined) {
  return (laps ?? []).reduce<ReplayLap | null>((best, lap) => {
    if (lap.duration === null || lap.pitOut) return best;
    return !best || lap.duration < (best.duration ?? Infinity) ? lap : best;
  }, null);
}

function readSelection(): Selection {
  const params = new URLSearchParams(window.location.search);
  const read = (name: string) => {
    const value = Number(params.get(name));
    return Number.isInteger(value) && value > 0 ? value : null;
  };
  return { session: read("sesion"), driver: read("piloto"), lap: read("vuelta"), rival: read("rival"), rivalLap: read("vueltaRival") };
}

function writeSelection(selection: Selection) {
  const params = new URLSearchParams();
  if (selection.session) params.set("sesion", String(selection.session));
  if (selection.driver) params.set("piloto", String(selection.driver));
  if (selection.lap) params.set("vuelta", String(selection.lap));
  if (selection.rival) params.set("rival", String(selection.rival));
  if (selection.rivalLap) params.set("vueltaRival", String(selection.rivalLap));
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

type LapStats = {
  time: number | null;
  top: number;
  average: number | null;
  maxRpm: number;
  gearChanges: number;
  drsOpens: number;
  fullThrottle: number;
  braking: number;
};

function lapStats(lap: LapTelemetry): LapStats {
  let gearChanges = 0;
  let drsOpens = 0;
  let fullThrottle = 0;
  let braking = 0;
  for (let i = 1; i < lap.t.length; i += 1) {
    const dt = lap.t[i] - lap.t[i - 1];
    if (lap.gear[i] > 0 && lap.gear[i - 1] > 0 && lap.gear[i] !== lap.gear[i - 1]) gearChanges += 1;
    if (lap.drs[i] >= 10 && lap.drs[i - 1] < 10) drsOpens += 1;
    if (lap.throttle[i] >= 98) fullThrottle += dt;
    if (lap.brake[i] > 0) braking += dt;
  }
  const total = lap.t.at(-1) ?? 0;
  const distance = lap.d.at(-1) ?? 0;
  return {
    time: lap.duration,
    top: Math.max(0, ...lap.speed),
    average: total > 0 ? (distance / total) * 3.6 : null,
    maxRpm: Math.max(0, ...lap.rpm),
    gearChanges,
    drsOpens,
    fullThrottle: total > 0 ? (fullThrottle / total) * 100 : 0,
    braking: total > 0 ? (braking / total) * 100 : 0
  };
}

/** Rescales the rival's distance onto the primary lap so corners line up despite small distance drift. */
function alignedDistance(rival: LapTelemetry, length: number) {
  const rivalLength = rival.d.at(-1) ?? 0;
  if (!rivalLength || !length) return rival.d;
  return rival.d.map((d) => (d * length) / rivalLength);
}

function DriverGrid({ drivers, selected, onSelect, allowNone, label, disabled }: {
  drivers: ReplayDriver[];
  selected: number | null;
  onSelect: (driver: number | null) => void;
  allowNone?: boolean;
  label: string;
  disabled?: number | null;
}) {
  return (
    <div className="driver-grid" role="radiogroup" aria-label={label}>
      {allowNone && (
        <button type="button" role="radio" aria-checked={selected === null} onClick={() => onSelect(null)} className="driver-chip driver-chip-none">
          <b>—</b><small>Ninguno</small>
        </button>
      )}
      {drivers.map((driver) => (
        <button
          type="button"
          role="radio"
          aria-checked={selected === driver.number}
          disabled={disabled === driver.number}
          key={driver.number}
          className="driver-chip"
          title={`${driver.name} · ${driver.team}`}
          onClick={() => onSelect(driver.number)}
        >
          <b style={{ color: driver.color }}>{driver.number}</b>
          <small>{driver.acronym}</small>
        </button>
      ))}
    </div>
  );
}

function lapOptionLabel(lap: ReplayLap, fastest: ReplayLap | null, data: ReplaySession, driver: number) {
  const tyre = tyreOnLap(data.stints, driver, lap.lap);
  const wet = lap.start !== null && rainedBetween(data.weather, lap.start, lap.start + (lap.duration ?? 100) * 1000);
  const notes = [lap.lap === fastest?.lap ? "más rápida" : "", lap.pitOut ? "salida de boxes" : "", wet ? "lluvia" : ""].filter(Boolean);
  const tyreText = tyre ? ` · ${compoundInfo(tyre.compound).label} ${tyre.age} v.` : "";
  return `Vuelta ${lap.lap} · ${formatLapTime(lap.duration)}${tyreText}${notes.length ? ` (${notes.join(", ")})` : ""}`;
}

export function TelemetryExplorer() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number | null>(null);
  const [sessions, setSessions] = useState<ReplaySessionSummary[] | null>(null);
  const [data, setData] = useState<ReplaySession | null>(null);
  const [selection, setSelection] = useState<Selection>({ session: null, driver: null, lap: null, rival: null, rivalLap: null });
  const [primary, setPrimary] = useState<LapTelemetry | null>(null);
  const [rival, setRival] = useState<LapTelemetry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);

  // Start from the URL, so a shared link opens the same comparison.
  useEffect(() => {
    const initial = readSelection();
    setSelection(initial);
    // A linked session sets the year once it loads.
    if (!initial.session) setYear(currentYear);
  }, [currentYear]);

  useEffect(() => {
    if (year === null) return;
    let cancelled = false;
    setSessions(null);
    setError(null);
    getJson<ReplaySessionSummary[]>(`/api/replay/sessions?year=${year}`)
      .then((list) => {
        if (cancelled) return;
        if (!list.length && year === currentYear && year > FIRST_YEAR) {
          setYear(year - 1);
          return;
        }
        setSessions(list);
        setSelection((current) => {
          if (current.session && list.some((session) => session.key === current.session)) return current;
          const latest = [...list].reverse().find((session) => session.finished) ?? list.at(-1);
          return { session: latest?.key ?? null, driver: null, lap: null, rival: null, rivalLap: null };
        });
      })
      .catch(() => !cancelled && setError("No pudimos leer el calendario de sesiones de OpenF1."));
    return () => { cancelled = true; };
  }, [year, currentYear, retry]);

  useEffect(() => {
    if (!selection.session) return;
    let cancelled = false;
    setData(null);
    setLoading(true);
    setError(null);
    getJson<ReplaySession>(`/api/replay/session?key=${selection.session}`)
      .then((session) => {
        if (cancelled) return;
        setData(session);
        // The session's own year wins over the selector (shared links from other seasons).
        const sessionYear = new Date(session.session.startsAt).getFullYear();
        setYear((current) => current === sessionYear ? current : sessionYear);
        setSelection((current) => {
          const validDriver = current.driver && session.laps[current.driver]?.length ? current.driver : null;
          const driver = validDriver ?? session.drivers
            .map((item) => ({ number: item.number, best: fastestLap(session.laps[item.number])?.duration ?? Infinity }))
            .sort((a, b) => a.best - b.best)[0]?.number ?? null;
          const laps = driver ? session.laps[driver] ?? [] : [];
          const lap = current.lap && laps.some((item) => item.lap === current.lap) ? current.lap : fastestLap(laps)?.lap ?? laps[0]?.lap ?? null;
          const rival = current.rival && session.laps[current.rival]?.length && current.rival !== driver ? current.rival : null;
          const rivalLaps = rival ? session.laps[rival] ?? [] : [];
          const rivalLap = rival ? (current.rivalLap && rivalLaps.some((item) => item.lap === current.rivalLap) ? current.rivalLap : fastestLap(rivalLaps)?.lap ?? null) : null;
          return { ...current, driver, lap, rival, rivalLap };
        });
      })
      .catch(() => !cancelled && setError("No pudimos cargar la sesión desde OpenF1."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [selection.session, retry]);

  useEffect(() => {
    if (selection.session) writeSelection(selection);
  }, [selection]);

  useEffect(() => {
    const { session, driver, lap } = selection;
    setPrimary(null);
    if (!session || !driver || !lap || data?.session.key !== session) return;
    let cancelled = false;
    setLoading(true);
    loadLap(session, driver, lap)
      .then((telemetry) => !cancelled && setPrimary(telemetry))
      .catch(() => !cancelled && setError("OpenF1 no devolvió telemetría para esta vuelta."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [selection.session, selection.driver, selection.lap, data, retry]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const { session, rival: rivalDriver, rivalLap } = selection;
    setRival(null);
    if (!session || !rivalDriver || !rivalLap || data?.session.key !== session) return;
    let cancelled = false;
    loadLap(session, rivalDriver, rivalLap)
      .then((telemetry) => !cancelled && setRival(telemetry))
      .catch(() => !cancelled && setError("OpenF1 no devolvió telemetría para la vuelta a comparar."));
    return () => { cancelled = true; };
  }, [selection.session, selection.rival, selection.rivalLap, data, retry]); // eslint-disable-line react-hooks/exhaustive-deps

  const driverByNumber = useMemo(() => new Map(data?.drivers.map((driver) => [driver.number, driver]) ?? []), [data]);
  const primaryDriver = selection.driver ? driverByNumber.get(selection.driver) : undefined;
  const rivalDriver = selection.rival ? driverByNumber.get(selection.rival) : undefined;
  const primaryLaps = selection.driver ? data?.laps[selection.driver] ?? [] : [];
  const rivalLaps = selection.rival ? data?.laps[selection.rival] ?? [] : [];
  const primaryFastest = fastestLap(primaryLaps);
  const rivalFastest = fastestLap(rivalLaps);
  const primaryLapInfo = primaryLaps.find((lap) => lap.lap === selection.lap);
  const rivalLapInfo = rivalLaps.find((lap) => lap.lap === selection.rivalLap);

  const length = primary?.d.at(-1) ?? 0;
  const rivalD = useMemo(() => (rival && length ? alignedDistance(rival, length) : []), [rival, length]);
  const comparing = Boolean(primary && rival && rivalD.length);

  const series = (pick: (lap: LapTelemetry) => number[]): TraceSeries[] => {
    const list: TraceSeries[] = [];
    if (primary) list.push({ key: "primary", label: primaryDriver?.acronym ?? "", color: PRIMARY_COLOR, x: primary.d, y: pick(primary) });
    if (rival && comparing) list.push({ key: "rival", label: rivalDriver?.acronym ?? "", color: COMPARE_COLOR, x: rivalD, y: pick(rival) });
    return list;
  };

  // Time gap along the lap: positive means the rival is behind at that point.
  const delta = useMemo(() => {
    if (!primary || !rival || !rivalD.length) return null;
    const x: number[] = [];
    const y: number[] = [];
    primary.d.forEach((d, i) => {
      const rivalTime = valueAt(rivalD, rival.t, d);
      if (rivalTime === null) return;
      x.push(d);
      y.push(rivalTime - primary.t[i]);
    });
    return { x, y };
  }, [primary, rival, rivalD]);

  const deltaExtent = delta ? Math.max(0.1, ...delta.y.map(Math.abs)) : 0.1;
  const deltaTick = Math.ceil(deltaExtent * 10) / 10;

  const track = useMemo(() => primary
    ? primary.x.flatMap((x, i) => (x === null || primary.y[i] === null ? [] : [{ x, y: primary.y[i] as number }]))
    : [], [primary]);

  const markers: TrackMarker[] = [];
  if (hover !== null && primary) {
    const i = indexAt(primary.d, hover);
    if (primary.x[i] !== null && primary.y[i] !== null) markers.push({ key: "primary", x: primary.x[i] as number, y: primary.y[i] as number, color: PRIMARY_COLOR });
    if (rival && comparing) {
      const j = indexAt(rivalD, hover);
      if (rival.x[j] !== null && rival.y[j] !== null) markers.push({ key: "rival", x: rival.x[j] as number, y: rival.y[j] as number, color: COMPARE_COLOR });
    }
  }

  const stats = [primary ? { driver: primaryDriver, lap: primary, stats: lapStats(primary) } : null, comparing && rival ? { driver: rivalDriver, lap: rival, stats: lapStats(rival) } : null]
    .filter((item): item is { driver: ReplayDriver | undefined; lap: LapTelemetry; stats: LapStats } => item !== null);

  const meetings = useMemo(() => {
    const grouped = new Map<number, { name: string; sessions: ReplaySessionSummary[] }>();
    for (const session of sessions ?? []) {
      const group = grouped.get(session.meetingKey) ?? { name: session.meeting, sessions: [] };
      group.sessions.push(session);
      grouped.set(session.meetingKey, group);
    }
    return [...grouped.values()].reverse();
  }, [sessions]);

  const years = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, i) => currentYear - i);
  const update = (patch: Partial<Selection>) => setSelection((current) => ({ ...current, ...patch }));

  const chooseDriver = (driver: number | null) => {
    if (!driver || !data) return;
    const laps = data.laps[driver] ?? [];
    const keepLap = selection.lap && laps.some((lap) => lap.lap === selection.lap) && data.session.type !== "Qualifying";
    update({ driver, lap: keepLap ? selection.lap : fastestLap(laps)?.lap ?? laps[0]?.lap ?? null, ...(selection.rival === driver ? { rival: null, rivalLap: null } : {}) });
  };

  const chooseRival = (driver: number | null) => {
    if (!driver || !data) {
      update({ rival: null, rivalLap: null });
      return;
    }
    const laps = data.laps[driver] ?? [];
    update({ rival: driver, rivalLap: fastestLap(laps)?.lap ?? laps[0]?.lap ?? null });
  };

  return (
    <div className="telemetry-explorer">
      <div className="replay-controls">
        <label>
          <span>Temporada</span>
          <select value={year ?? ""} onChange={(event) => { setYear(Number(event.target.value)); setSelection({ session: null, driver: null, lap: null, rival: null, rivalLap: null }); }}>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="replay-control-wide">
          <span>Sesión</span>
          <select value={selection.session ?? ""} onChange={(event) => setSelection({ session: Number(event.target.value), driver: selection.driver, lap: null, rival: selection.rival, rivalLap: null })} disabled={!sessions?.length}>
            {!sessions && <option value="">Cargando…</option>}
            {meetings.map((meeting) => (
              <optgroup key={meeting.name} label={meeting.name}>
                {[...meeting.sessions].reverse().map((session) => (
                  <option key={session.key} value={session.key}>{session.meeting} · {session.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          <span>Vuelta</span>
          <select value={selection.lap ?? ""} onChange={(event) => update({ lap: Number(event.target.value) })} disabled={!primaryLaps.length}>
            {data && selection.driver && primaryLaps.map((lap) => <option key={lap.lap} value={lap.lap}>{lapOptionLabel(lap, primaryFastest, data, selection.driver!)}</option>)}
          </select>
        </label>
      </div>

      {sessions && !sessions.length && <p className="replay-loading">OpenF1 todavía no tiene sesiones de {year}.</p>}

      {error && (
        <div className="replay-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => { setError(null); setRetry((value) => value + 1); }}>Reintentar</button>
        </div>
      )}

      {data && (
        <div className="replay-pickers">
          <section className="replay-panel">
            <h2>Piloto</h2>
            <DriverGrid drivers={data.drivers} selected={selection.driver} onSelect={chooseDriver} label="Piloto principal" />
          </section>
          <section className="replay-panel">
            <h2>Comparar con</h2>
            <DriverGrid drivers={data.drivers} selected={selection.rival} onSelect={chooseRival} allowNone label="Piloto para comparar" disabled={selection.driver} />
            {selection.rival && (
              <label className="replay-rival-lap">
                <span>Vuelta de {rivalDriver?.acronym}</span>
                <select value={selection.rivalLap ?? ""} onChange={(event) => update({ rivalLap: Number(event.target.value) })}>
                  {rivalLaps.map((lap) => <option key={lap.lap} value={lap.lap}>{lapOptionLabel(lap, rivalFastest, data, selection.rival!)}</option>)}
                </select>
              </label>
            )}
          </section>
        </div>
      )}

      {primaryDriver && primaryLapInfo && (
        <div className="lap-summary">
          {[
            { driver: primaryDriver, lap: primaryLapInfo, color: PRIMARY_COLOR },
            ...(rivalDriver && rivalLapInfo ? [{ driver: rivalDriver, lap: rivalLapInfo, color: COMPARE_COLOR }] : [])
          ].map(({ driver, lap, color }) => {
            const tyre = data ? tyreOnLap(data.stints, driver.number, lap.lap) : null;
            const reading = data && lap.start !== null ? weatherAt(data.weather, lap.start) : null;
            const wet = data && lap.start !== null && rainedBetween(data.weather, lap.start, lap.start + (lap.duration ?? 100) * 1000);
            return (
            <div className="lap-summary-row" key={driver.number}>
              <i style={{ background: color }} aria-hidden="true" />
              <div>
                <strong>{driver.name} {tyre && <TyreChip compound={tyre.compound} age={tyre.age} />}</strong>
                <small>
                  {driver.team} · Vuelta {lap.lap}
                  {reading && ` · Pista ${reading.track?.toFixed(0) ?? "—"}° · Aire ${reading.air?.toFixed(0) ?? "—"}°`}
                  {wet && " · Lluvia"}
                </small>
              </div>
              <dl>
                <div><dt>Tiempo</dt><dd>{formatLapTime(lap.duration)}</dd></div>
                {lap.sectors.map((sector, i) => <div key={i}><dt>S{i + 1}</dt><dd>{formatLapTime(sector)}</dd></div>)}
              </dl>
            </div>
            );
          })}
          {primaryLapInfo.duration !== null && rivalLapInfo?.duration != null && (
            <p className="lap-summary-gap">
              {rivalDriver?.acronym} {formatDelta(rivalLapInfo.duration - primaryLapInfo.duration)} s respecto de {primaryDriver.acronym}
            </p>
          )}
        </div>
      )}

      {loading && !primary && !error && <p className="replay-loading">Cargando telemetría…</p>}

      {primary && (
        primary.t.length < 2 ? (
          <p className="replay-loading">OpenF1 no tiene telemetría de esta vuelta.</p>
        ) : (
          <div className="telemetry-layout">
            <div className="telemetry-charts">
              <TraceChart title="Velocidad (km/h)" series={series((lap) => lap.speed)} height={220} domain={[0, Math.max(340, ...primary.speed, ...(rival?.speed ?? []))]} ticks={[100, 200, 300]} format={(v) => `${Math.round(v)}`} maxX={length} hover={hover} onHover={setHover} />
              {delta && (
                <TraceChart
                  title={`Diferencia de ${rivalDriver?.acronym} con ${primaryDriver?.acronym} (s, positivo = ${rivalDriver?.acronym} atrás)`}
                  series={[{ key: "delta", label: rivalDriver?.acronym ?? "", color: COMPARE_COLOR, x: delta.x, y: delta.y }]}
                  height={130} domain={[-deltaTick, deltaTick]} ticks={[-deltaTick, 0, deltaTick]} zero
                  format={(v) => formatDelta(v)} maxX={length} hover={hover} onHover={setHover}
                />
              )}
              <TraceChart title="Acelerador (%)" series={series((lap) => lap.throttle)} height={120} domain={[0, 100]} ticks={[0, 100]} format={(v) => `${Math.round(v)}`} fill={!comparing} maxX={length} hover={hover} onHover={setHover} />
              <TraceChart title="Freno" series={series((lap) => lap.brake)} height={90} domain={[0, 100]} ticks={[]} format={(v) => (v > 0 ? "sí" : "no")} step fill={!comparing} maxX={length} hover={hover} onHover={setHover} />
              <div className="telemetry-pair">
                <TraceChart title="RPM" series={series((lap) => lap.rpm)} height={150} domain={[4000, 13000]} ticks={[6000, 9000, 12000]} format={(v) => `${(v / 1000).toFixed(1)}k`} maxX={length} hover={hover} onHover={setHover} />
                <TraceChart title="Marcha" series={series((lap) => lap.gear)} height={150} domain={[0, 8]} ticks={[2, 4, 6, 8]} format={(v) => `${Math.round(v)}`} step maxX={length} hover={hover} onHover={setHover} />
              </div>
              {comparing && (
                <p className="telemetry-legend">
                  <span><i style={{ background: PRIMARY_COLOR }} />{primaryDriver?.acronym} · vuelta {primary.lap}</span>
                  <span><i style={{ background: COMPARE_COLOR }} />{rivalDriver?.acronym} · vuelta {rival?.lap}</span>
                </p>
              )}
            </div>
            <aside className="telemetry-side">
              <section className="replay-panel">
                <h2>Mapa</h2>
                <TrackOutline points={track} markers={markers} label="Trazado de la vuelta" />
              </section>
              <section className="replay-panel">
                <h2>Datos de la vuelta</h2>
                <table className="lap-stats">
                  <thead>
                    <tr><th scope="col"><span className="sr-only">Dato</span></th>{stats.map(({ driver, lap }) => <th scope="col" key={lap.driver}>{driver?.acronym}</th>)}</tr>
                  </thead>
                  <tbody>
                    {([
                      ["Velocidad máxima", (s: LapStats) => `${Math.round(s.top)} km/h`],
                      ["Velocidad media", (s: LapStats) => (s.average === null ? "—" : `${Math.round(s.average)} km/h`)],
                      ["RPM máximas", (s: LapStats) => s.maxRpm.toLocaleString("es-AR")],
                      ["Cambios de marcha", (s: LapStats) => String(s.gearChanges)],
                      ["Aperturas de DRS", (s: LapStats) => String(s.drsOpens)],
                      ["A fondo", (s: LapStats) => `${Math.round(s.fullThrottle)}%`],
                      ["Frenando", (s: LapStats) => `${Math.round(s.braking)}%`]
                    ] as const).map(([label, read]) => (
                      <tr key={label}><th scope="row">{label}</th>{stats.map(({ lap, stats: s }) => <td key={lap.driver}>{read(s)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </aside>
          </div>
        )
      )}

      {data && <SessionConditions data={data} selected={selection.driver} onSelect={chooseDriver} />}
    </div>
  );
}
