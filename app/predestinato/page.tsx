import type { Metadata } from "next";
import { EmbeddedExperience } from "@/components/EmbeddedExperience";

export const metadata: Metadata = {
  title: "El Predestinado",
  description: "El modo carrera de Formula 1 dentro de Telemetry 1."
};

export default function PredestinatoPage() {
  return (
    <EmbeddedExperience
      label="MODO CARRERA"
      title="El Predestinado"
      source="https://predestinato.vercel.app/"
    />
  );
}
