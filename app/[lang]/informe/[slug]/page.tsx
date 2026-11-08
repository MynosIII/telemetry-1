import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RaceReport } from "@/components/RaceReport";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getRaceReport, roundForSlug } from "@/lib/race-report";
import { getReportTexts } from "@/lib/race-report-text";
import "../../race-report.css";

export const revalidate = 1800;

type Props = { params: Promise<{ lang: string; slug: string }> };

async function load(slug: string) {
  const target = await roundForSlug(slug);
  return target ? getRaceReport(String(target.round), target.season) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const report = await load(slug);
  if (!report) return { title: lang === "en" ? "Race report" : "Informe de carrera" };
  const title = lang === "en" ? `${report.season} ${report.englishName}: race report` : `Informe: ${report.name} ${report.season}`;
  const image = `/api/informe/${report.round}/imagen`;
  return {
    title,
    description: lang === "en"
      ? "Who finished above what their grid slot predicted, overtakes, records and race facts."
      : "Quién terminó por encima de lo que su lugar de largada hacía esperar, adelantamientos, récords y datos de la carrera.",
    alternates: { canonical: `/informe/${report.slug}` },
    openGraph: { title, images: [{ url: image, width: 1200, height: 675 }] },
    twitter: { card: "summary_large_image", images: [image] }
  };
}

export default async function RaceReportPage({ params }: Props) {
  const { lang: rawLang, slug } = await params;
  const lang = rawLang === "en" ? "en" : "es";
  const report = await load(slug);
  if (!report) notFound();
  const texts = await getReportTexts(report, lang);
  return <main id="top" className="ency-page"><SiteHeader /><RaceReport report={report} texts={texts} lang={lang} /><SiteFooter /></main>;
}
