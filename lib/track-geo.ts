/**
 * Places OpenF1's local x/y plane on the real map.
 *
 * OpenF1 positions are in a circuit-local frame (about 0.1 m per unit) with no published
 * georeference, so we fit the session's track outline onto the circuit's real centre line
 * (bacinger/f1-circuits, MIT) with a similarity transform: rotation, scale and offset.
 */

export type GeoCircuit = { name: string; line: [number, number][] };
export type XY = { x: number; y: number };

/** OpenF1 circuit_short_name → id in public/maps/f1-circuits.json. */
const CIRCUIT_IDS: Record<string, string> = {
  melbourne: "au-1953",
  sakhir: "bh-2002",
  shanghai: "cn-2004",
  catalunya: "es-1991",
  barcelona: "es-1991",
  "monte carlo": "mc-1929",
  monaco: "mc-1929",
  montreal: "ca-1978",
  "le castellet": "fr-1969",
  spielberg: "at-1969",
  silverstone: "gb-1948",
  hockenheim: "de-1932",
  hungaroring: "hu-1986",
  budapest: "hu-1986",
  "spa-francorchamps": "be-1925",
  monza: "it-1922",
  singapore: "sg-2008",
  sochi: "ru-2014",
  suzuka: "jp-1962",
  austin: "us-2012",
  "mexico city": "mx-1962",
  interlagos: "br-1940",
  "sao paulo": "br-1940",
  "yas marina circuit": "ae-2009",
  "yas marina": "ae-2009",
  imola: "it-1953",
  nurburgring: "de-1927",
  portimao: "pt-2008",
  mugello: "it-1914",
  sepang: "my-1999",
  istanbul: "tr-2005",
  zandvoort: "nl-1948",
  jeddah: "sa-2021",
  miami: "us-2022",
  lusail: "qa-2004",
  madrid: "es-2026",
  madring: "es-2026",
  baku: "az-2016",
  "las vegas": "us-2023",
  "buenos aires": "ar-1952"
};

export function circuitId(shortName: string) {
  const key = shortName.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  return CIRCUIT_IDS[key] ?? null;
}

const SAMPLES = 240;
const COARSE = 72;

/** Equally spaced points along a closed polyline. */
function resample(points: XY[], count: number): XY[] {
  const closed = [...points, points[0]];
  const lengths = [0];
  for (let i = 1; i < closed.length; i += 1) lengths.push(lengths[i - 1] + Math.hypot(closed[i].x - closed[i - 1].x, closed[i].y - closed[i - 1].y));
  const total = lengths.at(-1) ?? 0;
  if (!total) return [];
  const result: XY[] = [];
  let segment = 1;
  for (let k = 0; k < count; k += 1) {
    const s = (k / count) * total;
    while (segment < lengths.length - 1 && lengths[segment] < s) segment += 1;
    const a = closed[segment - 1];
    const b = closed[segment];
    const span = lengths[segment] - lengths[segment - 1] || 1;
    const ratio = (s - lengths[segment - 1]) / span;
    result.push({ x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio });
  }
  return result;
}

function centroid(points: XY[]) {
  const n = points.length || 1;
  return { x: points.reduce((sum, p) => sum + p.x, 0) / n, y: points.reduce((sum, p) => sum + p.y, 0) / n };
}

function rms(points: XY[], centre: XY) {
  return Math.sqrt(points.reduce((sum, p) => sum + (p.x - centre.x) ** 2 + (p.y - centre.y) ** 2, 0) / (points.length || 1));
}

function nearest(point: XY, targets: XY[]) {
  let best = Infinity;
  let index = 0;
  for (let i = 0; i < targets.length; i += 1) {
    const d = (targets[i].x - point.x) ** 2 + (targets[i].y - point.y) ** 2;
    if (d < best) {
      best = d;
      index = i;
    }
  }
  return { index, distance: best };
}

/** x' = s·R(θ)·(mirror? (x,-y) : (x,y)) + t */
type Similarity = { scale: number; angle: number; mirror: boolean; tx: number; ty: number };

function apply(transform: Similarity, point: XY): XY {
  const y = transform.mirror ? -point.y : point.y;
  const cos = Math.cos(transform.angle);
  const sin = Math.sin(transform.angle);
  return { x: transform.scale * (cos * point.x - sin * y) + transform.tx, y: transform.scale * (sin * point.x + cos * y) + transform.ty };
}

/** Least-squares similarity between paired points (2D Umeyama). */
function solvePairs(source: XY[], target: XY[], mirror: boolean): Similarity {
  const src = source.map((p) => ({ x: p.x, y: mirror ? -p.y : p.y }));
  const cs = centroid(src);
  const ct = centroid(target);
  let a = 0;
  let b = 0;
  let norm = 0;
  for (let i = 0; i < src.length; i += 1) {
    const sx = src[i].x - cs.x;
    const sy = src[i].y - cs.y;
    const qx = target[i].x - ct.x;
    const qy = target[i].y - ct.y;
    a += sx * qx + sy * qy;
    b += sx * qy - sy * qx;
    norm += sx * sx + sy * sy;
  }
  const angle = Math.atan2(b, a);
  const scale = Math.hypot(a, b) / (norm || 1);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { scale, angle, mirror, tx: ct.x - scale * (cos * cs.x - sin * cs.y), ty: ct.y - scale * (sin * cs.x + cos * cs.y) };
}

export type TrackFit = {
  /** OpenF1 x/y → [longitude, latitude]. */
  toLngLat: (point: XY) => [number, number];
  /** Mean distance between the fitted outline and the real centre line, in metres. */
  error: number;
  /** Compass heading of the circuit's long axis, for a map bearing that fills the screen. */
  heading: number;
};

/** Fits the OpenF1 outline onto the real circuit; null when the shapes do not match well enough. */
export function fitTrack(outline: XY[], circuit: GeoCircuit): TrackFit | null {
  if (outline.length < 20 || circuit.line.length < 10) return null;
  const lng0 = circuit.line.reduce((sum, c) => sum + c[0], 0) / circuit.line.length;
  const lat0 = circuit.line.reduce((sum, c) => sum + c[1], 0) / circuit.line.length;
  const mx = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const my = 110_540;
  // Real centre line in metres east/north of its centroid.
  const geo = resample(circuit.line.map(([lng, lat]) => ({ x: (lng - lng0) * mx, y: (lat - lat0) * my })), SAMPLES);
  const track = resample(outline, SAMPLES);
  if (!geo.length || !track.length) return null;

  const gc = centroid(geo);
  const tc = centroid(track);
  const baseScale = rms(geo, gc) / (rms(track, tc) || 1);
  const coarseTrack = resample(outline, COARSE);

  // Coarse search over rotation (and a mirrored frame, to be safe) with centroids and size matched.
  let best: { transform: Similarity; cost: number } | null = null;
  for (const mirror of [false, true]) {
    const mtc = { x: tc.x, y: mirror ? -tc.y : tc.y };
    for (let degrees = 0; degrees < 360; degrees += 2) {
      const angle = (degrees * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const transform: Similarity = {
        scale: baseScale,
        angle,
        mirror,
        tx: gc.x - baseScale * (cos * mtc.x - sin * mtc.y),
        ty: gc.y - baseScale * (sin * mtc.x + cos * mtc.y)
      };
      let cost = 0;
      for (const point of coarseTrack) cost += nearest(apply(transform, point), geo).distance;
      if (!best || cost < best.cost) best = { transform, cost };
    }
  }
  if (!best) return null;

  // Refine with a few rounds of closest-point matching.
  let transform = best.transform;
  for (let round = 0; round < 12; round += 1) {
    const pairs = track.map((point) => geo[nearest(apply(transform, point), geo).index]);
    transform = solvePairs(track, pairs, transform.mirror);
  }

  const error = track.reduce((sum, point) => sum + Math.sqrt(nearest(apply(transform, point), geo).distance), 0) / track.length;
  // OpenF1 units are roughly decimetres; anything far off means the outline is not this circuit.
  if (error > 25 || transform.scale < 0.05 || transform.scale > 0.2) return null;

  // Principal axis of the real line, as a compass heading.
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of geo) {
    sxx += (p.x - gc.x) ** 2;
    syy += (p.y - gc.y) ** 2;
    sxy += (p.x - gc.x) * (p.y - gc.y);
  }
  const axis = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const heading = ((90 - (axis * 180) / Math.PI) % 180 + 180) % 180;

  return {
    toLngLat: (point) => {
      const p = apply(transform, point);
      return [lng0 + p.x / mx, lat0 + p.y / my];
    },
    error,
    heading
  };
}

let circuitsPromise: Promise<Record<string, GeoCircuit>> | null = null;

export function loadCircuits() {
  circuitsPromise ??= fetch("/maps/f1-circuits.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<Record<string, GeoCircuit>>;
    })
    .catch((error) => {
      circuitsPromise = null;
      throw error;
    });
  return circuitsPromise;
}
