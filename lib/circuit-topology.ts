import topologyData from "./circuit-topology.json";

export type CircuitTopology = {
  sourceSeason: number;
  sourceRound: number;
  wikipediaTitle: string;
  mapImage: string;
  imageTitle: string;
  license: string;
  topologyQuality: "high" | "medium" | "low";
  trackLengthM: number;
  turnCount: number;
  turnsPerKm: number;
  totalTurningPerKm: number;
  straightCount: number;
  longestStraightM: number;
  topThreeStraightShare: number;
  complexCount: number;
  multiTurnComplexCount: number;
  chicaneCount: number;
  essesCount: number;
  multiApexTurnCount: number;
  tighteningTurnCount: number;
  straightExposure: number;
  slowRotation: number;
  flowingRotation: number;
  directionChange: number;
  complexity: number;
};

const profiles = topologyData as Record<string, CircuitTopology>;

export function getCircuitTopology(circuitId: string) {
  return profiles[circuitId];
}
