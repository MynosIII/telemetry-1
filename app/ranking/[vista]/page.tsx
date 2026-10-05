import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbeddedExperience } from "@/components/EmbeddedExperience";

const views = {
  "fan-index": { title: "Fan Index", label: "RANKING · VOTO DE LOS FANS", source: "/laboratorio-historico/opinion/index.html" },
  encuesta: { title: "Encuesta", label: "RANKING · FAN INDEX", source: "/laboratorio-historico/opinion/index.html#live-survey-title" },
  modelo: { title: "Modelo v7.6", label: "RANKING · METODOLOGÍA", source: "/laboratorio-historico/index.html#methodology-section" }
} as const;

type Props = { params: Promise<{ vista: string }> };

export function generateStaticParams() {
  return Object.keys(views).map((vista) => ({ vista }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vista } = await params;
  return { title: views[vista as keyof typeof views]?.title ?? "Ranking" };
}

export default async function RankingViewPage({ params }: Props) {
  const { vista } = await params;
  const view = views[vista as keyof typeof views];
  if (!view) notFound();
  return <EmbeddedExperience label={view.label} title={view.title} source={view.source} />;
}
