/**
 * Phone alert when the post-race report is complete, through ntfy (https://ntfy.sh): install the
 * ntfy app and subscribe to the topic below (NTFY_TOPIC in Vercel overrides it). Each race alerts once; the Neon database
 * (DATABASE_URL) remembers what was sent.
 */
import { neon } from "@neondatabase/serverless";
import type { RaceReport } from "./race-report";
import { formatDelta } from "./race-report";
import { SITE_URL } from "./site";

const NTFY = (process.env.NTFY_SERVER ?? "https://ntfy.sh").replace(/\/$/, "");
// ntfy topics are public by name: anyone who knows it can read or post. Change it in Vercel if it leaks.
const DEFAULT_TOPIC = "telemetry-one-dfdf20028b";

/** Records `key` as sent. Returns false when it was already there (or there is no database). */
async function claim(key: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS race_alerts (key text PRIMARY KEY, sent_at timestamptz NOT NULL DEFAULT now())`;
  const rows = await sql`INSERT INTO race_alerts (key) VALUES (${key}) ON CONFLICT (key) DO NOTHING RETURNING key`;
  return rows.length > 0;
}

async function release(key: string) {
  if (!process.env.DATABASE_URL) return;
  await neon(process.env.DATABASE_URL)`DELETE FROM race_alerts WHERE key = ${key}`;
}

async function push(topic: string, title: string, body: string, click: string, attach?: string) {
  // Query parameters instead of headers, so accents in the title survive.
  const params = new URLSearchParams({ title, click, tags: "checkered_flag" });
  if (attach) params.set("attach", attach);
  const response = await fetch(`${NTFY}/${encodeURIComponent(topic)}?${params}`, { method: "POST", body, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`ntfy ${response.status}`);
}

export type AlertResult = { sent: boolean; reason: string };

export async function alertIfReady(report: RaceReport | null): Promise<AlertResult> {
  const topic = process.env.NTFY_TOPIC?.trim() || DEFAULT_TOPIC;

  // A one-off message so the phone shows the setup works before the first race.
  if (await claim(`setup:${topic}`)) {
    try {
      await push(topic, "Telemetry One: alertas activadas", "Te voy a avisar acá cuando el informe de cada carrera esté completo.", `${SITE_URL}/informe`);
    } catch (error) {
      await release(`setup:${topic}`);
      throw error;
    }
  }

  if (!report) return { sent: false, reason: "No race results" };
  const ageDays = (Date.now() - Date.parse(`${report.date}T00:00:00Z`)) / 86_400_000;
  if (ageDays > 4) return { sent: false, reason: "The latest race is older than four days" };
  if (!report.complete) return { sent: false, reason: "The report is still missing the official grid, laps, pit stops or fastest lap" };

  const key = `race:${report.season}-${report.round}:${topic}`;
  if (!(await claim(key))) return { sent: false, reason: "Already sent" };

  const best = report.expectation.filter(r => r.delta !== null && r.delta > 0).slice(0, 3);
  const lines = [
    best.length ? `Por encima de lo esperado: ${best.map(r => `${r.name} ${formatDelta(r.delta)}`).join(", ")}.` : "",
    report.overtakes.rows[0]?.made ? `Más adelantamientos: ${report.overtakes.rows[0].name} (${report.overtakes.rows[0].made}).` : "",
    report.records[0] ?? ""
  ].filter(Boolean);
  try {
    await push(
      topic,
      `Informe listo: ${report.name}`,
      lines.join("\n"),
      `${SITE_URL}/informe/${report.slug}`,
      `${SITE_URL}/api/informe/${report.round}/imagen`
    );
  } catch (error) {
    await release(key);
    throw error;
  }
  return { sent: true, reason: "Sent" };
}
