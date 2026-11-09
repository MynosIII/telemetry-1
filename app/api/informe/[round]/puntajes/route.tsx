import sharp from "sharp";
import { ImageResponse } from "next/og";
import { getRaceReport, type ExpectationRow } from "@/lib/race-report";
import { driverFace } from "@/lib/driver-photos";
import { SITE_URL } from "@/lib/site";
import { BrandMark } from "@/components/BrandMark";

export const runtime = "nodejs";
export const revalidate = 1800;

const MUTED = "#9b9b9b";
const FACE = 40;

/** Red below 5, grey at 5, green above, so the colour reads the same way as the score. */
function scoreColor(score: number) {
  const t = Math.min(1, Math.abs(score - 5) / 4);
  const [r, g, b] = score >= 5 ? [95, 212, 122] : [255, 107, 94];
  const mix = (c: number) => Math.round(200 + (c - 200) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Square face crop as a PNG data URL (Satori does not read webp). Null when there is no photo. */
async function faceData(driverId: string, origin: string): Promise<string | null> {
  const url = driverFace(driverId);
  if (!url) return null;
  try {
    // Local files are fetched from the site itself (reading public/ from disk would bundle all of it).
    // Wikimedia serves a scaled copy when asked; the full original can be several MB.
    const absolute = new URL(url, origin).toString();
    const small = absolute.includes("Special:FilePath") && !absolute.includes("width=") ? `${absolute}${absolute.includes("?") ? "&" : "?"}width=400` : absolute;
    const response = await fetch(small, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "TelemetryOne/1.0" } });
    if (!response.ok) return null;
    const input = Buffer.from(await response.arrayBuffer());
    // Face crops are already square; other portraits are cropped around their most detailed area.
    const position = url.startsWith("/drivers/faces/") ? "centre" : sharp.strategy.attention;
    const png = await sharp(input).resize(FACE * 2, FACE * 2, { fit: "cover", position }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

function Row({ row, rank, face }: { row: ExpectationRow; rank: number; face: string | null }) {
  const initials = row.name.split(" ").map(w => w[0]).join("").slice(0, 2);
  return <div style={{ display: "flex", alignItems: "center", height: 48, borderBottom: "1px solid #1f1f1f" }}>
    <div style={{ display: "flex", width: 34, fontSize: 18, color: MUTED }}>{rank}</div>
    {face
      ? <img src={face} width={FACE} height={FACE} style={{ borderRadius: FACE / 2, objectFit: "cover" }} />
      : <div style={{ display: "flex", width: FACE, height: FACE, borderRadius: FACE / 2, background: "#222", color: MUTED, fontSize: 17, alignItems: "center", justifyContent: "center" }}>{initials}</div>}
    <div style={{ display: "flex", flex: 1, marginLeft: 16, fontSize: 25, fontWeight: 700, letterSpacing: 0.5, color: "#ececec" }}>{row.surname.toUpperCase()}</div>
    <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: scoreColor(row.score!) }}>{row.score!.toFixed(2).replace(".", ",")}</div>
  </div>;
}

export async function GET(request: Request, { params }: { params: Promise<{ round: string }> }) {
  const { round } = await params;
  const report = await getRaceReport(round);
  if (!report) return new Response("Carrera no encontrada", { status: 404 });

  const ranked = report.expectation.filter(r => r.score !== null).sort((a, b) => b.score! - a.score!);
  const faces = await Promise.all(ranked.map(r => faceData(r.driverId, new URL(request.url).origin)));
  const half = Math.ceil(ranked.length / 2);
  const columns = [ranked.slice(0, half), ranked.slice(half)];
  const host = new URL(SITE_URL).host;

  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#0a0a0a", color: "#ececec", padding: "36px 56px 28px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>{report.name} {report.season}</div>
          <div style={{ display: "flex", fontSize: 20, color: MUTED, marginTop: 4 }}>Puntaje de la carrera, de 0 a 10</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 20, fontWeight: 700 }}>
          <BrandMark height={34} />
          <div style={{ display: "flex" }}>TELEMETRY<span style={{ color: "#e10600", marginLeft: 6 }}>ONE</span></div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 56, marginTop: 18, flex: 1 }}>
        {columns.map((rows, c) => <div key={c} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {rows.map((r, i) => <Row key={r.driverId} row={r} rank={c * half + i + 1} face={faces[c * half + i]} />)}
        </div>)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: MUTED, marginTop: 10 }}>
        <div style={{ display: "flex" }} />
        <div style={{ display: "flex" }}>{host}/informe/{report.slug}</div>
      </div>
    </div>,
    { width: 1200, height: 675, headers: { "Cache-Control": "public, max-age=600, s-maxage=1800, stale-while-revalidate=86400" } }
  );
}
