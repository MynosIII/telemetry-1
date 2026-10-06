import { RADAR_STEP_MS, circuitLocation, radarImage } from "@/lib/replay-radar";

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
  const image = await radarImage(location.lat, location.lon, at);
  if (!image) return Response.json({ error: "Sin imagen" }, { status: 404, headers: { "Cache-Control": "public, max-age=0, s-maxage=600" } });
  // IMERG's first estimate arrives about four hours later and is refined for months; a day is settled enough.
  const settled = at < Date.now() - 86_400_000;
  return new Response(image, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": settled ? "public, max-age=86400, s-maxage=31536000" : "public, max-age=0, s-maxage=1800"
    }
  });
}
