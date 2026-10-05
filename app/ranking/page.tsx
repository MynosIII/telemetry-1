import type { Metadata } from "next";
import { EmbeddedExperience } from "@/components/EmbeddedExperience";
import { getLiveModelSnapshot } from "@/lib/live-model";

export const metadata: Metadata = {
  title: "Ranking",
  description: "Ranking ELO histórico de pilotos y autos de Fórmula 1, modelo TelemetryOne v7.6."
};

export const revalidate = 900;

export default async function RankingPage() {
  const snapshot = await getLiveModelSnapshot();
  const favorite = snapshot.prediction[0];
  return (
    <EmbeddedExperience
      label="RANKING · MODELO V7.6"
      title="Ranking histórico"
      source="/laboratorio-historico/index.html"
      liveSummary={snapshot.status === "ready" ? {
        coverage: `${snapshot.coverage.completedRaces}/${snapshot.coverage.scheduledRaces} GP`,
        nextRace: snapshot.nextRace?.name ?? "POR CONFIRMAR",
        favorite: favorite?.name ?? "SIN DATOS",
        probability: favorite ? `${favorite.probability.toFixed(1)}%` : "",
        refreshMode: snapshot.probabilityRefresh.mode,
        refreshSeconds: snapshot.probabilityRefresh.seconds
      } : undefined}
    />
  );
}
