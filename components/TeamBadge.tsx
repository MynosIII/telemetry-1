/* eslint-disable @next/next/no-img-element */
import { inkFor } from "@/lib/team-lineage";

// A team's logo when the logo index has one, otherwise a name badge in its livery colour.
export function TeamBadge({ name, color, logo, size = "md" }: { name: string; color: string; logo: string | null; size?: "sm" | "md" | "lg" }) {
  if (logo) return <span className={`team-badge team-badge-${size} has-logo`}><img src={logo} alt={`Logo de ${name}`} loading="lazy" /></span>;
  const ink = inkFor(color);
  const initials = name.split(/[\s-]+/).filter(Boolean).map(part => part[0]).join("").slice(0, 3).toUpperCase();
  return <span className={`team-badge team-badge-${size}`} style={{ ["--team" as string]: color, ["--team-ink" as string]: ink }}>
    <b aria-hidden="true">{initials}</b><small>{name}</small>
  </span>;
}
