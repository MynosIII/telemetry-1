// Client-safe labels and types. Keep filesystem access in history.ts on the server.
export const historyCategories = {
  drivers: "Pilotos", constructors: "Constructores", engines: "Motores",
  circuits: "Circuitos", nations: "Naciones", tyres: "Neumáticos",
  "grands-prix": "Grandes Premios", seasons: "Temporadas"
} as const;
export type { HistoryCategory, HistorySummary } from "./history";
