import { notFound, permanentRedirect } from "next/navigation";
import { getRaceReport } from "@/lib/race-report";

export const revalidate = 1800;

// Old address: each report now lives at /informe/<race>-<yy>.
export default async function OldRaceReportPage({ params }: { params: Promise<{ round: string }> }) {
  const { round } = await params;
  const report = await getRaceReport(round);
  if (!report) notFound();
  permanentRedirect(`/informe/${report.slug}`);
}
