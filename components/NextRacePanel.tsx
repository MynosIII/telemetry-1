import Image from "@/components/ResilientImage";
import Link from "next/link";
import { formatSession, isSessionLive } from "@/lib/format";
import type { CircuitProfile, ScheduledRace } from "@/lib/types";

const zones = [
  { label: "ARG", zone: "America/Argentina/Buenos_Aires" },
  { label: "BRA", zone: "America/Sao_Paulo" },
  { label: "COL", zone: "America/Bogota" },
  { label: "MEX", zone: "America/Mexico_City" }
];

export function NextRacePanel({ race, circuit }: { race: ScheduledRace; circuit: CircuitProfile }) {
  const liveSession = race.sessions.find((session) => isSessionLive(session));
  const localLabel = race.country.toUpperCase().slice(0, 3);

  return (
    <section className="live-race" id="en-vivo" aria-labelledby="live-title">
      <div className="live-visual">
        {circuit.image ? (
          <Image src={circuit.image} alt={`Vista de ${circuit.name}`} fill sizes="(max-width: 900px) 100vw, 50vw" unoptimized />
        ) : <div className="circuit-image-fallback" aria-hidden="true">{race.round.padStart(2, "0")}</div>}
        <div className="live-visual-shade" />
        <div className="live-overlay">
          <p className="eyebrow eyebrow-yellow">{liveSession ? "AHORA" : "PRÓXIMA CARRERA"}</p>
          <h2 id="live-title">{race.name}</h2>
          <p>{circuit.name} · {circuit.locality}</p>
        </div>
      </div>

      <div className="live-console">
        <div className="live-console-head">
          <span><i className={liveSession ? "live-dot" : "next-dot"} />{liveSession ? `${liveSession.label} EN VIVO` : `RONDA ${race.round}`}</span>
          <Link href="/en-vivo">VER FIN DE SEMANA →</Link>
        </div>
        <div className="session-grid session-grid-head" aria-hidden="true">
          <span>SESIÓN</span>
          <span>{localLabel}</span>
          {zones.map((zone) => <span key={zone.label}>{zone.label}</span>)}
        </div>
        {race.sessions.map((session) => {
          const local = formatSession(session, circuit.timezone);
          return (
            <div className={isSessionLive(session) ? "session-grid is-live" : "session-grid"} key={session.key}>
              <div><strong>{session.label}</strong><span>{local.day}</span></div>
              <b>{local.time}</b>
              {zones.map((zone) => <b key={zone.label}>{formatSession(session, zone.zone).time}</b>)}
            </div>
          );
        })}
        <div className="circuit-quick-facts">
          <div><span>INAUGURADO</span><strong>{circuit.opened}</strong></div>
          <div><span>VUELTA</span><strong>{circuit.length}</strong></div>
          <div><span>CARRERA</span><strong>{circuit.laps} VUELTAS</strong></div>
        </div>
        <p className="circuit-summary">{circuit.description}</p>
        <Link className="text-link" href={`/circuitos/${race.circuitId}`}>CONOCER EL CIRCUITO →</Link>
      </div>
    </section>
  );
}
