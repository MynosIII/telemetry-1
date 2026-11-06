import type { Metadata } from "next";
import { RaceReplay } from "@/components/replay/RaceReplay";
import { ReplaySource } from "@/components/replay/ReplaySource";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Repetición",
  description: "Cualquier carrera o sesión desde 2023 otra vez: mapa con los autos, tiempos, neumáticos, clima y dirección de carrera."
};

export default function ReplayPage() {
  return (
    <main className="inner-page replay-page">
      <SiteHeader />
      <div className="replay-content">
        <header className="replay-head">
          <h1>Repetición</h1>
        </header>
        <RaceReplay />
        <ReplaySource />
      </div>
      <SiteFooter />
    </main>
  );
}
