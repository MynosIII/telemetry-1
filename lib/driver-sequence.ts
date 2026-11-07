// Remembers the order of the driver list the visitor opened a profile from (the Estadísticas list with
// its filters and sort, or the Ranking), so the profile's Anterior / Siguiente walk that same list.
// The Ranking lab (public/laboratorio-historico/index.html) writes the same key and shape.
export const DRIVER_SEQUENCE_KEY = "t1:driver-sequence";

export type DriverSequence = { ids: string[]; names: string[] };

export function saveDriverSequence(drivers: { id: string; name: string }[]) {
  try {
    const value: DriverSequence = { ids: drivers.map(d => d.id), names: drivers.map(d => d.name) };
    sessionStorage.setItem(DRIVER_SEQUENCE_KEY, JSON.stringify(value));
  } catch {}
}

export function readDriverSequence(): DriverSequence | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(DRIVER_SEQUENCE_KEY) ?? "null");
    return Array.isArray(value?.ids) && Array.isArray(value?.names) ? value : null;
  } catch {
    return null;
  }
}
