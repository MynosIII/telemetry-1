/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { FallbackImage } from "./FallbackImage";
import { driverPhoto } from "@/lib/driver-photos";
import { teamLogo } from "@/lib/team-media";
import { layoutDrawing } from "@/lib/circuit-layouts";

/** Outline of a historic circuit layout; renders nothing when the layout has no drawing. */
export function CircuitLayoutFigure({ layoutId, alt, children }: { layoutId: string | null | undefined; alt: string; children?: ReactNode }) {
  const src = layoutDrawing(layoutId);
  if (!src) return null;
  return <figure className="circuit-layout"><img src={src} alt={alt} width={500} height={500} loading="lazy" />{children ? <figcaption>{children}</figcaption> : null}</figure>;
}

/** Driver portrait; disappears if the driver has none or the file fails to load. */
export function DriverPortrait({ id, name, className = "archive-portrait" }: { id: string | null | undefined; name: string; className?: string }) {
  const url = id ? driverPhoto(id) : null;
  return url ? <FallbackImage className={className} sources={[url]} alt={`Retrato de ${name}`} fallback={null} /> : null;
}

/** Constructor logo; disappears if the file is missing. */
export function TeamMark({ id, name }: { id: string | null | undefined; name: string }) {
  return id ? <FallbackImage className="archive-team-mark" sources={[teamLogo(id)]} alt={`Logo de ${name}`} fallback={null} /> : null;
}
