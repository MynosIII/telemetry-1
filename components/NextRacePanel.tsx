import Image from "@/components/ResilientImage";
import Link from "next/link";
import { getCountryCode, getCountryFlagUrl } from "@/lib/circuit-visuals";
import { formatSession, isSessionLive, zonesForRace } from "@/lib/format";
import type { CircuitProfile, ScheduledRace } from "@/lib/types";

export function NextRacePanel({ race, circuit }: { race: ScheduledRace; circuit: CircuitProfile }) {
  const liveSession = race.sessions.find((session) => isSessionLive(session));
  const localLabel = getCountryCode(race.country);
  const zones = zonesForRace(race.country);
  const finished = race.state === "finished";
  const localFlag = getCountryFlagUrl(race.country);

  return (
    <section className="live-race" id="en-vivo" aria-labelledby="live-title">
      <div className="live-visual">
        {circuit.image ? (
          <Image src={circuit.image} alt={`Vista de ${circuit.name}`} fill sizes="(max-width: 900px) 100vw, 50vw" unoptimized />
        ) : <div className="circuit-image-fallback" aria-hidden="true">{race.round.padStart(2, "0")}</div>}
        <div className="live-visual-shade" />
        <div className="live-overlay">
          <p className="eyebrow eyebrow-yellow">{liveSession ? "AHORA" : finished ? "ÚLTIMA CARRERA CONOCIDA" : "PRÓXIMA CARRERA"}</p>
          <h2 id="live-title">{race.name}</h2>
          <Link className="live-circuit-link" href={`/circuitos/${race.circuitId}#previa`}>{circuit.name} · {circuit.locality} →</Link>
        </div>
      </div>

      <div className="live-console">
        <div className="live-console-head">
          <span><i className={liveSession ? "live-dot" : "next-dot"} />{liveSession ? `${liveSession.label} EN VIVO` : `RONDA ${race.round}`}</span>
          <Link href="/en-vivo">VER FIN DE SEMANA →</Link>
        </div>
        <div className="session-grid session-grid-head" aria-hidden="true" data-zones={zones.length}>
          <span>SESIÓN</span>
          <span className="timezone-column">
            <b>{localLabel}</b>
            {localFlag && <Image src={localFlag} alt="" width={26} height={17} unoptimized />}
          </span>
          {zones.map((zone) => (
            <span className="timezone-column" key={zone.short}>
              <b>{zone.short}</b>
              <Image src={getCountryFlagUrl(zone.country)!} alt="" width={26} height={17} unoptimized />
            </span>
          ))}
        </div>
        {race.sessions.map((session) => {
          const local = formatSession(session, circuit.timezone);
          return (
            <div className={isSessionLive(session) ? "session-grid is-live" : "session-grid"} key={session.key} data-zones={zones.length}>
              <div><strong>{session.label}</strong><span>{local.day} · hora local</span></div>
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
        <div className="circuit-quick-facts">
          <div><span>INAUGURADO</span><strong>{circuit.opened}</strong></div>
          <div><span>VUELTA</span><strong>{circuit.length}</strong></div>
          <div><span>CARRERA</span><strong>{circuit.laps} VUELTAS</strong></div>
        </div>
        <p className="circuit-summary">{circuit.description}</p>
        <Link className="text-link" href={`/circuitos/${race.circuitId}#previa`}>VER PREVIA COMPLETA →</Link>
      </div>
    </section>
  );
}
