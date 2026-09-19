import { formatSession, isSessionLive } from "@/lib/format";
import type { CircuitProfile, ScheduledRace } from "@/lib/types";

const zones = [
  { label: "ARGENTINA", short: "ARG", zone: "America/Argentina/Buenos_Aires" },
  { label: "BRASIL", short: "BRA", zone: "America/Sao_Paulo" },
  { label: "COLOMBIA", short: "COL", zone: "America/Bogota" },
  { label: "MÉXICO", short: "MEX", zone: "America/Mexico_City" }
];

export function RaceSchedule({ race, circuit }: { race: ScheduledRace; circuit: CircuitProfile }) {
  return (
    <div className="schedule-table">
      <div className="schedule-row schedule-row-head">
        <span>SESIÓN</span>
        <span>{race.country.toUpperCase()}</span>
        {zones.map((zone) => <span key={zone.short}><b>{zone.short}</b><i>{zone.label}</i></span>)}
      </div>
      {race.sessions.map((session) => {
        const local = formatSession(session, circuit.timezone);
        return (
          <div className={isSessionLive(session) ? "schedule-row is-live" : "schedule-row"} key={session.key}>
            <div><strong>{session.label}</strong><small>{local.day}</small></div>
            <b>{local.time}</b>
            {zones.map((zone) => <b key={zone.short}>{formatSession(session, zone.zone).time}</b>)}
          </div>
        );
      })}
    </div>
  );
}
