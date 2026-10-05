// Teams that raced under several names from the same factory. Each step is one
// identity in the archive, limited to the seasons that belong to this lineage
// (Renault, Sauber and Alfa Romeo also have unrelated stints under the same id).
export type LineageStep = { id: string; from: number; to: number };
export type Lineage = { id: string; name: string; base: string; steps: LineageStep[] };

export const lineages: Lineage[] = [
  { id: "faenza", name: "De Minardi a Racing Bulls", base: "Faenza", steps: [
    { id: "minardi", from: 1985, to: 2005 }, { id: "toro-rosso", from: 2006, to: 2019 },
    { id: "alphatauri", from: 2020, to: 2023 }, { id: "rb", from: 2024, to: 2024 }, { id: "racing-bulls", from: 2025, to: 2025 }
  ] },
  { id: "hinwil", name: "De Sauber a Kick Sauber", base: "Hinwil", steps: [
    { id: "sauber", from: 1993, to: 2005 }, { id: "bmw-sauber", from: 2006, to: 2009 }, { id: "sauber", from: 2010, to: 2018 },
    { id: "alfa-romeo", from: 2019, to: 2023 }, { id: "kick-sauber", from: 2024, to: 2025 }
  ] },
  { id: "brackley", name: "De Tyrrell a Mercedes", base: "Brackley", steps: [
    { id: "tyrrell", from: 1970, to: 1998 }, { id: "bar", from: 1999, to: 2005 }, { id: "honda", from: 2006, to: 2008 },
    { id: "brawn", from: 2009, to: 2009 }, { id: "mercedes", from: 2010, to: 2025 }
  ] },
  { id: "milton-keynes", name: "De Stewart a Red Bull", base: "Milton Keynes", steps: [
    { id: "stewart", from: 1997, to: 1999 }, { id: "jaguar", from: 2000, to: 2004 }, { id: "red-bull", from: 2005, to: 2025 }
  ] },
  { id: "enstone", name: "De Toleman a Alpine", base: "Enstone", steps: [
    { id: "toleman", from: 1981, to: 1985 }, { id: "benetton", from: 1986, to: 2001 }, { id: "renault", from: 2002, to: 2011 },
    { id: "lotus-f1", from: 2012, to: 2015 }, { id: "renault", from: 2016, to: 2020 }, { id: "alpine", from: 2021, to: 2025 }
  ] },
  { id: "silverstone", name: "De Jordan a Aston Martin", base: "Silverstone", steps: [
    { id: "jordan", from: 1991, to: 2005 }, { id: "midland", from: 2006, to: 2006 }, { id: "spyker", from: 2007, to: 2007 },
    { id: "force-india", from: 2008, to: 2018 }, { id: "racing-point", from: 2019, to: 2020 }, { id: "aston-martin", from: 2021, to: 2025 }
  ] },
  { id: "leafield", name: "De Arrows a Footwork y vuelta", base: "Leafield", steps: [
    { id: "arrows", from: 1978, to: 1990 }, { id: "footwork", from: 1991, to: 1996 }, { id: "arrows", from: 1997, to: 2002 }
  ] },
  { id: "magny-cours", name: "De Ligier a Prost", base: "Magny-Cours", steps: [
    { id: "ligier", from: 1976, to: 1996 }, { id: "prost", from: 1997, to: 2001 }
  ] },
  { id: "bicester", name: "De March a Leyton House", base: "Bicester", steps: [
    { id: "march", from: 1970, to: 1989 }, { id: "leyton-house", from: 1990, to: 1991 }, { id: "march", from: 1992, to: 1992 }
  ] },
  { id: "reading", name: "De Frank Williams Racing Cars a Wolf", base: "Reading", steps: [
    { id: "frank-williams-racing-cars", from: 1975, to: 1975 }, { id: "wolf-williams", from: 1976, to: 1976 }, { id: "wolf", from: 1977, to: 1979 }
  ] },
  { id: "banbury", name: "De Virgin a Manor", base: "Banbury", steps: [
    { id: "virgin", from: 2010, to: 2011 }, { id: "marussia", from: 2012, to: 2015 }, { id: "manor", from: 2016, to: 2016 }
  ] },
  { id: "hingham", name: "De Lotus Racing a Caterham", base: "Hingham", steps: [
    { id: "lotus-racing", from: 2010, to: 2011 }, { id: "caterham", from: 2012, to: 2014 }
  ] }
];

/** The lineage a constructor belongs to, if it ever raced under another name. */
export function lineageFor(constructorId: string) {
  return lineages.find(lineage => lineage.steps.some(step => step.id === constructorId));
}

// Livery colours used for name badges and chart segments when no logo file exists.
export const teamColors: Record<string, string> = {
  minardi: "#e3b505", "toro-rosso": "#1e3d8f", alphatauri: "#2b4562", rb: "#6692ff", "racing-bulls": "#4a6bd6",
  sauber: "#1b5fae", "bmw-sauber": "#2c79c8", "alfa-romeo": "#9b0000", "kick-sauber": "#2fb24c",
  tyrrell: "#1f3f8a", bar: "#c9c9c9", honda: "#d2d2d2", brawn: "#c8f05a", mercedes: "#00a19c",
  stewart: "#e8e8e8", jaguar: "#0f5c3a", "red-bull": "#1e2a78",
  toleman: "#2f6fd0", benetton: "#18a35a", renault: "#f5c400", "lotus-f1": "#1d1d1d", alpine: "#2173b8",
  jordan: "#f2c500", midland: "#b51f2b", spyker: "#f07c00", "force-india": "#f59a23", "racing-point": "#f28bb6", "aston-martin": "#0b6b4d",
  arrows: "#e07a1a", footwork: "#e8e8e8", ligier: "#1f4ea8", prost: "#2f5fc2", march: "#e8e8e8", "leyton-house": "#4fc3c8",
  "frank-williams-racing-cars": "#2c2c8a", "wolf-williams": "#2c2c8a", wolf: "#b1252b",
  virgin: "#cc0000", marussia: "#c4122f", manor: "#1f4e99", "lotus-racing": "#0b6b3a", caterham: "#0b6b3a",
  mclaren: "#ff8000", ferrari: "#dc0000", williams: "#1469ff", haas: "#b6babd", lotus: "#0f5f35", brabham: "#1a4f9c"
};
export const teamColor = (id: string) => teamColors[id] ?? "#e10600";
/** Black or white text, whichever reads better on a livery colour. */
export function inkFor(color: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#111" : "#fff";
}
