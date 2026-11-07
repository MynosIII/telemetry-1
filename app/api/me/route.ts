import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/account/auth";
import { accountsEnabled, deleteUser, listFollows, listProgress, upsertUser } from "@/lib/account/db";

const PRIVATE = { "Cache-Control": "private, no-store" };

/** Who is signed in, what they follow and which games have saved progress. */
export async function GET() {
  if (!accountsEnabled()) return NextResponse.json({ enabled: false, user: null }, { headers: PRIVATE });
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ enabled: true, user: null }, { headers: PRIVATE });
  const { name, email, image } = session.user ?? {};
  // Every page load passes here first, so the user row exists before any follow or save.
  await upsertUser({ id, email, name, image });
  const [follows, progress] = await Promise.all([listFollows(id), listProgress(id)]);
  return NextResponse.json({ enabled: true, user: { name, email, image }, follows, progress }, { headers: PRIVATE });
}

/** Deletes the account and everything saved with it, then ends the session. */
export async function DELETE() {
  if (!accountsEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await deleteUser(id);
  await signOut({ redirect: false });
  return NextResponse.json({ ok: true }, { headers: PRIVATE });
}
