import type { Metadata } from "next";
import { RaceReport } from "@/components/RaceReport";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getRaceReport } from "@/lib/race-report";
import "../race-report.css";

// The latest race of the season. The weekly cron refreshes it once the classification is final.
export const revalidate = 1800;

export async function generateMetadata(): Promise<Metadata> {
  const report = await getRaceReport("ultima");
  const title = report ? `${report.name} ${report.season}: llegada contra largada` : "Informe de la última carrera";
  const image = report ? `/api/informe/${report.round}/imagen` : undefined;
  return {
    title,
    description: "Quién terminó por encima de lo que su lugar de largada hacía esperar, adelantamientos, récords y datos de la última carrera.",
    openGraph: image ? { title, images: [{ url: image, width: 1200, height: 675 }] } : undefined,
    twitter: image ? { card: "summary_large_image", images: [image] } : undefined
  };
}

export default async function LatestRaceReportPage() {
  const report = await getRaceReport("ultima");
  return <main id="top" className="ency-page"><SiteHeader />
    {report ? <RaceReport report={report} /> : <div className="ency-page-wrap race-report"><header className="ency-title"><h1>Informe de la última carrera</h1><p className="ency-subtitle race-report-empty">Los resultados no están disponibles en este momento. Probá de nuevo en unos minutos.</p></header></div>}
  <SiteFooter /></main>;
}
