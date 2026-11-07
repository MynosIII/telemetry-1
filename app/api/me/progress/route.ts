import { NextResponse, type NextRequest } from "next/server";
import { currentUserId } from "@/lib/account/auth";
import { accountsEnabled, saveProgress } from "@/lib/account/db";
import { isProgressGame, MAX_PROGRESS_BYTES } from "@/lib/account/validate";

/** Saves one game's progress. The games post it to the page, which forwards it here. */
export async function PUT(request: NextRequest) {
  if (!accountsEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const raw = await request.text();
  if (raw.length > MAX_PROGRESS_BYTES + 200) return NextResponse.json({ error: "too large" }, { status: 413 });
  let body: { game?: unknown; data?: unknown };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid" }, { status: 400 }); }
  if (!isProgressGame(body.game) || body.data === undefined || body.data === null || typeof body.data !== "object") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  await saveProgress(userId, body.game, body.data);
  return NextResponse.json({ ok: true });
}
