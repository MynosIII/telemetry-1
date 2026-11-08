import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RaceReport } from "@/components/RaceReport";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getRaceReport } from "@/lib/race-report";
import "../../../race-report.css";

export const revalidate = 1800;

type Props = { params: Promise<{ round: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { round } = await params;
  const report = await getRaceReport(round);
  if (!report) return { title: "Informe de carrera" };
  const title = `${report.name} ${report.season}: llegada contra largada`;
  const image = `/api/informe/${report.round}/imagen`;
  return {
    title,
    description: "Quién terminó por encima de lo que su lugar de largada hacía esperar, adelantamientos, récords y datos de la carrera.",
    openGraph: { title, images: [{ url: image, width: 1200, height: 675 }] },
    twitter: { card: "summary_large_image", images: [image] }
  };
}

export default async function RaceReportPage({ params }: Props) {
  const { round } = await params;
  const report = await getRaceReport(round);
  if (!report) notFound();
  return <main id="top" className="ency-page"><SiteHeader /><RaceReport report={report} /><SiteFooter /></main>;
}
