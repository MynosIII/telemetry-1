import { NextResponse } from "next/server";
import { getLiveModelSnapshot } from "@/lib/live-model";

export const runtime = "nodejs";

export async function GET() {
  const snapshot = await getLiveModelSnapshot();
  return NextResponse.json(snapshot, {
    status: snapshot.status === "ready" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
