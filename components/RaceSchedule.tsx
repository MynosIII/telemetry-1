import Image from "next/image";
import { getCountryFlagUrl } from "@/lib/circuit-visuals";
import { formatSession, isSessionLive } from "@/lib/format";
import type { CircuitProfile, ScheduledRace } from "@/lib/types";

const zones = [
  { label: "ARGENTINA", short: "ARG", country: "Argentina", zone: "America/Argentina/Buenos_Aires" },
  { label: "BRASIL", short: "BRA", country: "Brazil", zone: "America/Sao_Paulo" },
  { label: "COLOMBIA", short: "COL", country: "Colombia", zone: "America/Bogota" },
  { label: "MÉXICO", short: "MEX", country: "Mexico", zone: "America/Mexico_City" }
];

export function RaceSchedule({ race, circuit }: { race: ScheduledRace; circuit: CircuitProfile }) {
  return (
    <div className="schedule-table">
      <div className="schedule-row schedule-row-head">
        <span>SESIÓN</span>
        <span className="schedule-zone-head">
          <b>{race.country.toUpperCase()}</b>
          {getCountryFlagUrl(race.country) && <Image src={getCountryFlagUrl(race.country)!} alt="" width={26} height={17} unoptimized />}
        </span>
        {zones.map((zone) => (
          <span className="schedule-zone-head" key={zone.short}>
            <b>{zone.short}</b>
            <Image src={getCountryFlagUrl(zone.country)!} alt="" width={26} height={17} unoptimized />
            <i>{zone.label}</i>
          </span>
        ))}
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
