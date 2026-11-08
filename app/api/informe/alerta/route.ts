import { alertIfReady } from "@/lib/race-alert";
import { getRaceReport } from "@/lib/race-report";
import { getReportTexts } from "@/lib/race-report-text";

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
    // Once the report is complete, ChatGPT writes the summary and Gemini translates it (if the keys are set).
    if (report?.complete) {
      await getReportTexts(report, "es", true);
      await getReportTexts(report, "en", true);
    }
    const result = await alertIfReady(report);
    return Response.json({
      ok: true,
      ...result,
      race: report ? { season: report.season, round: report.round, slug: report.slug, name: report.name, gridSource: report.gridSource, complete: report.complete } : null
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
