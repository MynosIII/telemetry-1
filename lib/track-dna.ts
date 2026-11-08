import baseline from "./live-model-baseline.json";
import { getCircuitTopology, type CircuitTopology } from "./circuit-topology";

/**
 * Track DNA: each circuit's shape from our topology measurements (the same geometry the v7.6
 * model uses for circuit suitability), ranked against the rest of the calendar, plus the drivers
 * the model says gain the most there.
 */
export type Trait = { key: keyof CircuitTopology; label: string; hint: string; high: string; low: string };

export const traits: Trait[] = [
  { key: "straightExposure", label: "Rectas", hint: "Parte de la vuelta en recta o casi recta.", high: "mucha recta", low: "poca recta" },
  { key: "longestStraightM", label: "Recta más larga", hint: "Metros de la recta más larga.", high: "una recta muy larga", low: "rectas cortas" },
  { key: "slowRotation", label: "Curvas lentas", hint: "Peso del giro en curvas cerradas.", high: "muchas curvas lentas", low: "pocas curvas lentas" },
  { key: "flowingRotation", label: "Curvas rápidas", hint: "Peso del giro en curvas amplias y enlazadas.", high: "muchas curvas rápidas", low: "pocas curvas rápidas" },
  { key: "directionChange", label: "Cambios de dirección", hint: "Frecuencia con que la pista alterna izquierda y derecha.", high: "cambios de dirección constantes", low: "pocos cambios de dirección" },
  { key: "turnsPerKm", label: "Curvas por km", hint: "Densidad de curvas.", high: "curvas muy seguidas", low: "curvas espaciadas" },
  { key: "complexity", label: "Complejidad", hint: "Índice combinado de chicanas, eses y curvas que se cierran.", high: "un trazado muy complejo", low: "un trazado simple" }
];

type Effect = { season: number; effect: number; fitted: boolean };
type BaselineDriver = { name: string; rating: number; lastSeason: number; circuitEffects: Record<string, Effect> };
const drivers = (baseline as { drivers: Record<string, BaselineDriver> }).drivers;

export type TrackDna = {
  circuitId: string;
  topology: CircuitTopology | undefined;
  /** 0–100 position of each trait against the other circuits in the list. */
  percentiles: Partial<Record<keyof CircuitTopology, number>>;
  similar: string[];
  favoured: { driverId: string; name: string; effect: number }[];
  disfavoured: { driverId: string; name: string; effect: number }[];
};

function percentile(values: number[], value: number) {
  if (values.length < 2) return 50;
  const below = values.filter((other) => other < value).length;
  const equal = values.filter((other) => other === value).length - 1;
  return Math.round(((below + equal / 2) / (values.length - 1)) * 100);
}

/**
 * Profiles for the given circuits. `activeDrivers` limits the favoured list to the current grid.
 */
export function trackDna(circuitIds: string[], activeDrivers: Set<string>): TrackDna[] {
  const known = circuitIds.map((id) => ({ id, topology: getCircuitTopology(id) })).filter((item) => item.topology);
  const columns = new Map(traits.map((trait) => [trait.key, known.map((item) => Number(item.topology![trait.key]))]));
  const stats = new Map(traits.map((trait) => {
    const values = columns.get(trait.key)!;
    const mean = values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
    const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length || 1)) || 1;
    return [trait.key, { mean, sd }];
  }));
  const vector = (topology: CircuitTopology) => traits.map((trait) => {
    const { mean, sd } = stats.get(trait.key)!;
    return (Number(topology[trait.key]) - mean) / sd;
  });

  return circuitIds.map((circuitId) => {
    const topology = getCircuitTopology(circuitId);
    const percentiles: TrackDna["percentiles"] = {};
    let similar: string[] = [];
    if (topology) {
      for (const trait of traits) percentiles[trait.key] = percentile(columns.get(trait.key)!, Number(topology[trait.key]));
      const own = vector(topology);
      similar = known
        .filter((item) => item.id !== circuitId)
        .map((item) => ({ id: item.id, distance: Math.hypot(...vector(item.topology!).map((value, index) => value - own[index])) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
        .map((item) => item.id);
    }
    const effects = Object.entries(drivers)
      .filter(([id]) => activeDrivers.has(id))
      .map(([id, driver]) => ({ driverId: id, name: driver.name, effect: driver.circuitEffects[circuitId]?.effect ?? NaN }))
      .filter((row) => Number.isFinite(row.effect))
      .sort((a, b) => b.effect - a.effect);
    return {
      circuitId,
      topology,
      percentiles,
      similar,
      favoured: effects.slice(0, 3).filter((row) => row.effect > 0),
      disfavoured: effects.slice(-2).reverse().filter((row) => row.effect < 0)
    };
  });
}
