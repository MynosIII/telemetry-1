export const statLabels = { wins: "Victorias", poles: "Pole positions", fastestLaps: "Vueltas rápidas", podiums: "Podios", lapsLed: "Vueltas en cabeza", kmLed: "Km en cabeza", laps: "Vueltas recorridas", km: "Km recorridos" };
export const dimensionLabels = { drivers: "Pilotos", constructors: "Constructores", engines: "Motores", nations: "Naciones" };
export const number = (value: number | null | undefined, decimals = 0) => value == null ? "—" : value.toLocaleString("es-AR", { maximumFractionDigits: decimals });
export const percent = (value: number | null | undefined) => value == null ? "—" : `${number(value * 100, 2)}%`;
export const dateLabel = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const eventCodes: Record<string, string> = { "Australian": "AUS", "Austrian": "AUT", "British": "GBR", "French": "FRA", "German": "GER", "South African": "RSA", "United States": "USA", "Dutch": "NED", "Swiss": "SUI", "Indianapolis 500": "500", "São Paulo": "SAP", "Saudi Arabian": "SAU", "Emilia Romagna": "EMI", "Las Vegas": "LVG" };
export function raceCode(name: string) { const title = name.replace("Grand Prix", "").trim(); return eventCodes[title] ?? title.slice(0, 3).toUpperCase(); }
export function resultColor(position: string | number | null, retired?: string | null) {
  if (position === 1) return "finish-gold";
  if (position === 2) return "finish-silver";
  if (position === 3) return "finish-bronze";
  if (typeof position === "number") return retired ? "finish-retired" : "finish-classified";
  return position === "DNQ" || position === "DNPQ" || position === "DNS" ? "finish-no-start" : "finish-retired";
}
