import type { Metadata } from "next";
import { ReplaySource } from "@/components/replay/ReplaySource";
import { TelemetryExplorer } from "@/components/replay/TelemetryExplorer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Telemetría",
  description: "Velocidad, acelerador, freno, marchas y RPM de cualquier vuelta desde 2023, y la comparación entre dos pilotos."
};

export default function TelemetryPage() {
  return (
    <main className="inner-page replay-page">
      <SiteHeader />
      <div className="replay-content">
        <header className="replay-head">
          <h1>Telemetría</h1>
        </header>
        <TelemetryExplorer />
        <ReplaySource />
      </div>
      <SiteFooter />
    </main>
  );
}
