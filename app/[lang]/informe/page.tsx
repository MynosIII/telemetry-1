import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getRaceReport } from "@/lib/race-report";
import "../race-report.css";

// Always the latest race: sends the visitor to that race's own report (/informe/brasil-26).
export const revalidate = 1800;

export default async function LatestRaceReportPage() {
  const report = await getRaceReport("ultima");
  if (report) redirect(`/informe/${report.slug}`);
  return <main id="top" className="ency-page"><SiteHeader />
    <div className="ency-page-wrap race-report"><header className="ency-title"><h1>Informe de la última carrera</h1><p className="ency-subtitle race-report-empty">Los resultados no están disponibles en este momento. Probá de nuevo en unos minutos.</p></header></div>
  <SiteFooter /></main>;
}
