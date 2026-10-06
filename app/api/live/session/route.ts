import { num, openF1, openF1Configured } from "@/lib/openf1";
import { getSessionSummary } from "@/lib/replay";

/** The latest OpenF1 session and whether it is on track right now. */
export async function GET() {
  try {
    const [latest] = await openF1("/sessions?session_key=latest", 20_000);
    const key = num(latest?.session_key);
    const session = key === null ? null : await getSessionSummary(key);
    const now = Date.now();
    const live = Boolean(session && now >= Date.parse(session.startsAt) - 5 * 60_000 && now <= Date.parse(session.endsAt) + 15 * 60_000);
    return Response.json({ session, live, configured: openF1Configured() }, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=20, stale-while-revalidate=20" }
    });
  } catch {
    return Response.json({ session: null, live: false, configured: openF1Configured() }, { status: 502 });
  }
}
