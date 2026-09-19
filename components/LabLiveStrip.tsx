"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LiveModelSnapshot } from "@/lib/live-model";

export type LabLiveSummary = {
  coverage: string;
  nextRace: string;
  favorite: string;
  probability: string;
  refreshMode: "session" | "post-race";
  refreshSeconds: number;
};

function fromSnapshot(snapshot: LiveModelSnapshot): LabLiveSummary | null {
  if (snapshot.status !== "ready") return null;
  const favorite = snapshot.prediction[0];
  return {
    coverage: `${snapshot.coverage.completedRaces}/${snapshot.coverage.scheduledRaces} GP`,
    nextRace: snapshot.nextRace?.name ?? "POR CONFIRMAR",
    favorite: favorite?.name ?? "SIN DATOS",
    probability: favorite ? `${favorite.probability.toFixed(1)}%` : "",
    refreshMode: snapshot.probabilityRefresh.mode,
    refreshSeconds: snapshot.probabilityRefresh.seconds
  };
}

export function LabLiveStrip({ initialSummary }: { initialSummary: LabLiveSummary }) {
  const [summary, setSummary] = useState(initialSummary);

  useEffect(() => {
    if (summary.refreshMode !== "session") return;
    const refresh = async () => {
      try {
        const response = await fetch("/api/live-model", { cache: "no-store" });
        if (!response.ok) return;
        const next = fromSnapshot(await response.json());
        if (next) setSummary(next);
      } catch {
        // Keep the last verified probabilities if the source is temporarily unavailable.
      }
    };
    const timer = window.setInterval(refresh, summary.refreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [summary.refreshMode, summary.refreshSeconds]);

  return (
    <Link className="lab-live-strip" href="/estadisticas#modelo-2026">
      <span><i /> {summary.refreshMode === "session" ? "PROBABILIDADES · 15 MIN" : "OVERLAY 2026 POSTCARRERA"}</span>
      <b>{summary.coverage}</b>
      <b>PRÓXIMA · {summary.nextRace}</b>
      <strong>FAVORITO · {summary.favorite} {summary.probability}</strong>
      <em>VER MODELO →</em>
    </Link>
  );
}
