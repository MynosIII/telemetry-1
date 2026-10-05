import type { Session } from "./types";

export function sessionDate(session: Session) {
  return new Date(`${session.date}T${session.time}`);
}

export function formatSession(session: Session, timeZone: string) {
  const date = sessionDate(session);
  return {
    day: new Intl.DateTimeFormat("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone
    }).format(date).replaceAll(".", "").toUpperCase(),
    time: new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone
    }).format(date)
  };
}

export const viewerZones = [
  { label: "ARGENTINA", short: "ARG", country: "Argentina", zone: "America/Argentina/Buenos_Aires" },
  { label: "BRASIL", short: "BRA", country: "Brazil", zone: "America/Sao_Paulo" },
  { label: "COLOMBIA", short: "COL", country: "Colombia", zone: "America/Bogota" },
  { label: "MÉXICO", short: "MEX", country: "Mexico", zone: "America/Mexico_City" }
];

/** Viewer columns for a race, dropping the one that would repeat the track's own country. */
export function zonesForRace(country: string) {
  return viewerZones.filter((zone) => zone.country !== country);
}

export function formatRaceDate(date: string, timeZone = "UTC") {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    timeZone
  }).format(new Date(`${date}T12:00:00Z`)).replaceAll(".", "").toUpperCase();
}

export function isSessionLive(session: Session, now = Date.now()) {
  const start = sessionDate(session).getTime();
  const duration = session.key === "race" ? 3 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
  return now >= start && now <= start + duration;
}
