"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RaceReplay } from "@/components/replay/RaceReplay";
import type { ReplaySessionSummary } from "@/lib/replay";

type LiveStatus = { session: ReplaySessionSummary | null; live: boolean; configured: boolean };

/** Follows the session on track with the replay layout; between sessions it points to the last one. */
export function LiveCenter() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = () => fetch("/api/live/session", { cache: "no-store" })
      .then((response) => response.json() as Promise<LiveStatus>)
      .then((value) => {
        if (cancelled) return;
        setFailed(false);
        // Only swap views when the live state actually changes.
        setStatus((current) => (current && current.live === value.live && current.session?.key === value.session?.key ? current : value));
      })
      .catch(() => !cancelled && setFailed(true));
    check();
    const timer = window.setInterval(check, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!status) return <p className="replay-loading">{failed ? "No pudimos consultar OpenF1. Volvemos a intentar en un minuto." : "Buscando la sesión en pista…"}</p>;

  if (status.live && status.session) return <RaceReplay key={status.session.key} liveSession={status.session.key} />;

  return (
    <div className="live-idle">
      <p>Ahora no hay ninguna sesión en pista.</p>
      {status.session && (
        <p>
          La última fue {status.session.meeting}, {status.session.name.toLowerCase()}.{" "}
          <Link href={`/en-vivo/repeticion?sesion=${status.session.key}`}>Verla en Repetición</Link>
        </p>
      )}
    </div>
  );
}
