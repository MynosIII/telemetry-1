import { RADAR_STEP_MS, circuitLocation, radarImage, recentRadarImage } from "@/lib/replay-radar";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const key = Number(params.get("key"));
  const frame = Number(params.get("frame"));
  if (!Number.isInteger(key) || key <= 0 || !Number.isInteger(frame) || frame <= 0) {
    return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
  }
  const at = frame * RADAR_STEP_MS;
  if (at > Date.now()) return Response.json({ error: "Todavía no hay imagen" }, { status: 404 });
  const location = await circuitLocation(key);
  if (!location) return Response.json({ error: "Sin ubicación del circuito" }, { status: 404 });
  // IMERG takes about four hours to appear, so a live session uses ground radar instead.
  const recent = at > Date.now() - 3 * 3_600_000;
  const image = recent
    ? await recentRadarImage(location.lat, location.lon, Math.min(Date.now(), at + RADAR_STEP_MS / 2))
    : await radarImage(location.lat, location.lon, at);
  if (!image) return Response.json({ error: "Sin imagen" }, { status: 404, headers: { "Cache-Control": "public, max-age=0, s-maxage=600" } });
  // IMERG's first estimate arrives about four hours later and is refined for months; a day is settled enough.
  const settled = !recent && at < Date.now() - 86_400_000;
  return new Response(image, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": settled ? "public, max-age=86400, s-maxage=31536000" : recent ? "public, max-age=0, s-maxage=300" : "public, max-age=0, s-maxage=1800"
    }
  });
}
