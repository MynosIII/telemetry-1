import updates from "@/data/season/2026-updates.json";
import powerUnits from "@/data/season/2026-power-units.json";

export type UpdateReason = "L" | "F" | "D" | "C" | "CD" | "CB" | "R" | "M" | "S" | "N";
export type CarUpdate = { team: string; component: string; reason: UpdateReason; description: string };
export type UpdateEvent = { id: string; gp: string; circuitId: string; url: string; updates: CarUpdate[] };

export const reasonLabels: Record<UpdateReason, string> = {
  L: "Rendimiento: carga",
  F: "Rendimiento: flujo",
  D: "Rendimiento: menos drag",
  C: "Circuito: refrigeración",
  CD: "Circuito: carga y drag",
  CB: "Circuito: balance",
  R: "Fiabilidad",
  M: "Puesta a punto mecánica",
  S: "Estructural",
  N: "Sin especificar"
};

/** Families of reasons, for the season summary. */
export const reasonGroups: { label: string; reasons: UpdateReason[] }[] = [
  { label: "Rendimiento", reasons: ["L", "F", "D"] },
  { label: "Específicas del circuito", reasons: ["C", "CD", "CB", "M"] },
  { label: "Fiabilidad y otras", reasons: ["R", "S", "N"] }
];

const raw = updates as unknown as { season: number; source: string; sourceUrl: string; events: { id: string; gp: string; circuitId: string; file: string; updates: [string, string, string, string][] }[] };

export const updateSeason = {
  season: raw.season,
  source: raw.source,
  sourceUrl: raw.sourceUrl,
  events: raw.events.map((event): UpdateEvent => ({
    id: event.id,
    gp: event.gp,
    circuitId: event.circuitId,
    url: `https://www.fia.com/system/files/decision-document/${event.file}`,
    updates: event.updates.map(([team, component, reason, description]) => ({ team, component, reason: reason as UpdateReason, description }))
  }))
};

// FIA component names, in the order they should be tried (longest phrases first).
const componentNames: [RegExp, string][] = [
  [/front wing endplate/i, "Endplate del alerón delantero"],
  [/rear wing endplate/i, "Endplate del alerón trasero"],
  [/front wing flap/i, "Flap del alerón delantero"],
  [/rear wing flap/i, "Flap del alerón trasero"],
  [/front wing/i, "Alerón delantero"],
  [/rear wing/i, "Alerón trasero"],
  [/beam wing|rear brace wing/i, "Beam wing"],
  [/diffuser fence|floor fence/i, "Fences del piso"],
  [/floor edge.*diffuser|diffuser.*rear crash|floor body.*diffuser|floor body \/ diffuser/i, "Piso y difusor"],
  [/diffuser vane|diffuser winglet|floor diffuser winglet/i, "Winglet del difusor"],
  [/diffuser/i, "Difusor"],
  [/floor board stay/i, "Soporte del board del piso"],
  [/floor ?board|forward floorboard|front floor/i, "Board del piso"],
  [/floor edge/i, "Borde del piso"],
  [/floor bib/i, "Bib del piso"],
  [/floor leading edge/i, "Borde de ataque del piso"],
  [/floor corner/i, "Esquina del piso"],
  [/floor furniture/i, "Elementos del piso"],
  [/floor/i, "Piso"],
  [/front corner|front drum/i, "Esquina delantera"],
  [/rear corner|rear wheel/i, "Esquina trasera"],
  [/front suspension/i, "Suspensión delantera"],
  [/rear suspension/i, "Suspensión trasera"],
  [/sidepod inlet/i, "Toma del pontón"],
  [/sidepod/i, "Pontón"],
  [/cooling louvres/i, "Branquias de refrigeración"],
  [/coke|engine cover|bodywork/i, "Cubierta del motor"],
  [/exhaust|tailpipe/i, "Escape"],
  [/rear impact structure|ris fairings|rv tail|rear tail|^tail$/i, "Estructura trasera"],
  [/roll hoop/i, "Roll hoop"],
  [/mirror/i, "Espejos"],
  [/halo/i, "Halo"],
  [/nose/i, "Nariz"]
];

export function componentLabel(component: string) {
  return componentNames.find(([pattern]) => pattern.test(component))?.[1] ?? component;
}

export type PowerUnitDriver = { number: number; name: string; team: string; manufacturer: string; used: number[] };
export const powerUnitSeason = powerUnits as {
  season: number;
  upTo: string;
  date: string;
  source: string;
  sourceUrl: string;
  elements: string[];
  allocation: Record<string, number>;
  drivers: PowerUnitDriver[];
};

export const elementLabels: Record<string, string> = {
  ICE: "Motor de combustión",
  TC: "Turbo",
  EXH: "Escapes",
  "MGU-K": "MGU-K",
  ES: "Batería",
  "PU-CE": "Electrónica de control",
  "PU-ANC": "Auxiliares"
};
