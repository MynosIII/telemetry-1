import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { GameLogo } from "./GameLogo";

type EmbeddedExperienceProps = {
  title: string;
  label: string;
  source: string;
  logo?: string;
  back?: { href: string; label: string };
};

export function EmbeddedExperience({ title, label, source, logo, back = { href: "/", label: "INICIO" } }: EmbeddedExperienceProps) {
  return (
    <main className="embedded-experience">
      <SiteHeader />
      <div className="embed-header">
        <div className="embed-identity">
          {logo ? <GameLogo src={logo} /> : null}
          <div className="embed-title">
          <span>{label}</span>
          <h1>{title}</h1>
          </div>
        </div>
        <div className="embed-actions">
          <Link href={back.href}>← {back.label}</Link>
          <a href={source} target="_blank" rel="noreferrer">ABRIR / OPEN ↗</a>
        </div>
      </div>
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
