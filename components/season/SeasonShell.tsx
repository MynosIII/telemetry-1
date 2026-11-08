import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { seasonTeam } from "@/lib/season-teams";
import "@/app/[lang]/season-analysis.css";

/** Frame shared by the Temporada analysis pages: the sober archive look, one title, one line. */
export function SeasonShell({ title, subtitle, children, method }: { title: string; subtitle?: ReactNode; children: ReactNode; method?: ReactNode }) {
  return (
    <main id="top" className="ency-page season-page">
      <SiteHeader />
      <div className="ency-page-wrap season-wrap">
        <header className="ency-title">
          <nav className="ency-breadcrumb" aria-label="Ruta"><Link href="/temporada">Temporada</Link><span>/</span><span>{title}</span></nav>
          <h1>{title}</h1>
          {subtitle ? <p className="ency-subtitle">{subtitle}</p> : null}
        </header>
        {children}
        {method ? <details className="ency-method season-method"><summary>Cómo se calcula</summary>{method}</details> : null}
      </div>
      <SiteFooter />
    </main>
  );
}

export function TeamName({ id, children }: { id: string; children?: ReactNode }) {
  const team = seasonTeam(id);
  return <span className="season-team"><i style={{ background: team.color }} aria-hidden="true" />{children ?? team.name}</span>;
}

export function SeasonEmpty({ children }: { children: ReactNode }) {
  return <p className="ency-empty">{children}</p>;
}

export const decimal = (value: number | null | undefined, digits = 3) =>
  value === null || value === undefined || !Number.isFinite(value) ? "—" : value.toLocaleString("es-AR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function lapTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(3).padStart(6, "0")}`;
}
