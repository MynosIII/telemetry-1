import { alertIfReady } from "@/lib/race-alert";
import { getRaceReport } from "@/lib/race-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Checked every 20 minutes on race weekends (.github/workflows/race-alert.yml). Public on purpose:
 * it only reads the cached report and each race alerts once, so calling it again does nothing.
 */
export async function GET() {
  try {
    const report = await getRaceReport("ultima");
    const result = await alertIfReady(report);
    return Response.json({
      ok: true,
      ...result,
      race: report ? { season: report.season, round: report.round, name: report.name, gridSource: report.gridSource, complete: report.complete } : null
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
