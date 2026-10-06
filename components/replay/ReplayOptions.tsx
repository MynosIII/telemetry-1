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

/** Columns of the classification after position and driver, in display order. */
export const TOWER_COLUMNS = [
  { key: "gap", label: "Al líder", width: 70, on: true },
  { key: "interval", label: "Intervalo", width: 64, on: true },
  { key: "last", label: "Última vuelta", width: 70, on: true },
  { key: "best", label: "Mejor vuelta", width: 70, on: true },
  { key: "tyre", label: "Neumático", width: 54, on: true },
  { key: "pits", label: "Paradas", width: 30, on: true },
  { key: "speed", label: "Velocidad", width: 40, on: false },
  { key: "gear", label: "Marcha", width: 40, on: false },
  { key: "pedals", label: "Acelerador y freno", width: 64, on: false },
  { key: "minisectors", label: "Minisectores", width: 156, on: false }
] as const;

export type ColumnKey = (typeof TOWER_COLUMNS)[number]["key"];

const STORAGE_KEY = "replay-hidden-panels";
const COLUMNS_KEY = "replay-tower-columns";
const DEFAULT_COLUMNS = TOWER_COLUMNS.filter((column) => column.on).map((column) => column.key as ColumnKey);

function save(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The choice still applies until the page reloads.
  }
}

/** Which replay panels the viewer has turned off, remembered in this browser. */
export function usePanelSettings() {
  const [hidden, setHidden] = useState<Set<PanelKey>>(new Set());
  const [columns, setColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_COLUMNS));
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(saved)) setHidden(new Set(saved.filter((key) => PANELS.some((panel) => panel.key === key))));
      const savedColumns = JSON.parse(window.localStorage.getItem(COLUMNS_KEY) ?? "null");
      if (Array.isArray(savedColumns)) setColumns(new Set(savedColumns.filter((key) => TOWER_COLUMNS.some((column) => column.key === key))));
    } catch {
      // Without storage the defaults apply.
    }
  }, []);
  const toggle = (key: PanelKey) => setHidden((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    save(STORAGE_KEY, [...next]);
    return next;
  });
  const toggleColumn = (key: ColumnKey) => setColumns((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    save(COLUMNS_KEY, [...next]);
    return next;
  });
  return {
    shows: (key: PanelKey) => !hidden.has(key),
    toggle,
    columns: TOWER_COLUMNS.filter((column) => columns.has(column.key)),
    hasColumn: (key: ColumnKey) => columns.has(key),
    toggleColumn
  };
}

export function PanelOptions({ shows, toggle, hasColumn, toggleColumn }: ReturnType<typeof usePanelSettings>) {
  return (
    <details className="replay-options">
      <summary>Opciones</summary>
      <div className="replay-options-list">
        <fieldset>
          <legend>Clasificación</legend>
          {TOWER_COLUMNS.map((column) => (
            <label key={column.key}>
              <input type="checkbox" checked={hasColumn(column.key)} onChange={() => toggleColumn(column.key)} />
              {column.label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Paneles</legend>
          {PANELS.map((panel) => (
            <label key={panel.key}>
              <input type="checkbox" checked={shows(panel.key)} onChange={() => toggle(panel.key)} />
              {panel.label}
            </label>
          ))}
        </fieldset>
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
