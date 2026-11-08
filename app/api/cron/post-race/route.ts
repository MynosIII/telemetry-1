import { revalidatePath, revalidateTag } from "next/cache";
import { getLiveModelSnapshot, LIVE_MODEL_CACHE_TAG } from "@/lib/live-model";
import { getRaceReport, RACE_REPORT_CACHE_TAG } from "@/lib/race-report";
import { alertIfReady } from "@/lib/race-alert";

export const runtime = "nodejs";
export const maxDuration = 30;

const SCHEDULE_URL = "https://api.jolpi.ca/ergast/f1/current.json?limit=100";
const RACE_WINDOW_MS = 48 * 60 * 60 * 1000;

type ScheduleRace = {
  round: string;
  raceName: string;
  date: string;
  time?: string;
};

function raceStart(race: ScheduleRace) {
  return Date.parse(`${race.date}T${race.time ?? "12:00:00Z"}`);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const response = await fetch(SCHEDULE_URL, { cache: "no-store" });
  if (!response.ok) {
    return Response.json({ ok: false, error: `Jolpica schedule returned ${response.status}` }, { status: 502 });
  }

  const data = await response.json();
  const races = (data?.MRData?.RaceTable?.Races ?? []) as ScheduleRace[];
  const recentRace = races
    .filter((race) => {
      const startedAt = raceStart(race);
      return startedAt <= now && now - startedAt <= RACE_WINDOW_MS;
    })
    .sort((a, b) => raceStart(b) - raceStart(a))[0];

  if (!recentRace) {
    return Response.json({
      ok: true,
      action: "skipped",
      reason: "No Formula 1 race in the last 48 hours"
    });
  }

  revalidateTag(LIVE_MODEL_CACHE_TAG, { expire: 0 });
  const snapshot = await getLiveModelSnapshot();
  const expectedRound = Number(recentRace.round);
  const integrated = snapshot.status === "ready" && snapshot.coverage.latestRace?.round === expectedRound;

  if (!integrated) {
    // Do not keep an incomplete classification cached until the next race.
    revalidateTag(LIVE_MODEL_CACHE_TAG, { expire: 0 });
    return Response.json({
      ok: false,
      action: "deferred",
      race: recentRace.raceName,
      reason: "The final classification is not complete yet"
    }, { status: 202 });
  }

  // The post-race report (/informe and /carreras/<round>/informe) rebuilds from the final classification.
  revalidateTag(RACE_REPORT_CACHE_TAG, { expire: 0 });
  const report = await getRaceReport(String(expectedRound)).catch(() => null);
  for (const lang of ["es", "en"]) {
    revalidatePath(`/${lang}/informe`);
    if (report) revalidatePath(`/${lang}/informe/${report.slug}`);
  }

  const alert = await alertIfReady(report).catch((error) => ({ sent: false, reason: String(error) }));

  return Response.json({
    ok: true,
    action: "updated",
    alert,
    report: report ? `/informe/${report.slug}` : null,
    race: recentRace.raceName,
    round: expectedRound,
    completedRaces: snapshot.coverage.completedRaces,
    observations: snapshot.coverage.uniqueRows,
    favorite: snapshot.prediction[0]?.name ?? null,
    updatedAt: snapshot.updatedAt
  });
}
