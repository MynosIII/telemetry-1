import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { LabLiveStrip, type LabLiveSummary } from "@/components/LabLiveStrip";

type EmbeddedExperienceProps = {
  title: string;
  label: string;
  source: string;
  liveSummary?: LabLiveSummary;
  back?: { href: string; label: string };
};

export function EmbeddedExperience({ title, label, source, liveSummary, back = { href: "/", label: "INICIO" } }: EmbeddedExperienceProps) {
  return (
    <main className={`embedded-experience${liveSummary ? " with-live-strip" : ""}`}>
      <SiteHeader />
      <div className="embed-header">
        <div className="embed-title">
          <span>{label}</span>
          <h1>{title}</h1>
        </div>
        <div className="embed-actions">
          <Link href={back.href}>← {back.label}</Link>
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
