import type { Metadata } from "next";
import { EmbeddedExperience } from "@/components/EmbeddedExperience";
import { getLiveModelSnapshot } from "@/lib/live-model";

export const metadata: Metadata = {
  title: "Laboratorio histórico",
  description: "Comparador histórico de rendimiento de pilotos."
};

export const revalidate = 900;

export default async function HistoricalLabPage() {
  const snapshot = await getLiveModelSnapshot();
  const favorite = snapshot.prediction[0];
  return (
    <EmbeddedExperience
      label="TELEMETRY ONE"
      title="Laboratorio histórico"
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
