const singular: Record<string, string> = {
  temporadas: "temporada", títulos: "título", victorias: "victoria", podios: "podio", carreras: "carrera",
  inscripciones: "inscripción", participaciones: "participación", "Grandes Premios": "Gran Premio", puntos: "punto"
};
const longDate = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Polishes generated archive prose: readable dates, singular counts and collapsed one-year ranges. */
export function tidyNarrative(text: string) {
  return text
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y, m, d) => longDate.format(new Date(`${y}-${m}-${d}T12:00:00Z`)))
    .replace(/(?<![\d.,])1 temporadas entre (\d{4}) y \1/g, "1 temporada, la de $1")
    .replace(/\b(\d{4})[–-]\1\b/g, "$1")
    .replace(/(?<![\d.,])1 (temporadas|títulos|victorias|podios|carreras|inscripciones|participaciones|Grandes Premios|puntos)\b/g, (_, word: string) => `1 ${singular[word]}`);
}

export function plural(count: number, one: string, many: string) {
  return `${count.toLocaleString("es-AR")} ${count === 1 ? one : many}`;
}
