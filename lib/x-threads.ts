/**
 * X threads written from the site's data (scripts/x-thread/generate.mjs writes them, two days apart,
 * together with an article). This module sends each new thread to the phone through ntfy with
 * "Publicar ya" and "Descartar" buttons, and posts it to X once the review window is over.
 *
 * Settings (Vercel environment variables):
 * - X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET: the @TelemetryOne app's keys
 *   (console.x.com, app permissions "Read and write"). Without them nothing is posted.
 * - X_POST_MODE: "revision" (default: posts X_REVIEW_HOURS after the alert unless discarded),
 *   "aprobacion" (only after "Publicar ya") or "automatico" (right away).
 * - X_REVIEW_HOURS: review window, 6 by default.
 * - NTFY_TOPIC: same phone topic as the race report alerts.
 * State lives in the Neon table x_threads (DATABASE_URL).
 */
import { createHmac, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import threads from "@/data/x-threads-index.json";
import { articleBySlug } from "./editorial-articles";
import { SITE_URL, X_URL } from "./site";

export type XThread = { slug: string; topic: string; createdOn: string; tweets: string[] };
export const xThreads = threads as XThread[];

const NTFY = (process.env.NTFY_SERVER ?? "https://ntfy.sh").replace(/\/$/, "");
const TOPIC = () => process.env.NTFY_TOPIC?.trim() || "telemetry-one-dfdf20028b";
const MODE = () => (["revision", "aprobacion", "automatico"].includes(process.env.X_POST_MODE ?? "") ? process.env.X_POST_MODE : "revision") as "revision" | "aprobacion" | "automatico";
const REVIEW_HOURS = () => Number(process.env.X_REVIEW_HOURS) > 0 ? Number(process.env.X_REVIEW_HOURS) : 6;
const MAX_AGE_DAYS = 7;

const credentials = () => {
  const { X_API_KEY: key, X_API_SECRET: secret, X_ACCESS_TOKEN: token, X_ACCESS_SECRET: tokenSecret } = process.env;
  return key && secret && token && tokenSecret ? { key, secret, token, tokenSecret } : null;
};

const sql = () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return neon(process.env.DATABASE_URL);
};

async function ensureTable() {
  await sql()`CREATE TABLE IF NOT EXISTS x_threads (
    slug text PRIMARY KEY,
    notified_at timestamptz,
    decision text,
    tweet_ids text[] NOT NULL DEFAULT '{}',
    posting_at timestamptz,
    posted_at timestamptz,
    error text
  )`;
}

type Row = { slug: string; notified_at: string | null; decision: string | null; tweet_ids: string[]; posted_at: string | null; error: string | null };

async function row(slug: string): Promise<Row> {
  const db = sql();
  await db`INSERT INTO x_threads (slug) VALUES (${slug}) ON CONFLICT (slug) DO NOTHING`;
  return (await db`SELECT * FROM x_threads WHERE slug = ${slug}`)[0] as Row;
}

// ---------- review links ----------
const reviewSecret = () => process.env.X_REVIEW_SECRET || process.env.AUTH_SECRET || process.env.CRON_SECRET || "";
export const reviewToken = (slug: string) => createHmac("sha256", reviewSecret()).update(`x-thread:${slug}`).digest("hex").slice(0, 32);
export const validToken = (slug: string, token: string | null) => Boolean(reviewSecret()) && token === reviewToken(slug);
const decisionUrl = (slug: string, action: "publicar" | "descartar") => `${SITE_URL}/api/x/hilos/${slug}?accion=${action}&t=${reviewToken(slug)}`;

// ---------- ntfy ----------
type NtfyAction = { action: "view" | "http"; label: string; url: string; method?: string; clear?: boolean };
async function notify(title: string, message: string, click: string, actions: NtfyAction[] = []) {
  const response = await fetch(NTFY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: TOPIC(), title, message: message.slice(0, 3900), click, actions, tags: ["bird"] }),
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`ntfy ${response.status}`);
}

const argentinaTime = (date: Date) => date.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false });

async function sendForReview(thread: XThread) {
  const article = articleBySlug(thread.slug);
  const when = MODE() === "automatico" ? "Sale ahora." : MODE() === "aprobacion"
    ? "Sale solo si tocás Publicar ya."
    : `Sale solo el ${argentinaTime(new Date(Date.now() + REVIEW_HOURS() * 3_600_000))} si no lo descartás.`;
  const warning = credentials() ? "" : "\n\nOjo: faltan las claves de X en Vercel, así que por ahora no se publica.";
  const body = `${when}${warning}\n\n${thread.tweets.map((t, i) => `${i + 1}/ ${t}`).join("\n\n")}`;
  await notify(`Hilo para X: ${article?.title ?? thread.slug}`, body, `${SITE_URL}/articulos/${thread.slug}`, [
    { action: "http", label: "Publicar ya", url: decisionUrl(thread.slug, "publicar"), method: "POST", clear: true },
    { action: "http", label: "Descartar", url: decisionUrl(thread.slug, "descartar"), method: "POST", clear: true },
    { action: "view", label: "Ver artículo", url: `${SITE_URL}/articulos/${thread.slug}` }
  ]);
}

// ---------- X API (OAuth 1.0a user context) ----------
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

async function tweet(text: string, replyTo?: string): Promise<string> {
  const keys = credentials()!;
  const url = "https://api.x.com/2/tweets";
  const oauth: Record<string, string> = {
    oauth_consumer_key: keys.key,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: keys.token,
    oauth_version: "1.0"
  };
  const params = Object.keys(oauth).sort().map(k => `${enc(k)}=${enc(oauth[k])}`).join("&");
  const base = `POST&${enc(url)}&${enc(params)}`;
  oauth.oauth_signature = createHmac("sha1", `${enc(keys.secret)}&${enc(keys.tokenSecret)}`).update(base).digest("base64");
  const header = "OAuth " + Object.keys(oauth).sort().map(k => `${enc(k)}="${enc(oauth[k])}"`).join(", ");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: header, "Content-Type": "application/json" },
    body: JSON.stringify(replyTo ? { text, reply: { in_reply_to_tweet_id: replyTo } } : { text }),
    signal: AbortSignal.timeout(15_000)
  });
  const json = await response.json().catch(() => null) as { data?: { id: string }; detail?: string; title?: string } | null;
  if (!response.ok || !json?.data?.id) throw new Error(`X ${response.status}: ${json?.detail ?? json?.title ?? "sin respuesta"}`);
  return json.data.id;
}

/** Posts the tweets still missing (a thread cut halfway resumes where it stopped). */
async function post(thread: XThread): Promise<string> {
  const db = sql();
  const locked = await db`UPDATE x_threads SET posting_at = now()
    WHERE slug = ${thread.slug} AND posted_at IS NULL AND (posting_at IS NULL OR posting_at < now() - interval '10 minutes')
    RETURNING tweet_ids`;
  if (!locked.length) return "Ya se está publicando";
  const ids = [...(locked[0].tweet_ids as string[])];
  try {
    for (let i = ids.length; i < thread.tweets.length; i++) {
      ids.push(await tweet(thread.tweets[i], ids.at(-1)));
      await db`UPDATE x_threads SET tweet_ids = ${ids} WHERE slug = ${thread.slug}`;
    }
    await db`UPDATE x_threads SET posted_at = now(), posting_at = NULL, error = NULL WHERE slug = ${thread.slug}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const previous = (await db`SELECT error FROM x_threads WHERE slug = ${thread.slug}`)[0]?.error;
    await db`UPDATE x_threads SET posting_at = NULL, error = ${message} WHERE slug = ${thread.slug}`;
    if (previous !== message) await notify("El hilo no se pudo publicar en X", `${message}\n\nSe vuelve a intentar en una hora (${ids.length} de ${thread.tweets.length} tuits publicados).`, `${SITE_URL}/articulos/${thread.slug}`).catch(() => {});
    return `Error: ${message}`;
  }
  await notify("Hilo publicado en X", articleBySlug(thread.slug)?.title ?? thread.slug, `${X_URL}/status/${ids[0]}`).catch(() => {});
  return "Publicado";
}

/** One pass: alert new threads, post the ones whose time has come. Called every hour. */
export async function runXThreads(now = Date.now()) {
  await ensureTable();
  const results: Record<string, string> = {};
  for (const thread of xThreads) {
    if (now - Date.parse(`${thread.createdOn}T00:00:00Z`) > MAX_AGE_DAYS * 86_400_000) continue;
    let state = await row(thread.slug);
    if (state.posted_at) { results[thread.slug] = "Publicado"; continue; }
    if (state.decision === "descartar") { results[thread.slug] = "Descartado"; continue; }
    if (!state.notified_at) {
      await sendForReview(thread);
      await sql()`UPDATE x_threads SET notified_at = now() WHERE slug = ${thread.slug}`;
      state = await row(thread.slug);
    }
    const reviewed = Date.parse(state.notified_at!) + REVIEW_HOURS() * 3_600_000 <= now;
    const due = state.decision === "publicar" || MODE() === "automatico" || (MODE() === "revision" && reviewed);
    if (!due) { results[thread.slug] = "En revisión"; continue; }
    if (!credentials()) { results[thread.slug] = "Faltan las claves de X"; continue; }
    results[thread.slug] = await post(thread);
  }
  return results;
}

/** The phone's "Publicar ya" / "Descartar" buttons. */
export async function decideXThread(slug: string, action: "publicar" | "descartar") {
  const thread = xThreads.find(t => t.slug === slug);
  if (!thread) return "No existe ese hilo";
  await ensureTable();
  const state = await row(slug);
  if (state.posted_at) return "Ya estaba publicado";
  if (action === "descartar" && state.tweet_ids.length) return "Ya empezó a publicarse";
  await sql()`UPDATE x_threads SET decision = ${action} WHERE slug = ${slug}`;
  if (action === "descartar") return "Descartado: no se publica";
  if (!credentials()) return "Aprobado, pero faltan las claves de X en Vercel";
  return post(thread);
}
