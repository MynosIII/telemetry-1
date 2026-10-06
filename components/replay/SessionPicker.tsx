"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReplaySessionSummary } from "@/lib/replay";

export const FIRST_REPLAY_YEAR = 2023;

/** Finished OpenF1 sessions for a season; an empty current season falls back to the previous one. */
export function useSessionList(year: number | null, onYear: (year: number) => void, retry = 0) {
  const [sessions, setSessions] = useState<ReplaySessionSummary[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (year === null) return;
    let cancelled = false;
    setSessions(null);
    setError(false);
    fetch(`/api/replay/sessions?year=${year}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<ReplaySessionSummary[]>;
      })
      .then((list) => {
        if (cancelled) return;
        if (!list.length && year === new Date().getFullYear() && year > FIRST_REPLAY_YEAR) onYear(year - 1);
        else setSessions(list);
      })
      .catch(() => !cancelled && setError(true));
    return () => { cancelled = true; };
  }, [year, onYear, retry]);
  return { sessions, error };
}

export function SessionSelect({ year, onYear, sessions, session, onSession, filter }: {
  year: number | null;
  onYear: (year: number) => void;
  sessions: ReplaySessionSummary[] | null;
  session: number | null;
  onSession: (key: number) => void;
  filter?: (session: ReplaySessionSummary) => boolean;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - FIRST_REPLAY_YEAR + 1 }, (_, i) => currentYear - i);
  const meetings = useMemo(() => {
    const grouped = new Map<number, { name: string; sessions: ReplaySessionSummary[] }>();
    for (const item of (sessions ?? []).filter(filter ?? (() => true))) {
      const group = grouped.get(item.meetingKey) ?? { name: item.meeting, sessions: [] };
      group.sessions.push(item);
      grouped.set(item.meetingKey, group);
    }
    return [...grouped.values()].reverse();
  }, [sessions, filter]);
  return (
    <>
      <label>
        <span>Temporada</span>
        <select value={year ?? ""} onChange={(event) => onYear(Number(event.target.value))}>
          {years.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="replay-control-wide">
        <span>Sesión</span>
        <select value={session ?? ""} onChange={(event) => onSession(Number(event.target.value))} disabled={!meetings.length}>
          {!sessions && <option value="">Cargando…</option>}
          {meetings.map((meeting) => (
            <optgroup key={meeting.name} label={meeting.name}>
              {[...meeting.sessions].reverse().map((item) => (
                <option key={item.key} value={item.key}>{item.meeting} · {item.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </>
  );
}
