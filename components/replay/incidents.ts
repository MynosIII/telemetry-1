import type { ReplayTimeline } from "@/lib/replay";

export type IncidentKind = "investigation" | "noted" | "penalty" | "reprimand" | "cleared" | "warning" | "deleted";

export type Incident = {
  at: number;
  lap: number | null;
  kind: IncidentKind;
  label: string;
  drivers: number[];
  summary: string;
  message: string;
};

const KIND_LABELS: Record<IncidentKind, string> = {
  investigation: "Investigación",
  noted: "Anotado",
  penalty: "Sanción",
  reprimand: "Reprimenda",
  cleared: "Sin acción",
  warning: "Advertencia",
  deleted: "Vuelta borrada"
};

const REASONS: [RegExp, string][] = [
  [/CAUSING A COLLISION/, "provocar una colisión"],
  [/LEAVING THE TRACK AND GAINING (AN|A LASTING) ADVANTAGE/, "salir de pista y ganar ventaja"],
  [/FORCING ANOTHER DRIVER OFF THE TRACK/, "sacar a otro piloto de la pista"],
  [/SPEEDING IN THE PIT LANE/, "exceso de velocidad en boxes"],
  [/UNSAFE RELEASE/, "liberación insegura"],
  [/TRACK LIMITS/, "límites de pista"],
  [/IMPEDING/, "obstaculizar"],
  [/FALSE START|JUMP START/, "largada anticipada"],
  [/OVERTAKING UNDER (SAFETY CAR|SC)/, "adelantar con safety car"],
  [/OVERTAKING UNDER (VSC|VIRTUAL SAFETY CAR)/, "adelantar con safety car virtual"],
  [/YELLOW FLAG/, "no respetar bandera amarilla"],
  [/RED FLAG/, "no respetar bandera roja"],
  [/PIT ENTRY|PIT EXIT/, "infracción en la entrada o salida de boxes"],
  [/WRONG POSITION|GRID POSITION/, "posición incorrecta en la grilla"],
  [/BLUE FLAGS?/, "ignorar banderas azules"],
  [/UNSAFE|DANGEROUS/, "conducción peligrosa"],
  [/MORE THAN ONE CHANGE OF DIRECTION/, "más de un cambio de dirección"],
  [/SAFETY CAR (LINE|DELTA)|EXCEEDING .*DELTA/, "infringir el delta del safety car"]
];

function penaltyText(message: string) {
  const time = message.match(/(\d+) SECOND (TIME|STOP\/GO) PENALTY/);
  if (time) return time[2] === "TIME" ? `${time[1]} s de penalización` : `Stop and go de ${time[1]} s`;
  if (/DRIVE THROUGH/.test(message)) return "Drive through";
  const grid = message.match(/(\d+) PLACE GRID PENALTY/);
  if (grid) return `${grid[1]} puestos de grilla`;
  if (/DISQUALIFIED/.test(message)) return "Descalificado";
  return "Sanción";
}

function classify(message: string): IncidentKind | null {
  if (/DELETED/.test(message) && /TRACK LIMITS|LAP|TIME/.test(message)) return "deleted";
  if (/BLACK AND WHITE/.test(message)) return "warning";
  if (/REPRIMAND/.test(message)) return "reprimand";
  if (/NO FURTHER (ACTION|INVESTIGATION)|NO INVESTIGATION NECESSARY/.test(message)) return "cleared";
  if (/PENALTY|DISQUALIFIED/.test(message) && !/PENALTY SERVED/.test(message)) return "penalty";
  if (/UNDER INVESTIGATION|WILL BE INVESTIGATED/.test(message)) return "investigation";
  if (/\bNOTED\b/.test(message)) return "noted";
  return null;
}

/** Steward decisions, investigations and track-limit deletions from race control, oldest first. */
export function incidentsFrom(messages: ReplayTimeline["raceControl"]): Incident[] {
  return messages.flatMap((item) => {
    const message = item.message.toUpperCase();
    const kind = classify(message);
    if (!kind) return [];
    const drivers = [...message.matchAll(/(?:CARS?|AND|,)\s+(\d{1,2})\s+\([A-Z]{3}\)/g)].map((match) => Number(match[1]));
    if (!drivers.length && item.driver !== null) drivers.push(item.driver);
    const reason = REASONS.find(([pattern]) => pattern.test(message))?.[1];
    let summary: string;
    if (kind === "penalty") summary = reason ? `${penaltyText(message)} por ${reason}` : penaltyText(message);
    else if (kind === "deleted") summary = /LAP DELETED|TIME .* DELETED/.test(message) ? "Tiempo borrado por límites de pista" : "Vuelta borrada";
    else if (kind === "warning") summary = reason ? `Bandera blanca y negra por ${reason}` : "Bandera blanca y negra";
    else if (reason) summary = reason[0].toUpperCase() + reason.slice(1);
    else if (kind === "cleared") summary = "Revisado, sin más investigación";
    else summary = item.message;
    const lap = item.lap ?? Number(message.match(/\bLAP (\d+)/)?.[1] ?? NaN);
    return [{
      at: item.at,
      lap: Number.isFinite(lap) ? lap : null,
      kind,
      label: KIND_LABELS[kind],
      drivers: [...new Set(drivers)],
      summary,
      message: item.message
    }];
  });
}
