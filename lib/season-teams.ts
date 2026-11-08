/** The 2026 grid: names and livery colours keyed by our own short ids. */
export type SeasonTeam = { id: string; name: string; color: string };

export const seasonTeams: SeasonTeam[] = [
  { id: "mercedes", name: "Mercedes", color: "#27f4d2" },
  { id: "ferrari", name: "Ferrari", color: "#e8002d" },
  { id: "mclaren", name: "McLaren", color: "#ff8000" },
  { id: "red_bull", name: "Red Bull", color: "#3671c6" },
  { id: "aston_martin", name: "Aston Martin", color: "#229971" },
  { id: "williams", name: "Williams", color: "#1868db" },
  { id: "rb", name: "Racing Bulls", color: "#6692ff" },
  { id: "alpine", name: "Alpine", color: "#ff87bc" },
  { id: "haas", name: "Haas", color: "#b6babd" },
  { id: "audi", name: "Audi", color: "#bb0a30" },
  { id: "cadillac", name: "Cadillac", color: "#c9a34d" }
];

const byId = new Map(seasonTeams.map((team) => [team.id, team]));

const aliases: [RegExp, string][] = [
  [/mercedes/i, "mercedes"],
  [/ferrari/i, "ferrari"],
  [/mclaren/i, "mclaren"],
  [/racing bulls|visa cash app|^rb\b|alphatauri|toro rosso/i, "rb"],
  [/red ?bull/i, "red_bull"],
  [/aston/i, "aston_martin"],
  [/williams/i, "williams"],
  [/alpine/i, "alpine"],
  [/haas/i, "haas"],
  [/audi|sauber/i, "audi"],
  [/cadillac/i, "cadillac"]
];

/** Our id for a team, from a Jolpica constructorId or any team name OpenF1 or the FIA uses. */
export function seasonTeamId(nameOrId: string): string {
  if (byId.has(nameOrId)) return nameOrId;
  // Jolpica ids such as "red_bull" and names such as "Red Bull Racing" both land here.
  const plain = nameOrId.replace(/_/g, " ");
  return aliases.find(([pattern]) => pattern.test(plain))?.[1] ?? nameOrId;
}

export function seasonTeam(nameOrId: string): SeasonTeam {
  const id = seasonTeamId(nameOrId);
  return byId.get(id) ?? { id, name: nameOrId, color: "#8a8a8a" };
}

/** Order teams follow when nothing better is known (the order above). */
export const teamOrder = (id: string) => {
  const index = seasonTeams.findIndex((team) => team.id === id);
  return index === -1 ? seasonTeams.length : index;
};
