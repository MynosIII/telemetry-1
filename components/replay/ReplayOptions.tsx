"use client";

import { Component, useEffect, useState, type ReactNode } from "react";

export const PANELS = [
  { key: "map", label: "Mapa" },
  { key: "radar", label: "Lluvia" },
  { key: "weather", label: "Clima" },
  { key: "driver", label: "Piloto elegido" },
  { key: "pits", label: "Paradas" },
  { key: "control", label: "Dirección de carrera" },
  { key: "incidents", label: "Incidentes" },
  { key: "radios", label: "Radios" },
  { key: "championship", label: "Campeonato" }
] as const;

export type PanelKey = (typeof PANELS)[number]["key"];

const STORAGE_KEY = "replay-hidden-panels";

/** Which replay panels the viewer has turned off, remembered in this browser. */
export function usePanelSettings() {
  const [hidden, setHidden] = useState<Set<PanelKey>>(new Set());
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(saved)) setHidden(new Set(saved.filter((key) => PANELS.some((panel) => panel.key === key))));
    } catch {
      // Without storage every panel shows.
    }
  }, []);
  const toggle = (key: PanelKey) => setHidden((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // The choice still applies until the page reloads.
    }
    return next;
  });
  return { shows: (key: PanelKey) => !hidden.has(key), toggle };
}

export function PanelOptions({ shows, toggle }: ReturnType<typeof usePanelSettings>) {
  return (
    <details className="replay-options">
      <summary>Paneles</summary>
      <div className="replay-options-list">
        {PANELS.map((panel) => (
          <label key={panel.key}>
            <input type="checkbox" checked={shows(panel.key)} onChange={() => toggle(panel.key)} />
            {panel.label}
          </label>
        ))}
      </div>
    </details>
  );
}

/** Keeps one broken panel from taking the whole replay down with it. */
export class PanelBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`Replay panel "${this.props.name}" failed`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="replay-panel replay-panel-failed">
        <p className="replay-empty">No pudimos mostrar {this.props.name} para este momento.</p>
        <button type="button" onClick={() => this.setState({ failed: false })}>Reintentar</button>
      </section>
    );
  }
}
