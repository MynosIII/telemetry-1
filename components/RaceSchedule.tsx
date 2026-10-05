import Image from "next/image";
import { getCountryCode, getCountryFlagUrl } from "@/lib/circuit-visuals";
import { formatSession, isSessionLive, zonesForRace } from "@/lib/format";
import type { CircuitProfile, ScheduledRace } from "@/lib/types";

export function RaceSchedule({ race, circuit }: { race: ScheduledRace; circuit: CircuitProfile }) {
  const zones = zonesForRace(race.country);
  return (
    <div className="schedule-table">
      <div className="schedule-row schedule-row-head" aria-hidden="true" data-zones={zones.length}>
        <span>SESIÓN</span>
        <span className="schedule-zone-head">
          <b>{getCountryCode(race.country)}</b>
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
          <div className={isSessionLive(session) ? "schedule-row is-live" : "schedule-row"} key={session.key} data-zones={zones.length}>
            <div><strong>{session.label}</strong><small>{local.day} · hora local</small></div>
            <b><span className="sr-only">{race.country}: </span>{local.time}</b>
            {zones.map((zone) => {
              const viewer = formatSession(session, zone.zone);
              return (
                <b key={zone.short}>
                  <span className="sr-only">{zone.label}: </span>
                  {viewer.time}
                  {viewer.day !== local.day ? <small className="zone-day">{viewer.day}</small> : null}
                </b>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
