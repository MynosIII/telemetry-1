import type { Metadata } from "next";
import { GameGrid } from "@/components/GameGrid";
import { PredestinatoFeature } from "@/components/PredestinatoFeature";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Juegos",
  description: "El Predestinado y los juegos de Fórmula 1 de Telemetry 1."
};

export default function GamesPage() {
  return (
    <main id="top" className="inner-page games-page">
      <SiteHeader />
      <PredestinatoFeature />
      <section className="section section-dark" id="juegos" aria-labelledby="games-title">
        <div className="section-heading heading-dark">
          <div>
            <p className="eyebrow eyebrow-yellow">PARTIDAS RÁPIDAS</p>
            <h2 id="games-title">MÁS <em>JUEGOS</em></h2>
          </div>
        </div>
        <GameGrid />
      </section>
      <SiteFooter />
    </main>
  );
}
