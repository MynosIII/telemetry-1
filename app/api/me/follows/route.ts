import { NextResponse, type NextRequest } from "next/server";
import { currentUserId } from "@/lib/account/auth";
import { accountsEnabled, addFollow, removeFollow } from "@/lib/account/db";
import { parseFollow } from "@/lib/account/validate";

async function handle(request: NextRequest, action: "add" | "remove") {
  if (!accountsEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const follow = parseFollow(await request.json().catch(() => null));
  if (!follow) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (action === "add") await addFollow(userId, follow);
  else await removeFollow(userId, follow.kind, follow.id);
  return NextResponse.json({ ok: true });
}

export function POST(request: NextRequest) {
  return handle(request, "add");
}

export function DELETE(request: NextRequest) {
  return handle(request, "remove");
}
