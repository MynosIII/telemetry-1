import { listSessions } from "@/lib/replay";

export async function GET(request: Request) {
  const year = Number(new URL(request.url).searchParams.get("year"));
  if (!Number.isInteger(year) || year < 2023 || year > 2100) {
    return Response.json({ error: "Año inválido" }, { status: 400 });
  }
  try {
    const sessions = await listSessions(year);
    return Response.json(sessions, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600" }
    });
  } catch {
    return Response.json({ error: "OpenF1 no respondió" }, { status: 502 });
  }
}
