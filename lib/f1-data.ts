import { cache } from "react";
import type {
  CircuitFacts,
  CircuitProfile,
  DriverLaps,
  DriverProfile,
  F1HomeData,
  RaceDetail,
  RaceResult,
  ScheduledRace,
  Session,
  Standing,
  TelemetryProfile
} from "./types";

const API_ROOT = "https://api.jolpi.ca/ergast/f1";
const IMAGE_CATALOG =
  "https://f1-telemetry-games.vercel.app/shared/driver_images.json";
const IMAGE_REPO_ROOT =
  "https://f1-telemetry-games.vercel.app/";
const TELEMETRY_PROFILE_ROOT =
  "https://raw.githubusercontent.com/MynosIII/TelemetryOne/main/public/drivers";

type JsonObject = Record<string, any>;

const fallbackImages: Record<string, string> = {
  "Andrea Kimi Antonelli":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Kimi%20Antonelli%20at%20the%20Melbourne%20Walk%20during%20the%202026%20Australian%20Grand%20Prix%20%28028A7923%29%20cropped.jpg?width=600",
  "Charles Leclerc":
    "https://commons.wikimedia.org/wiki/Special:FilePath/2024-08-25%20Motorsport%2C%20Formel%201%2C%20Gro%C3%9Fer%20Preis%20der%20Niederlande%202024%20STP%203978%20by%20Stepro%20%28cropped2%29.jpg?width=600",
  "Max Verstappen": "https://www.statsf1.com/pilotes/photos/verstapm.png",
  "Lewis Hamilton": "https://www.statsf1.com/pilotes/photos/hamiltol.png",
  "Oscar Piastri":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Oscar%20Piastri%20Spa%20%28cropped%29.jpg?width=600",
  "Lando Norris":
    "https://commons.wikimedia.org/wiki/Special:FilePath/2024-08-25%20Motorsport%2C%20Formel%201%2C%20Gro%C3%9Fer%20Preis%20der%20Niederlande%202024%20STP%204016%20by%20Stepro%20%28cropped%29.jpg?width=600",
  "George Russell":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/KingsLeonSilverstne040724_%2828_of_112%29_%2853838006028%29_%28cropped%29.jpg/960px-KingsLeonSilverstne040724_%2828_of_112%29_%2853838006028%29_%28cropped%29.jpg"
};

export const circuitFacts: Record<string, CircuitFacts> = {
  albert_park: { opened: "1953", length: "5.278 km", laps: "58", character: "Rápido y urbano", timezone: "Australia/Melbourne", description: "Un trazado veloz alrededor del lago Albert Park, con frenadas fuertes y poco margen entre los muros." },
  shanghai: { opened: "2004", length: "5.451 km", laps: "56", character: "Técnico", timezone: "Asia/Shanghai", description: "Su primera curva se cierra sobre sí misma y obliga a equilibrar carga aerodinámica con velocidad final." },
  suzuka: { opened: "1962", length: "5.807 km", laps: "53", character: "Alta carga", timezone: "Asia/Tokyo", description: "El único ocho de la temporada: enlazadas rápidas, cambios de apoyo y una vuelta que premia la precisión." },
  miami: { opened: "2022", length: "5.412 km", laps: "57", character: "Callejero", timezone: "America/New_York", description: "Una vuelta de contrastes alrededor del Hard Rock Stadium, con largas rectas y un sector final muy lento." },
  villeneuve: { opened: "1978", length: "4.361 km", laps: "70", character: "Frenada y tracción", timezone: "America/Toronto", description: "Rectas, chicanas y muros cercanos hacen de Montreal una prueba exigente para frenos y confianza." },
  monaco: { opened: "1929", length: "3.337 km", laps: "78", character: "Callejero", timezone: "Europe/Monaco", description: "La vuelta más estrecha del calendario. Posición de pista, precisión y concentración deciden el fin de semana." },
  catalunya: { opened: "1991", length: "4.657 km", laps: "66", character: "Completo", timezone: "Europe/Madrid", description: "Curvas rápidas, medias y lentas convierten Barcelona en una referencia para medir el equilibrio del auto." },
  red_bull_ring: { opened: "1969", length: "4.318 km", laps: "71", character: "Corto y veloz", timezone: "Europe/Vienna", description: "Pocas curvas, grandes desniveles y frenadas cuesta arriba producen vueltas compactas y diferencias mínimas." },
  silverstone: { opened: "1948", length: "5.891 km", laps: "52", character: "Muy rápido", timezone: "Europe/London", description: "Maggotts, Becketts y Chapel forman una de las secuencias de alta velocidad más exigentes de la Fórmula 1." },
  spa: { opened: "1921", length: "7.004 km", laps: "44", character: "Velocidad y desnivel", timezone: "Europe/Brussels", description: "La vuelta más larga del calendario atraviesa el bosque de las Ardenas y puede reunir varios climas a la vez." },
  hungaroring: { opened: "1986", length: "4.381 km", laps: "70", character: "Revirado", timezone: "Europe/Budapest", description: "Una sucesión casi constante de curvas donde el ritmo y la gestión de neumáticos importan más que la recta." },
  zandvoort: { opened: "1948", length: "4.259 km", laps: "72", character: "Peraltado", timezone: "Europe/Amsterdam", description: "Rápido, estrecho y ondulado entre las dunas, con peraltes que permiten varias líneas de ataque." },
  monza: { opened: "1922", length: "5.793 km", laps: "53", character: "Baja carga", timezone: "Europe/Rome", description: "El Templo de la Velocidad combina largas rectas, frenadas violentas y curvas históricas dentro del parque de Monza." },
  madring: { opened: "2026", length: "5.474 km", laps: "55", character: "Semiurbano", timezone: "Europe/Madrid", description: "El nuevo circuito de Madrid mezcla sectores urbanos con curvas de alta velocidad alrededor de IFEMA." },
  baku: { opened: "2016", length: "6.003 km", laps: "51", character: "Callejero rápido", timezone: "Asia/Baku", description: "Una sección estrecha junto a la ciudad vieja desemboca en una de las rectas más largas del calendario." },
  sepang: { opened: "1999", length: "5.543 km", laps: "56", character: "Ancho y técnico", timezone: "Asia/Kuala_Lumpur", description: "Curvas amplias, calor y humedad elevan la exigencia física y abren varias líneas para adelantar." },
  marina_bay: { opened: "2008", length: "4.940 km", laps: "62", character: "Nocturno", timezone: "Asia/Singapore", description: "Una carrera nocturna entre muros, calor y baches donde la concentración pesa tanto como la velocidad." },
  americas: { opened: "2012", length: "5.513 km", laps: "56", character: "Ondulado", timezone: "America/Chicago", description: "Austin combina una subida pronunciada a la primera curva con enlazadas rápidas y una larga recta trasera." },
  rodriguez: { opened: "1959", length: "4.304 km", laps: "71", character: "Gran altitud", timezone: "America/Mexico_City", description: "La altura de Ciudad de México reduce la carga aerodinámica y convierte el estadio Foro Sol en una tribuna única." },
  interlagos: { opened: "1940", length: "4.309 km", laps: "71", character: "Antihorario", timezone: "America/Sao_Paulo", description: "Un circuito corto y ondulado donde el clima cambia rápido y la subida final castiga motor y neumáticos." },
  vegas: { opened: "2023", length: "6.201 km", laps: "50", character: "Callejero nocturno", timezone: "America/Los_Angeles", description: "Rectas extensas sobre el Strip, bajas temperaturas y frenadas fuertes definen la carrera nocturna de Las Vegas." },
  losail: { opened: "2004", length: "5.419 km", laps: "57", character: "Rápido y fluido", timezone: "Asia/Qatar", description: "Curvas medias y rápidas dominan una pista construida en el desierto, exigente con los neumáticos delanteros." },
  yas_marina: { opened: "2009", length: "5.281 km", laps: "58", character: "Atardecer", timezone: "Asia/Dubai", description: "La temporada termina entre el atardecer y las luces, con sectores de alta velocidad y tracción lenta." }
};

const fallbackCircuitHistory: Record<string, string> = {
  monza: "Construido en 1922 dentro del parque real de Monza, fue el tercer circuito permanente del mundo. Su combinación de rectas extremas y frenadas fuertes le dio el apodo de Templo de la Velocidad y lo convirtió en la sede histórica del Gran Premio de Italia."
};

const fallbackCircuitRecords: Record<string, NonNullable<CircuitProfile["lapRecord"]>> = {
  monza: {
    time: "1:20.901",
    driver: "Lando Norris",
    car: "McLaren MCL39",
    year: "2025",
    averageSpeedKph: 257.8
  }
};

const fallbackRaces: RaceResult[] = [
  {
    round: "12", name: "Dutch Grand Prix", circuitId: "zandvoort", circuit: "Circuit Zandvoort", locality: "Zandvoort", country: "Netherlands", date: "2026-08-23", time: "13:00:00Z",
    results: [
      { driverId: "norris", position: "1", name: "Lando Norris", team: "McLaren", time: "2:04:44.859", points: "25" },
      { driverId: "antonelli", position: "2", name: "Andrea Kimi Antonelli", team: "Mercedes", time: "+11.536", points: "18" },
      { driverId: "russell", position: "3", name: "George Russell", team: "Mercedes", time: "+15.906", points: "15" },
      { driverId: "hamilton", position: "4", name: "Lewis Hamilton", team: "Ferrari", time: "+16.755", points: "12" },
      { driverId: "leclerc", position: "5", name: "Charles Leclerc", team: "Ferrari", time: "+17.258", points: "10" }
    ]
  },
  {
    round: "11", name: "Hungarian Grand Prix", circuitId: "hungaroring", circuit: "Hungaroring", locality: "Mogyoród", country: "Hungary", date: "2026-07-26", time: "13:00:00Z",
    results: [
      { driverId: "norris", position: "1", name: "Lando Norris", team: "McLaren", time: "1:39:56.180", points: "25" },
      { driverId: "max_verstappen", position: "2", name: "Max Verstappen", team: "Red Bull", time: "+15.080", points: "18" },
      { driverId: "antonelli", position: "3", name: "Andrea Kimi Antonelli", team: "Mercedes", time: "+18.728", points: "15" },
      { driverId: "leclerc", position: "4", name: "Charles Leclerc", team: "Ferrari", time: "+23.840", points: "12" },
      { driverId: "hamilton", position: "5", name: "Lewis Hamilton", team: "Ferrari", time: "+24.540", points: "10" }
    ]
  },
  {
    round: "10", name: "Belgian Grand Prix", circuitId: "spa", circuit: "Circuit de Spa-Francorchamps", locality: "Spa", country: "Belgium", date: "2026-07-19", time: "13:00:00Z",
    results: [
      { driverId: "antonelli", position: "1", name: "Andrea Kimi Antonelli", team: "Mercedes", time: "1:24:42.479", points: "25" },
      { driverId: "leclerc", position: "2", name: "Charles Leclerc", team: "Ferrari", time: "+1.952", points: "18" },
      { driverId: "max_verstappen", position: "3", name: "Max Verstappen", team: "Red Bull", time: "+11.586", points: "15" },
      { driverId: "hamilton", position: "4", name: "Lewis Hamilton", team: "Ferrari", time: "+17.245", points: "12" },
      { driverId: "piastri", position: "5", name: "Oscar Piastri", team: "McLaren", time: "+18.988", points: "10" }
    ]
  }
];

const fallbackStandings: Standing[] = [
  { driverId: "antonelli", position: "1", name: "Andrea Kimi Antonelli", team: "Mercedes", points: "242", wins: "3" },
  { driverId: "russell", position: "2", name: "George Russell", team: "Mercedes", points: "183", wins: "1" },
  { driverId: "hamilton", position: "3", name: "Lewis Hamilton", team: "Ferrari", points: "183", wins: "2" },
  { driverId: "norris", position: "4", name: "Lando Norris", team: "McLaren", points: "159", wins: "3" },
  { driverId: "leclerc", position: "5", name: "Charles Leclerc", team: "Ferrari", points: "155", wins: "2" }
];

const fallbackSchedule: ScheduledRace[] = [
  {
    round: "13", season: "2026", name: "Italian Grand Prix", circuitId: "monza", circuit: "Autodromo Nazionale di Monza", locality: "Monza", country: "Italy", date: "2026-09-06", time: "13:00:00Z", state: "next",
    latitude: 45.6156,
    longitude: 9.2811,
    circuitUrl: "https://en.wikipedia.org/wiki/Monza_Circuit",
    sessions: [
      { key: "fp1", label: "Práctica 1", date: "2026-09-04", time: "10:30:00Z" },
      { key: "fp2", label: "Práctica 2", date: "2026-09-04", time: "14:00:00Z" },
      { key: "fp3", label: "Práctica 3", date: "2026-09-05", time: "10:30:00Z" },
      { key: "qualifying", label: "Clasificación", date: "2026-09-05", time: "14:00:00Z" },
      { key: "race", label: "Carrera", date: "2026-09-06", time: "13:00:00Z" }
    ]
  }
];

function normalizeImage(url?: string) {
  if (!url) return undefined;
  if (url.startsWith("shared/")) return `${IMAGE_REPO_ROOT}${url}`;
  return url;
}

async function fetchJson(url: string, revalidate = 1800): Promise<JsonObject> {
  const response = await fetch(url, { next: { revalidate } });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function fetchWikipediaJson(url: string, revalidate = 604800): Promise<JsonObject> {
  const response = await fetch(url, {
    headers: {
      "Api-User-Agent": "TelemetryOne/1.0 (https://github.com/MynosIII/TelemetryOne; circuit profiles)"
    },
    next: { revalidate }
  });
  if (!response.ok) throw new Error(`Wikipedia request failed: ${response.status}`);
  return response.json();
}

export async function getImageCatalog(): Promise<Record<string, string>> {
  try {
    return (await fetchJson(IMAGE_CATALOG, 86400)) as Record<string, string>;
  } catch {
    return fallbackImages;
  }
}

function addImages<T extends { name: string }>(items: T[], catalog: Record<string, string>) {
  return items.map((item) => ({
    ...item,
    image: normalizeImage(catalog[item.name] ?? fallbackImages[item.name])
  }));
}

function parseResults(rawRace: JsonObject, limit = 100): RaceResult {
  return {
    round: rawRace.round,
    name: rawRace.raceName,
    circuitId: rawRace.Circuit?.circuitId ?? "",
    circuit: rawRace.Circuit?.circuitName ?? "Circuito de Fórmula 1",
    locality: rawRace.Circuit?.Location?.locality ?? "",
    country: rawRace.Circuit?.Location?.country ?? "",
    date: rawRace.date,
    time: rawRace.time,
    results: (rawRace.Results ?? []).slice(0, limit).map((result: JsonObject) => ({
      driverId: result.Driver.driverId,
      position: result.position,
      grid: result.grid,
      name: `${result.Driver.givenName} ${result.Driver.familyName}`,
      nationality: result.Driver.nationality,
      team: result.Constructor.name,
      time: result.Time?.time ?? result.status,
      fastestLap: result.FastestLap?.Time?.time,
      points: result.points
    }))
  };
}

function sessionFrom(raw: JsonObject | undefined, key: string, label: string): Session | undefined {
  if (!raw?.date || !raw?.time) return undefined;
  return { key, label, date: raw.date, time: raw.time };
}

function parseSchedule(rawRaces: JsonObject[]): ScheduledRace[] {
  const now = Date.now();
  const nextIndex = rawRaces.findIndex((race) => Date.parse(`${race.date}T${race.time ?? "12:00:00Z"}`) > now);

  return rawRaces.map((race, index) => {
    const sessions = [
      sessionFrom(race.FirstPractice, "fp1", "Práctica 1"),
      sessionFrom(race.SecondPractice, "fp2", "Práctica 2"),
      sessionFrom(race.ThirdPractice, "fp3", "Práctica 3"),
      sessionFrom(race.SprintQualifying, "sprint-qualifying", "Sprint Shootout"),
      sessionFrom(race.Sprint, "sprint", "Sprint"),
      sessionFrom(race.Qualifying, "qualifying", "Clasificación"),
      { key: "race", label: "Carrera", date: race.date, time: race.time ?? "12:00:00Z" }
    ].filter(Boolean) as Session[];

    return {
      round: race.round,
      season: race.season,
      name: race.raceName,
      circuitId: race.Circuit?.circuitId ?? "",
      circuit: race.Circuit?.circuitName ?? "Circuito de Fórmula 1",
      locality: race.Circuit?.Location?.locality ?? "",
      country: race.Circuit?.Location?.country ?? "",
      latitude: Number.isFinite(Number(race.Circuit?.Location?.lat)) ? Number(race.Circuit.Location.lat) : undefined,
      longitude: Number.isFinite(Number(race.Circuit?.Location?.long)) ? Number(race.Circuit.Location.long) : undefined,
      date: race.date,
      time: race.time ?? "12:00:00Z",
      url: race.url,
      circuitUrl: race.Circuit?.url,
      sessions,
      state: index < nextIndex || nextIndex === -1 ? "finished" : index === nextIndex ? "next" : "upcoming"
    };
  });
}

function parseStandings(raw: JsonObject[], catalog: Record<string, string>): Standing[] {
  return addImages(raw.map((entry) => ({
    driverId: entry.Driver.driverId,
    position: entry.position,
    name: `${entry.Driver.givenName} ${entry.Driver.familyName}`,
    nationality: entry.Driver.nationality,
    team: entry.Constructors[0]?.name ?? "",
    points: entry.points,
    wins: entry.wins
  })), catalog);
}

const getSeasonData = cache(async function getSeasonData() {
  const catalogPromise = getImageCatalog();
  try {
    const [scheduleJson, standingsJson, catalog] = await Promise.all([
      fetchJson(`${API_ROOT}/current.json`),
      fetchJson(`${API_ROOT}/current/driverstandings.json?limit=100`),
      catalogPromise
    ]);
    const rawStandings = standingsJson.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
    return {
      schedule: parseSchedule(scheduleJson.MRData.RaceTable.Races),
      standings: parseStandings(rawStandings, catalog),
      catalog,
      live: true
    };
  } catch {
    const catalog = await catalogPromise;
    return {
      schedule: fallbackSchedule,
      standings: addImages(fallbackStandings, catalog),
      catalog,
      live: false
    };
  }
});

function withImages(race: RaceResult, catalog: Record<string, string>): RaceResult {
  return { ...race, results: addImages(race.results, catalog) };
}

function cleanWikipediaText(value?: string) {
  if (!value) return undefined;
  const clean = value
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref\b[^>]*\/>/gi, "")
    .replace(/\{\{(?:flagicon|flag|flagcountry)[^}]*\}\}/gi, "")
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1")
    .replace(/\{\{[^{}|]*\|([^{}|]+)\}\}/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return clean || undefined;
}

function getWikiField(wikitext: string, field: string, suffix: string) {
  const escaped = `${field}${suffix}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = wikitext.match(new RegExp(`^\\|\\s*${escaped}\\s*=\\s*(.+)$`, "im"));
  return match?.[1]?.trim();
}

function parseWikipediaLapRecord(wikitext?: string, length?: string): CircuitProfile["lapRecord"] {
  if (!wikitext) return undefined;
  const records = Array.from(wikitext.matchAll(/^\|\s*record_time(\d*)\s*=\s*(.+)$/gim));
  for (const match of records) {
    const suffix = match[1] ?? "";
    const rawClass = getWikiField(wikitext, "record_class", suffix) ?? "";
    const recordClass = cleanWikipediaText(rawClass)?.toLowerCase() ?? "";
    if (recordClass && !/(formula\s*one|formula\s*1|\bf1\b)/i.test(recordClass)) continue;

    const time = match[2].match(/\b\d{1,2}:\d{2}\.\d{3}\b/)?.[0];
    const driver = cleanWikipediaText(getWikiField(wikitext, "record_driver", suffix));
    if (!time || !driver) continue;

    const car = cleanWikipediaText(getWikiField(wikitext, "record_car", suffix));
    const rawYear = cleanWikipediaText(getWikiField(wikitext, "record_year", suffix));
    const year = rawYear?.match(/\b(?:19|20)\d{2}\b/)?.[0];
    const lengthKm = Number(length?.replace(/[^\d.,]/g, "").replace(",", "."));
    const [minutes, seconds] = time.split(":").map(Number);
    const lapSeconds = minutes * 60 + seconds;
    const averageSpeedKph = Number.isFinite(lengthKm) && lapSeconds > 0
      ? (lengthKm / lapSeconds) * 3600
      : undefined;

    return { time, driver, car, year, averageSpeedKph };
  }
  return undefined;
}

function shortenExtract(extract?: string) {
  if (!extract) return undefined;
  const normalized = extract.replace(/\s+/g, " ").trim();
  const sentences = normalized.match(/[^.!?]+[.!?]+/g)?.slice(0, 2).join(" ").trim();
  const selected = sentences || normalized;
  if (selected.length <= 720) return selected;
  const clipped = selected.slice(0, 717);
  return `${clipped.slice(0, clipped.lastIndexOf(" "))}…`;
}

function lapTimeToSeconds(time?: string) {
  if (!time) return Number.POSITIVE_INFINITY;
  const parts = time.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return Number.POSITIVE_INFINITY;
  return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
}

async function getCircuitLapRecord(circuitId: string, length?: string): Promise<CircuitProfile["lapRecord"]> {
  try {
    const json = await fetchJson(`${API_ROOT}/circuits/${circuitId}/fastest/1/results.json?limit=1000`, 604800);
    const candidates = (json.MRData?.RaceTable?.Races ?? []).flatMap((race: JsonObject) =>
      (race.Results ?? []).map((result: JsonObject) => ({ race, result }))
    ).filter(({ result }: { result: JsonObject }) => result.FastestLap?.Time?.time);
    const fastest = candidates.sort((a: JsonObject, b: JsonObject) =>
      lapTimeToSeconds(a.result.FastestLap.Time.time) - lapTimeToSeconds(b.result.FastestLap.Time.time)
    )[0];
    if (!fastest) return undefined;

    const time = fastest.result.FastestLap.Time.time as string;
    const apiSpeed = Number(fastest.result.FastestLap.AverageSpeed?.speed);
    const lengthKm = Number(length?.replace(/[^\d.,]/g, "").replace(",", "."));
    const calculatedSpeed = Number.isFinite(lengthKm)
      ? (lengthKm / lapTimeToSeconds(time)) * 3600
      : undefined;

    return {
      time,
      driver: `${fastest.result.Driver.givenName} ${fastest.result.Driver.familyName}`,
      car: fastest.result.Constructor?.name,
      year: fastest.race.season,
      averageSpeedKph: Number.isFinite(apiSpeed) && apiSpeed > 0 ? apiSpeed : calculatedSpeed
    };
  } catch {
    return undefined;
  }
}

async function getWikipediaCircuitContext(circuitUrl?: string, length?: string) {
  if (!circuitUrl) return {};
  try {
    const title = decodeURIComponent(new URL(circuitUrl).pathname.split("/wiki/")[1] ?? "");
    const params = new URLSearchParams({
      action: "query",
      prop: "pageimages|extracts|langlinks",
      piprop: "thumbnail",
      pithumbsize: "1600",
      exintro: "1",
      explaintext: "1",
      lllang: "es",
      lllimit: "1",
      redirects: "1",
      format: "json",
      titles: title
    });
    const parseParams = new URLSearchParams({
      action: "parse",
      page: title,
      prop: "wikitext",
      redirects: "1",
      format: "json"
    });
    const [json, parseJson] = await Promise.all([
      fetchWikipediaJson(`https://en.wikipedia.org/w/api.php?${params}`),
      fetchWikipediaJson(`https://en.wikipedia.org/w/api.php?${parseParams}`).catch(() => undefined)
    ]);
    const page = Object.values(json.query?.pages ?? {})[0] as JsonObject | undefined;
    const spanishTitle = page?.langlinks?.[0]?.["*"] as string | undefined;
    let history = shortenExtract(page?.extract as string | undefined);
    let wikipediaUrl = circuitUrl;
    let historySourceLanguage: "es" | "en" = "en";

    if (spanishTitle) {
      const esParams = new URLSearchParams({
        action: "query",
        prop: "extracts",
        exintro: "1",
        explaintext: "1",
        redirects: "1",
        format: "json",
        titles: spanishTitle
      });
      const spanishJson = await fetchWikipediaJson(`https://es.wikipedia.org/w/api.php?${esParams}`).catch(() => undefined);
      const spanishPage = spanishJson
        ? Object.values(spanishJson.query?.pages ?? {})[0] as JsonObject | undefined
        : undefined;
      const spanishExtract = shortenExtract(spanishPage?.extract as string | undefined);
      if (spanishExtract) {
        history = spanishExtract;
        wikipediaUrl = `https://es.wikipedia.org/wiki/${encodeURIComponent(spanishTitle.replace(/ /g, "_"))}`;
        historySourceLanguage = "es";
      }
    }

    return {
      image: page?.thumbnail?.source as string | undefined,
      history,
      wikipediaUrl,
      historySourceLanguage,
      lapRecord: parseWikipediaLapRecord(parseJson?.parse?.wikitext?.["*"], length)
    };
  } catch {
    return { wikipediaUrl: circuitUrl };
  }
}

export async function getCircuitProfile(circuitId: string): Promise<CircuitProfile | undefined> {
  const { schedule } = await getSeasonData();
  const race = schedule.find((item) => item.circuitId === circuitId);
  if (!race) return undefined;
  const facts = circuitFacts[circuitId] ?? {
    opened: "—", length: "—", laps: "—", character: "Fórmula 1", timezone: "UTC",
    description: `${race.circuit} recibe a la Fórmula 1 en ${race.locality}.`
  };
  const [wikipedia, apiLapRecord] = await Promise.all([
    getWikipediaCircuitContext(race.circuitUrl, facts.length),
    getCircuitLapRecord(circuitId, facts.length)
  ]);
  return {
    id: circuitId,
    name: race.circuit,
    locality: race.locality,
    country: race.country,
    latitude: race.latitude,
    longitude: race.longitude,
    ...wikipedia,
    history: wikipedia.history ?? fallbackCircuitHistory[circuitId] ?? facts.description,
    lapRecord: apiLapRecord ?? wikipedia.lapRecord ?? fallbackCircuitRecords[circuitId],
    ...facts
  };
}

export async function getF1HomeData(): Promise<F1HomeData> {
  const seasonPromise = getSeasonData();
  const winnersPromise = fetchJson(`${API_ROOT}/current/results/1.json?limit=100`).catch(() => undefined);
  const [{ schedule, standings, catalog, live }, winnersJson] = await Promise.all([seasonPromise, winnersPromise]);

  let races = fallbackRaces.map((race) => withImages(race, catalog));
  if (winnersJson) {
    try {
      const completed = winnersJson.MRData.RaceTable.Races.slice(-3).reverse();
      const racePayloads = await Promise.all(completed.map((race: JsonObject) =>
        fetchJson(`${API_ROOT}/current/${race.round}/results.json?limit=100`)
      ));
      races = racePayloads.map((payload) => withImages(parseResults(payload.MRData.RaceTable.Races[0], 5), catalog));
    } catch {
      // Keep verified fallback results.
    }
  }

  const nextRace = schedule.find((race) => race.state === "next") ?? fallbackSchedule[0];
  const nextCircuit = await getCircuitProfile(nextRace.circuitId) ?? {
    id: "monza", name: "Autodromo Nazionale di Monza", locality: "Monza", country: "Italy",
    image: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Autodromo_Nazionale_Monza%2C_April_22%2C_2018_SkySat_%28cropped%29.jpg",
    ...circuitFacts.monza
  };

  return { races, standings: standings.slice(0, 20), schedule, nextRace, nextCircuit, updatedAt: new Date().toISOString(), live };
}

export async function getSchedule() {
  return (await getSeasonData()).schedule;
}

export async function getStandings() {
  return (await getSeasonData()).standings;
}

function parseLaps(rawRace: JsonObject, result: RaceResult, catalog: Record<string, string>): DriverLaps[] {
  const byDriver = new Map<string, DriverLaps>();
  for (const lap of rawRace?.Laps ?? []) {
    for (const timing of lap.Timings ?? []) {
      const resultDriver = result.results.find((driver) => driver.driverId === timing.driverId);
      const current: DriverLaps = byDriver.get(timing.driverId) ?? {
        driverId: timing.driverId,
        name: resultDriver?.name ?? timing.driverId,
        image: resultDriver?.image ?? normalizeImage(catalog[resultDriver?.name ?? ""]),
        laps: []
      };
      current.laps.push({ lap: lap.number, position: timing.position, time: timing.time });
      byDriver.set(timing.driverId, current);
    }
  }
  return Array.from(byDriver.values());
}

export async function getRaceDetail(round: string, selectedDriver?: string): Promise<RaceDetail | undefined> {
  const catalogPromise = getImageCatalog();
  try {
    const [resultsJson, catalog] = await Promise.all([
      fetchJson(`${API_ROOT}/current/${round}/results.json?limit=100`),
      catalogPromise
    ]);
    const rawRace = resultsJson.MRData.RaceTable.Races[0];
    if (!rawRace) return undefined;
    const result = withImages(parseResults(rawRace), catalog);
    const driverId = result.results.some((driver) => driver.driverId === selectedDriver)
      ? selectedDriver
      : result.results[0]?.driverId;
    let laps: DriverLaps[] = [];
    if (driverId) {
      try {
        const lapsJson = await fetchJson(`${API_ROOT}/current/${round}/drivers/${driverId}/laps.json?limit=100`);
        laps = parseLaps(lapsJson.MRData?.RaceTable?.Races?.[0], result, catalog);
      } catch {
        // Results remain useful when detailed timing is temporarily unavailable.
      }
    }
    return { ...result, laps };
  } catch {
    const catalog = await catalogPromise;
    const fallback = fallbackRaces.find((race) => race.round === round);
    return fallback ? { ...withImages(fallback, catalog), laps: [] } : undefined;
  }
}

async function getTelemetryProfile(driverId: string): Promise<TelemetryProfile | undefined> {
  try {
    const response = await fetch(`${TELEMETRY_PROFILE_ROOT}/${encodeURIComponent(driverId)}/index.html`, {
      next: { revalidate: 86400 }
    });
    if (!response.ok) return undefined;
    const html = await response.text();
    const match = html.match(/<script id="profile" type="application\/json">([\s\S]*?)<\/script>/);
    return match ? JSON.parse(match[1]) as TelemetryProfile : undefined;
  } catch {
    return undefined;
  }
}

export async function getDriverProfile(driverId: string): Promise<DriverProfile | undefined> {
  const seasonPromise = getSeasonData();
  const resultsPromise = fetchJson(`${API_ROOT}/current/drivers/${encodeURIComponent(driverId)}/results.json?limit=100`).catch(() => undefined);
  const telemetryPromise = getTelemetryProfile(driverId);
  const [{ standings, catalog }, resultsJson, telemetry] = await Promise.all([seasonPromise, resultsPromise, telemetryPromise]);
  const rawRaces = resultsJson?.MRData?.RaceTable?.Races ?? [];
  const firstResult = rawRaces[0]?.Results?.[0];
  const standing = standings.find((item) => item.driverId === driverId);
  const name = standing?.name ?? telemetry?.name ?? (firstResult ? `${firstResult.Driver.givenName} ${firstResult.Driver.familyName}` : undefined);
  if (!name) return undefined;

  return {
    standing,
    identity: {
      driverId,
      name,
      nationality: standing?.nationality ?? firstResult?.Driver?.nationality,
      dateOfBirth: firstResult?.Driver?.dateOfBirth ?? telemetry?.biography?.dateOfBirth,
      permanentNumber: firstResult?.Driver?.permanentNumber,
      code: firstResult?.Driver?.code,
      image: normalizeImage(catalog[name] ?? fallbackImages[name])
    },
    seasonResults: rawRaces.slice().reverse().map((race: JsonObject) => withImages(parseResults(race), catalog)),
    telemetry
  };
}
