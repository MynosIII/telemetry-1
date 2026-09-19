import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { LabLiveStrip, type LabLiveSummary } from "@/components/LabLiveStrip";

type EmbeddedExperienceProps = {
  title: string;
  label: string;
  source: string;
  liveSummary?: LabLiveSummary;
};

export function EmbeddedExperience({ title, label, source, liveSummary }: EmbeddedExperienceProps) {
  return (
    <main className={`embedded-experience${liveSummary ? " with-live-strip" : ""}`}>
      <SiteHeader />
      <div className="embed-header">
        <div className="embed-title">
          <span>{label === "JUEGOS DE F1" ? "JUEGOS DE F1 / F1 GAMES" : label}</span>
          <strong>{title}</strong>
        </div>
        <div className="embed-actions">
          <Link href="/">← INICIO / HOME</Link>
          <a href={source} target="_blank" rel="noreferrer">ABRIR / OPEN ↗</a>
        </div>
      </div>
      {liveSummary ? (
        <LabLiveStrip initialSummary={liveSummary} />
      ) : null}
      <iframe
        className="experience-frame"
        src={source}
        title={title}
        allow="fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </main>
  );
}
