/**
 * OpenF1 client shared by the replay, telemetry and live routes.
 *
 * Historical data (2023 onwards) is free and needs no key, limited to 3 requests a second and
 * 30 a minute. Live data needs a sponsor account: set OPENF1_USERNAME and OPENF1_PASSWORD (or a
 * ready OPENF1_API_TOKEN) in Vercel. Finished sessions never change, so routes cache them at the CDN.
 */
// OPENF1_BASE_URL points local development at scripts/mock-openf1.mjs when the real API is unreachable.
const BASE = process.env.OPENF1_BASE_URL?.replace(/\/$/, "") ?? "https://api.openf1.org";
const ROOT = `${BASE}/v1`;
const TOKEN_URL = `${BASE}/token`;

export type Row = Record<string, unknown>;

let tokenCache: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string | undefined> {
  const username = process.env.OPENF1_USERNAME?.trim();
  const password = process.env.OPENF1_PASSWORD?.trim();
  if (username && password) {
    if (tokenCache && tokenCache.expiresAt - Date.now() > 60_000) return tokenCache.value;
    try {
      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000)
      });
      if (response.ok) {
        const body = (await response.json()) as { access_token?: string; expires_in?: number | string };
        if (body.access_token) {
          tokenCache = { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in ?? 3600) * 1000 };
          return tokenCache.value;
        }
      }
    } catch {
      // Fall through to the static token or anonymous access.
    }
  }
  return process.env.OPENF1_API_TOKEN?.trim() || undefined;
}

export function openF1Configured() {
  return Boolean(
    (process.env.OPENF1_USERNAME?.trim() && process.env.OPENF1_PASSWORD?.trim()) || process.env.OPENF1_API_TOKEN?.trim()
  );
}

const memo = new Map<string, { at: number; value: Promise<Row[]> }>();
const MEMO_MAX = 160;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path: string): Promise<Row[]> {
  const token = await accessToken();
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(`${ROOT}${path}`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: AbortSignal.timeout(25_000)
    });
    // OpenF1 answers 404 when a filter matches nothing.
    if (response.status === 404) return [];
    if (response.status === 429 && attempt < 4) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1200 * (attempt + 1));
      continue;
    }
    if (!response.ok) throw new Error(`OpenF1 ${response.status} ${path}`);
    const body: unknown = await response.json();
    return Array.isArray(body) ? (body as Row[]) : [];
  }
}

/**
 * Fetch an OpenF1 path such as `/laps?session_key=9158`. `memoMs` keeps the answer in this
 * function instance so repeated calls (for example the same driver's laps) don't spend rate limit.
 */
export function openF1(path: string, memoMs = 0): Promise<Row[]> {
  if (memoMs <= 0) return request(path);
  const hit = memo.get(path);
  if (hit && Date.now() - hit.at < memoMs) return hit.value;
  const value = request(path);
  value.catch(() => memo.delete(path));
  memo.set(path, { at: Date.now(), value });
  if (memo.size > MEMO_MAX) memo.delete(memo.keys().next().value as string);
  return value;
}

/** `date>=from` and `date<=to` filters, encoded the way OpenF1 expects them. */
export function dateRange(from: number, to: number) {
  return `date%3E=${encodeURIComponent(new Date(from).toISOString())}&date%3C=${encodeURIComponent(new Date(to).toISOString())}`;
}

export function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function time(value: unknown): number | null {
  const parsed = Date.parse(str(value));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Cache headers for a response built from OpenF1 data. Finished data is cached at the CDN for a year. */
export function cacheHeaders(finished: boolean): HeadersInit {
  return {
    "Cache-Control": finished
      ? "public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400"
      : "public, max-age=0, s-maxage=5, stale-while-revalidate=5"
  };
}

export const MEMO_FINISHED = 30 * 60_000;
