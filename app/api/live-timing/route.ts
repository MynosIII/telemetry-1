import { getLiveTimingSnapshot } from "@/lib/live-timing";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getLiveTimingSnapshot();
  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
