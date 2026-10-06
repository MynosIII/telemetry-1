import { cacheHeaders } from "@/lib/openf1";
import { getReplaySession } from "@/lib/replay";

export async function GET(request: Request) {
  const key = Number(new URL(request.url).searchParams.get("key"));
  if (!Number.isInteger(key) || key <= 0) return Response.json({ error: "Sesión inválida" }, { status: 400 });
  try {
    const data = await getReplaySession(key);
    if (!data) return Response.json({ error: "No existe esa sesión" }, { status: 404 });
    return Response.json(data, { headers: cacheHeaders(data.session.finished) });
  } catch {
    return Response.json({ error: "OpenF1 no respondió" }, { status: 502 });
  }
}
