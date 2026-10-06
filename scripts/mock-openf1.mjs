#!/usr/bin/env node
/**
 * A small OpenF1 stand-in for local development when api.openf1.org is unreachable.
 * It simulates a qualifying, a finished race (with a rain shower and pit stops) and a race in progress.
 *
 *   node scripts/mock-openf1.mjs            # listens on :4010
 *   OPENF1_BASE_URL=http://localhost:4010 npm run dev
 */
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 4010);
const HZ = 3.7;
const BOOT = Date.now();

// --- Track: a closed curve in OpenF1 units (1 unit ≈ 0.1 m) -----------------------------------
const TRACK = [];
for (let i = 0; i < 2400; i += 1) {
  const a = (i / 2400) * Math.PI * 2;
  TRACK.push({
    x: 9000 * Math.cos(a) + 2200 * Math.cos(3 * a) - 900 * Math.sin(2 * a),
    y: 5200 * Math.sin(a) + 1500 * Math.sin(2 * a) + 500 * Math.cos(5 * a)
  });
}
const cumulative = [0];
for (let i = 1; i <= TRACK.length; i += 1) {
  const a = TRACK[i - 1];
  const b = TRACK[i % TRACK.length];
  cumulative.push(cumulative[i - 1] + Math.hypot(b.x - a.x, b.y - a.y) / 10);
}
const LENGTH = cumulative.at(-1);

function pointAt(distance) {
  const s = ((distance % LENGTH) + LENGTH) % LENGTH;
  let low = 0;
  let high = cumulative.length - 1;
  while (low < high - 1) {
    const mid = (low + high) >> 1;
    if (cumulative[mid] <= s) low = mid; else high = mid;
  }
  const ratio = (s - cumulative[low]) / (cumulative[high] - cumulative[low] || 1);
  const a = TRACK[low % TRACK.length];
  const b = TRACK[high % TRACK.length];
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
}

// Speed profile from curvature, then acceleration and braking limits.
const STEP = 5;
const N = Math.ceil(LENGTH / STEP);
const profile = [];
for (let i = 0; i < N; i += 1) {
  const p0 = pointAt(i * STEP - 15);
  const p1 = pointAt(i * STEP);
  const p2 = pointAt(i * STEP + 15);
  const a = Math.hypot(p1.x - p0.x, p1.y - p0.y) / 10;
  const b = Math.hypot(p2.x - p1.x, p2.y - p1.y) / 10;
  const c = Math.hypot(p2.x - p0.x, p2.y - p0.y) / 10;
  const area = Math.abs((p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y)) / 200;
  const radius = area > 1e-6 ? (a * b * c) / (4 * area) : 1e6;
  profile.push(Math.min(92, Math.sqrt(38 * radius)));
}
for (let pass = 0; pass < 2; pass += 1) {
  for (let i = 1; i < N * 2; i += 1) {
    const k = i % N; const prev = (i - 1) % N;
    profile[k] = Math.min(profile[k], Math.sqrt(profile[prev] ** 2 + 2 * 11 * STEP));
  }
  for (let i = N * 2; i > 0; i -= 1) {
    const k = i % N; const next = (i + 1) % N;
    profile[k] = Math.min(profile[k], Math.sqrt(profile[next] ** 2 + 2 * 45 * STEP));
  }
}
const speedAt = (distance) => profile[Math.floor((((distance % LENGTH) + LENGTH) % LENGTH) / STEP) % N];
const accelerating = (distance) => speedAt(distance + 20) >= speedAt(distance) - 0.2;

// --- Drivers -------------------------------------------------------------------------------------
const DRIVERS = [
  [1, "VER", "Max Verstappen", "Red Bull Racing", "3671C6"], [22, "TSU", "Yuki Tsunoda", "Red Bull Racing", "3671C6"],
  [4, "NOR", "Lando Norris", "McLaren", "FF8000"], [81, "PIA", "Oscar Piastri", "McLaren", "FF8000"],
  [16, "LEC", "Charles Leclerc", "Ferrari", "E80020"], [44, "HAM", "Lewis Hamilton", "Ferrari", "E80020"],
  [63, "RUS", "George Russell", "Mercedes", "27F4D2"], [12, "ANT", "Kimi Antonelli", "Mercedes", "27F4D2"],
  [14, "ALO", "Fernando Alonso", "Aston Martin", "229971"], [18, "STR", "Lance Stroll", "Aston Martin", "229971"],
  [10, "GAS", "Pierre Gasly", "Alpine", "0093CC"], [43, "COL", "Franco Colapinto", "Alpine", "0093CC"],
  [23, "ALB", "Alexander Albon", "Williams", "64C4FF"], [55, "SAI", "Carlos Sainz", "Williams", "64C4FF"],
  [30, "LAW", "Liam Lawson", "Racing Bulls", "6692FF"], [6, "HAD", "Isack Hadjar", "Racing Bulls", "6692FF"],
  [27, "HUL", "Nico Hulkenberg", "Kick Sauber", "52E252"], [5, "BOR", "Gabriel Bortoleto", "Kick Sauber", "52E252"],
  [31, "OCO", "Esteban Ocon", "Haas F1 Team", "B6BABD"], [87, "BEA", "Oliver Bearman", "Haas F1 Team", "B6BABD"]
];

let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// --- Session simulation --------------------------------------------------------------------------
function simulate({ key, start, laps, qualifying, rain }) {
  const carData = []; const location = []; const lapRows = []; const stints = []; const pits = [];
  const traces = new Map();
  DRIVERS.forEach(([number], index) => {
    const pace = 1 - index * 0.0016 - random() * 0.004;
    const pitLap = qualifying ? null : Math.floor(laps * (0.4 + random() * 0.25));
    let t = start + (qualifying ? index * 9000 : index * 250);
    let distance = qualifying ? -800 : -index * 8;
    let lap = 1;
    let lapStart = t;
    let sectorMarks = [];
    const trace = [];
    const lapOf = [];
    let pitRemaining = 0;
    while (lap <= laps) {
      const wet = rain && t > rain[0] && t < rain[1] ? 0.86 : 1;
      const cooling = qualifying && lap % 2 === 0 ? 0.7 : 1;
      const wear = pitLap ? 1 - 0.0012 * ((lap > pitLap ? lap - pitLap : lap)) : 1;
      let v = speedAt(distance) * pace * wet * cooling * wear * (0.995 + random() * 0.01);
      if (pitRemaining > 0) { v = 0; pitRemaining -= 1 / HZ; }
      const p = pointAt(distance);
      const kmh = v * 3.6;
      const gear = kmh < 5 ? 0 : Math.min(8, 1 + Math.floor(kmh / 42));
      const date = new Date(t).toISOString();
      const acc = accelerating(distance);
      const drs = !qualifying && lap > 2 && kmh > 285 && acc ? 12 : kmh > 285 ? 8 : 1;
      carData.push({ date, session_key: key, driver_number: DRIVERS[index][0], speed: Math.round(kmh), rpm: gear ? Math.round(7600 + ((kmh % 42) / 42) * 4200) : 4000, n_gear: gear, throttle: v === 0 ? 0 : acc ? 100 : Math.round(random() * 8), brake: acc || v === 0 ? 0 : 100, drs });
      location.push({ date, session_key: key, driver_number: DRIVERS[index][0], x: Math.round(p.x), y: Math.round(p.y), z: 0 });
      trace.push({ t, distance: distance + (lap - 1) * 0 });
      lapOf.push(lap);
      t += 1000 / HZ;
      const before = distance;
      distance += v / HZ;
      if (Math.floor(before / (LENGTH / 3)) !== Math.floor(distance / (LENGTH / 3)) && distance > 0) sectorMarks.push(t);
      if (distance >= LENGTH) {
        distance -= LENGTH;
        const duration = (t - lapStart) / 1000;
        const marks = [lapStart, ...sectorMarks.slice(0, 2), t];
        lapRows.push({
          session_key: key, driver_number: number, lap_number: lap, date_start: new Date(lapStart).toISOString(),
          lap_duration: lap === 1 && !qualifying ? null : Number(duration.toFixed(3)),
          duration_sector_1: Number(((marks[1] - marks[0]) / 1000).toFixed(3)),
          duration_sector_2: Number(((marks[2] - marks[1]) / 1000).toFixed(3)),
          duration_sector_3: Number(((marks[3] - marks[2]) / 1000).toFixed(3)),
          is_pit_out_lap: (qualifying && lap === 1) || lap === (pitLap ?? -1) + 1,
          st_speed: Math.round(300 + random() * 30)
        });
        if (lap === pitLap) {
          pitRemaining = 2.6 + random();
          pits.push({ session_key: key, driver_number: number, lap_number: lap, date: new Date(t).toISOString(), pit_duration: Number((20 + random() * 3).toFixed(1)) });
        }
        lap += 1;
        lapStart = t;
        sectorMarks = [];
      }
    }
    traces.set(number, { trace, lapOf });
    if (qualifying) stints.push({ session_key: key, driver_number: number, stint_number: 1, compound: "SOFT", lap_start: 1, lap_end: laps, tyre_age_at_start: 0 });
    else {
      const wetCompound = rain ? "INTERMEDIATE" : "HARD";
      stints.push({ session_key: key, driver_number: number, stint_number: 1, compound: index % 3 ? "MEDIUM" : "SOFT", lap_start: 1, lap_end: pitLap, tyre_age_at_start: index % 4 ? 0 : 3 });
      stints.push({ session_key: key, driver_number: number, stint_number: 2, compound: wetCompound, lap_start: pitLap + 1, lap_end: laps, tyre_age_at_start: 0 });
    }
  });

  // Positions and intervals every 4 s from race distance.
  const position = []; const intervals = [];
  if (!qualifying) {
    const end = Math.max(...lapRows.map((row) => Date.parse(row.date_start) + (row.lap_duration ?? 90) * 1000));
    let last = new Map();
    for (let t = start; t <= end; t += 4000) {
      const progress = DRIVERS.map(([number]) => {
        const { trace, lapOf } = traces.get(number);
        let i = trace.findIndex((sample) => sample.t > t);
        if (i < 0) i = trace.length; i = Math.max(0, i - 1);
        const lapsDone = lapOf[i] - 1;
        const d = lapsDone * LENGTH + Math.max(0, cumulativeDistance(trace, i));
        return { number, d, t };
      }).sort((a, b) => b.d - a.d);
      progress.forEach((item, index) => {
        const date = new Date(t).toISOString();
        if (last.get(item.number) !== index + 1) position.push({ session_key: key, driver_number: item.number, date, position: index + 1 });
        last.set(item.number, index + 1);
        const leader = progress[0];
        const ahead = progress[index - 1];
        const gap = index === 0 ? null : (leader.d - item.d) / 70;
        intervals.push({ session_key: key, driver_number: item.number, date, gap_to_leader: gap === null ? 0 : gap > 90 ? "+1 LAP" : Number(gap.toFixed(3)), interval: index === 0 ? 0 : Number(((ahead.d - item.d) / 70).toFixed(3)) });
      });
    }
  }
  return { carData, location, laps: lapRows, stints, pits, position, intervals };
}

function cumulativeDistance(trace, i) {
  // Distance within the current lap, recomputed from samples (cheap enough for the mock).
  return trace[i]?.distance ?? 0;
}

function weatherFor(key, start, minutes, rain) {
  return Array.from({ length: minutes }, (_, i) => {
    const t = start + i * 60_000;
    const wet = rain && t > rain[0] - 120_000 && t < rain[1];
    return { session_key: key, date: new Date(t).toISOString(), air_temperature: Number((24 - (wet ? 4 : 0) + Math.sin(i / 12)).toFixed(1)), track_temperature: Number((41 - (wet ? 15 : 0) + Math.sin(i / 9) * 2).toFixed(1)), humidity: wet ? 88 : 54, pressure: 1012, rainfall: wet ? 1 : 0, wind_direction: 200, wind_speed: Number((2.4 + Math.sin(i / 7)).toFixed(1)) };
  });
}

// Each session: the finished race 2025 and 2026, a qualifying, and a race in progress.
const raceStart = Date.parse("2026-09-20T13:00:00Z");
const qualyStart = Date.parse("2026-09-19T14:00:00Z");
const liveStart = BOOT - 6 * 60_000;
const rainWindow = [raceStart + 9 * 60_000, raceStart + 16 * 60_000];
const MEETINGS = [
  { meeting_key: 1300, meeting_name: "Gran Premio de Prueba", country_name: "Argentina", country_code: "ARG", location: "Buenos Aires", year: 2026, date_start: "2026-09-18T10:00:00Z" },
  { meeting_key: 1301, meeting_name: "Gran Premio en Vivo", country_name: "Argentina", country_code: "ARG", location: "Termas", year: new Date(BOOT).getUTCFullYear(), date_start: new Date(liveStart - 86_400_000).toISOString() }
];
const SESSIONS = [
  { session_key: 9901, meeting_key: 1300, session_name: "Qualifying", session_type: "Qualifying", date_start: new Date(qualyStart).toISOString(), date_end: new Date(qualyStart + 3600_000).toISOString(), circuit_short_name: "Buenos Aires", country_name: "Argentina", country_code: "ARG", location: "Buenos Aires", year: 2026 },
  { session_key: 9902, meeting_key: 1300, session_name: "Race", session_type: "Race", date_start: new Date(raceStart).toISOString(), date_end: new Date(raceStart + 7200_000).toISOString(), circuit_short_name: "Buenos Aires", country_name: "Argentina", country_code: "ARG", location: "Buenos Aires", year: 2026 },
  { session_key: 9903, meeting_key: 1301, session_name: "Race", session_type: "Race", date_start: new Date(liveStart).toISOString(), date_end: new Date(liveStart + 7200_000).toISOString(), circuit_short_name: "Termas", country_name: "Argentina", country_code: "ARG", location: "Termas", year: new Date(BOOT).getUTCFullYear() }
];

console.log("Simulating sessions…");
const DATA = {
  9901: simulate({ key: 9901, start: qualyStart, laps: 5, qualifying: true }),
  9902: simulate({ key: 9902, start: raceStart, laps: 18, rain: rainWindow }),
  9903: simulate({ key: 9903, start: liveStart, laps: 18 })
};
DATA[9901].weather = weatherFor(9901, qualyStart, 60);
DATA[9902].weather = weatherFor(9902, raceStart, 120, rainWindow);
DATA[9903].weather = weatherFor(9903, liveStart, 120);
DATA[9902].race_control = [
  [0, "GREEN", "GREEN LIGHT - PIT EXIT OPEN", "Flag"],
  [3, null, "DRS ENABLED", "Drs"],
  [8, "YELLOW", "YELLOW IN TRACK SECTOR 7", "Flag"],
  [8.5, "CLEAR", "CLEAR IN TRACK SECTOR 7", "Flag"],
  [9.5, null, "RISK OF RAIN FOR F1 RACE IS 80%", "Other"],
  [12, null, "SAFETY CAR DEPLOYED", "SafetyCar"],
  [15, null, "SAFETY CAR IN THIS LAP", "SafetyCar"],
  [26, "CHEQUERED", "CHEQUERED FLAG", "Flag"]
].map(([minutes, flag, message, category]) => ({ session_key: 9902, date: new Date(raceStart + minutes * 60_000).toISOString(), flag, message, category, scope: "Track", lap_number: null, driver_number: null, sector: null }));
DATA[9903].race_control = [{ session_key: 9903, date: new Date(liveStart).toISOString(), flag: "GREEN", message: "GREEN LIGHT - PIT EXIT OPEN", category: "Flag", scope: "Track" }];
DATA[9901].race_control = [{ session_key: 9901, date: new Date(qualyStart).toISOString(), flag: "GREEN", message: "GREEN LIGHT - PIT EXIT OPEN", category: "Flag", scope: "Track" }];
for (const data of Object.values(DATA)) data.drivers = DRIVERS.map(([number, acronym, name, team, colour]) => ({ driver_number: number, name_acronym: acronym, full_name: name, broadcast_name: name.toUpperCase(), team_name: team, team_colour: colour }));
console.log("Ready.");

function parseFilters(search) {
  return search.replace(/^\?/, "").split("&").filter(Boolean).map((part) => {
    const decoded = decodeURIComponent(part);
    const match = decoded.match(/^([a-z_]+)(>=|<=|>|<|=)(.*)$/);
    return match ? { key: match[1], op: match[2], value: match[3] } : null;
  }).filter(Boolean);
}

function matches(row, filters) {
  return filters.every(({ key, op, value }) => {
    if (key === "session_key" && value === "latest") return row.session_key === SESSIONS.at(-1).session_key;
    const field = row[key];
    if (field === undefined) return true;
    const isDate = key.startsWith("date");
    const a = isDate ? Date.parse(field) : typeof field === "number" ? field : String(field);
    const b = isDate ? Date.parse(value) : typeof field === "number" ? Number(value) : value;
    if (op === "=") return a === b;
    if (op === ">=") return a >= b;
    if (op === "<=") return a <= b;
    if (op === ">") return a > b;
    return a < b;
  });
}

const TABLES = { car_data: "carData", location: "location", laps: "laps", stints: "stints", pit: "pits", position: "position", intervals: "intervals", weather: "weather", race_control: "race_control", drivers: "drivers" };

createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const table = url.pathname.replace(/^\/v1\//, "");
  const filters = parseFilters(url.search);
  let rows;
  if (table === "sessions") rows = SESSIONS.filter((row) => matches(row, filters));
  else if (table === "meetings") rows = MEETINGS.filter((row) => matches(row, filters));
  else if (TABLES[table]) {
    const keyFilter = filters.find((filter) => filter.key === "session_key");
    const key = keyFilter?.value === "latest" ? SESSIONS.at(-1).session_key : Number(keyFilter?.value);
    const source = DATA[key]?.[TABLES[table]] ?? [];
    // The live session only has what has happened so far.
    const now = Date.now();
    rows = source.filter((row) => matches(row, filters) && (key !== 9903 || !(row.date ?? row.date_start) || Date.parse(row.date ?? row.date_start) <= now));
    if (key === 9903 && table === "laps") rows = rows.map((row) => Date.parse(row.date_start) + (row.lap_duration ?? 0) * 1000 > now ? { ...row, lap_duration: null } : row);
  } else {
    response.writeHead(404).end(JSON.stringify({ detail: "Not found" }));
    return;
  }
  response.writeHead(rows.length ? 200 : 404, { "Content-Type": "application/json" });
  response.end(JSON.stringify(rows.length ? rows : { detail: "No results found." }));
}).listen(PORT, () => console.log(`Mock OpenF1 on http://localhost:${PORT}/v1`));
