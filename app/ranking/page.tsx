import type { Metadata } from "next";
import { RankingFrame } from "@/components/RankingFrame";

export const metadata: Metadata = {
  title: "Ranking",
  description: "Ranking ELO histórico de pilotos y autos de Fórmula 1, modelo TelemetryOne v7.6."
};

export default function RankingPage() {
  return <RankingFrame title="Ranking histórico de pilotos y autos · Modelo v7.6" source="/laboratorio-historico/index.html" />;
}
