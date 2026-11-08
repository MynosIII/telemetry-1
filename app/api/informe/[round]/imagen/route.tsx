import { ImageResponse } from "next/og";
import { formatDelta, getRaceReport, type ExpectationRow } from "@/lib/race-report";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const revalidate = 1800;

const GREEN = "#5fd47a";
const RED = "#ff6b5e";
const MUTED = "#9b9b9b";

function Row({ row, color }: { row: ExpectationRow; color: string }) {
  return <div style={{ display: "flex", alignItems: "center", height: 46, borderBottom: "1px solid #222", fontSize: 24 }}>
    <div style={{ display: "flex", flex: 1, color: "#ececec" }}>{row.name}</div>
    <div style={{ display: "flex", width: 90, color: MUTED, justifyContent: "flex-end" }}>{row.grid ? `P${row.grid}` : "Boxes"}</div>
    <div style={{ display: "flex", width: 100, color: MUTED, justifyContent: "flex-end" }}>P{row.expected}</div>
    <div style={{ display: "flex", width: 80, justifyContent: "flex-end" }}>P{row.finish}</div>
    <div style={{ display: "flex", width: 90, justifyContent: "flex-end", color, fontWeight: 700 }}>{formatDelta(row.delta)}</div>
  </div>;
}

export async function GET(_request: Request, { params }: { params: Promise<{ round: string }> }) {
  const { round } = await params;
  const report = await getRaceReport(round);
  if (!report) return new Response("Carrera no encontrada", { status: 404 });

  const ranked = report.expectation.filter(r => r.delta !== null);
  const best = ranked.filter(r => r.delta! > 0).slice(0, 5);
  const worst = ranked.filter(r => r.delta! < 0).slice(-3).reverse();
  const passer = report.overtakes.rows[0];
  const highlight = report.records.find(r => r.startsWith("Récord")) ?? report.records[0];
  const host = new URL(SITE_URL).host;

  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#0a0a0a", color: "#ececec", padding: "44px 56px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>{report.name} {report.season}</div>
        <div style={{ display: "flex", fontSize: 20, color: "#e10600", fontWeight: 700 }}>TELEMETRY ONE</div>
      </div>
      <div style={{ display: "flex", fontSize: 22, color: MUTED, marginTop: 6 }}>Llegada contra lo esperado según la largada</div>
      <div style={{ display: "flex", gap: 48, marginTop: 26, flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 17, color: MUTED }}>
            <div style={{ display: "flex", flex: 1, color: GREEN }}>POR ENCIMA</div>
            <div style={{ display: "flex", width: 90, justifyContent: "flex-end" }}>Largó</div>
            <div style={{ display: "flex", width: 100, justifyContent: "flex-end" }}>Esperado</div>
            <div style={{ display: "flex", width: 80, justifyContent: "flex-end" }}>Llegó</div>
            <div style={{ display: "flex", width: 90 }} />
          </div>
          {best.map(r => <Row key={r.driverId} row={r} color={GREEN} />)}
          <div style={{ display: "flex", fontSize: 18, color: RED, margin: "18px 0 4px" }}>POR DEBAJO</div>
          {worst.map(r => <Row key={r.driverId} row={r} color={RED} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 330, fontSize: 21, gap: 22 }}>
          {passer?.made ? <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", color: MUTED, fontSize: 17 }}>Más adelantamientos</div>
            <div style={{ display: "flex" }}>{passer.name} · {passer.made}</div>
          </div> : null}
          {report.stats.filter(s => s.label === "Ganador" || s.label === "Mejor primera vuelta").map(s => <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", color: MUTED, fontSize: 17 }}>{s.label}</div>
            <div style={{ display: "flex" }}>{s.value}</div>
          </div>)}
          {highlight ? <div style={{ display: "flex", fontSize: 19, lineHeight: 1.35, color: "#ececec" }}>{highlight}</div> : null}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, color: MUTED, marginTop: 14 }}>
        <div style={{ display: "flex" }}>Lo esperado descuenta los abandonos y usa 2014–2025 como referencia</div>
        <div style={{ display: "flex" }}>{host}/informe</div>
      </div>
    </div>,
    { width: 1200, height: 675, headers: { "Cache-Control": "public, max-age=600, s-maxage=1800, stale-while-revalidate=86400" } }
  );
}
