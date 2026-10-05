import { inkFor } from "@/lib/team-lineage";
import { FallbackImage } from "./FallbackImage";

// The team's logo file when it exists, otherwise a name badge in its livery colour.
export function TeamBadge({ name, color, logo, size = "md" }: { name: string; color: string; logo: string | null; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(/[\s-]+/).filter(Boolean).map(part => part[0]).join("").slice(0, 3).toUpperCase();
  const badge = <span className={`team-badge team-badge-${size}`} style={{ ["--team" as string]: color, ["--team-ink" as string]: inkFor(color) }}>
    <b aria-hidden="true">{initials}</b><small>{name}</small>
  </span>;
  return <FallbackImage sources={logo ? [logo] : []} alt={`Logo de ${name}`} className={`team-badge team-badge-${size} has-logo`} fallback={badge} />;
}
