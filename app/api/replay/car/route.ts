import { cacheHeaders } from "@/lib/openf1";
import { POSITION_CHUNK_MS, getCarDataChunk } from "@/lib/replay";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const key = Number(params.get("key"));
  const driver = Number(params.get("driver"));
  const chunk = Number(params.get("chunk"));
  if (!Number.isInteger(key) || key <= 0 || !Number.isInteger(driver) || driver <= 0 || !Number.isInteger(chunk) || chunk < 0) {
    return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
  }
  const from = chunk * POSITION_CHUNK_MS;
  const to = from + POSITION_CHUNK_MS;
  try {
    const data = await getCarDataChunk(key, driver, from, to);
    return Response.json(data, { headers: cacheHeaders(to < Date.now() - 180_000) });
  } catch {
    return Response.json({ error: "OpenF1 no respondió" }, { status: 502 });
  }
}
