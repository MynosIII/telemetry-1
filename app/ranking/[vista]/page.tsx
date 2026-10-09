import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RankingFrame } from "@/components/RankingFrame";

const views = {
  "fan-index": { title: "Fan Index", description: "El mejor piloto de la historia según la opinión de los fans en internet.", source: "/laboratorio-historico/opinion/index.html" },
  encuesta: { title: "Encuesta", description: "Encuesta abierta de TelemetryOne sobre el mejor piloto de Fórmula 1.", source: "/laboratorio-historico/opinion/index.html#live-survey-title" }
} as const;

type Props = { params: Promise<{ vista: string }> };

export function generateStaticParams() {
  return Object.keys(views).map((vista) => ({ vista }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vista } = await params;
  const view = views[vista as keyof typeof views];
  return view ? { title: view.title, description: view.description } : { title: "Ranking" };
}

export default async function RankingViewPage({ params }: Props) {
  const { vista } = await params;
  const view = views[vista as keyof typeof views];
  if (!view) notFound();
  return <RankingFrame title={view.title} source={view.source} />;
}
