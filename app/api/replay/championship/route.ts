import { cacheHeaders } from "@/lib/openf1";
import { getChampionshipBase } from "@/lib/replay-championship";

export async function GET(request: Request) {
  const key = Number(new URL(request.url).searchParams.get("key"));
  if (!Number.isInteger(key) || key <= 0) return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
  try {
    const base = await getChampionshipBase(key);
    if (!base) return Response.json({ error: "Sin campeonato para esta sesión" }, { status: 404, headers: { "Cache-Control": "public, max-age=0, s-maxage=600" } });
    // The standings before a session never change once it has started.
    return Response.json(base, { headers: cacheHeaders(true) });
  } catch {
    return Response.json({ error: "No respondió la fuente del campeonato" }, { status: 502 });
  }
}
