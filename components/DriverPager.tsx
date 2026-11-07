"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { readDriverSequence } from "@/lib/driver-sequence";

type Neighbour = { href: string; name: string } | undefined;

/** Anterior / Siguiente on a driver profile. Follows the list the visitor came from when there is one. */
export function DriverPager({ driverId, previous, next, children }: { driverId: string; previous: Neighbour; next: Neighbour; children: ReactNode }) {
  const [neighbours, setNeighbours] = useState({ previous, next });
  useEffect(() => {
    const sequence = readDriverSequence();
    const index = sequence?.ids.indexOf(driverId) ?? -1;
    if (!sequence || index < 0) return;
    const at = (i: number): Neighbour => i >= 0 && i < sequence.ids.length ? { href: `/pilotos/${sequence.ids[i]}`, name: sequence.names[i] } : undefined;
    setNeighbours({ previous: at(index - 1), next: at(index + 1) });
  }, [driverId]);
  const { previous: before, next: after } = neighbours;
  return <>
    {before ? <Link prefetch={false} href={before.href} aria-label={`Piloto anterior: ${before.name}`} title={before.name}>←<span>Anterior</span></Link> : <span />}
    {children}
    {after ? <Link prefetch={false} href={after.href} aria-label={`Piloto siguiente: ${after.name}`} title={after.name}><span>Siguiente</span>→</Link> : <span />}
  </>;
}
