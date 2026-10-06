import { cacheHeaders } from "@/lib/openf1";
import { getLapTelemetry } from "@/lib/replay";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const [session, driver, lap] = ["session", "driver", "lap"].map((name) => Number(params.get(name)));
  if (![session, driver, lap].every((value) => Number.isInteger(value) && value > 0)) {
    return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
  }
  try {
    const telemetry = await getLapTelemetry(session, driver, lap);
    if (!telemetry) return Response.json({ error: "No hay telemetría para esa vuelta" }, { status: 404 });
    return Response.json(telemetry, { headers: cacheHeaders(telemetry.complete && telemetry.t.length > 0) });
  } catch {
    return Response.json({ error: "OpenF1 no respondió" }, { status: 502 });
  }
}
