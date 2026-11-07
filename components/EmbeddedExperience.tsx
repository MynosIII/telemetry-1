import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { GameLogo } from "./GameLogo";
import { GameProgressBridge } from "./account/GameProgressBridge";

type EmbeddedExperienceProps = {
  title: string;
  label: string;
  source: string;
  logo?: string;
  back?: { href: string; label: string };
  /** Game slug: lets the game save progress to the visitor's account. */
  game?: string;
};

export function EmbeddedExperience({ title, label, source, logo, back = { href: "/", label: "INICIO" }, game }: EmbeddedExperienceProps) {
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
      {game ? <GameProgressBridge game={game} source={source} frameId="experience-frame" /> : null}
      <iframe
        id="experience-frame"
        className="experience-frame"
        src={source}
        title={title}
        allow="fullscreen; web-share; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </main>
  );
}
