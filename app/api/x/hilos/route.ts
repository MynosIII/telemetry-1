import { runXThreads } from "@/lib/x-threads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Called every hour by .github/workflows/x-threads.yml. Sends new threads to the phone for review
 * and posts the ones whose review window is over. Calling it more often does nothing extra.
 */
export async function GET() {
  try {
    return Response.json({ ok: true, threads: await runXThreads() });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
