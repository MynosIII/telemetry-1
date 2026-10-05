const singular: Record<string, string> = {
  temporadas: "temporada", títulos: "título", victorias: "victoria", podios: "podio", carreras: "carrera",
  inscripciones: "inscripción", participaciones: "participación", "Grandes Premios": "Gran Premio", puntos: "punto"
};
const longDate = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Generated sentences that only describe the page itself; the archive data still carries them.
const filler = [
  / Estos resultados pertenecen a las combinaciones de piloto, constructor, motor y neumáticos registradas en cada carrera\./g,
  / La gráfica permite contrastar esa concentración de resultados con el resto de su trayectoria\./g,
  / La evolución por temporada permite poner es[eo]s? campeonatos? en relación con sus resultados y los equipos y motores de cada etapa\./g,
  / Esta estimación se interpreta junto a los resultados de ese mismo conjunto de carreras, que puede ser distinto del archivo completo\./g,
  / La ficha reúne los registros del fin de semana y la clasificación oficial\./g,
  / Sus expectativas de victoria y rendimiento se muestran junto a los cambios de ELO, con la identidad del auto y la calidad documentada por la investigación\./g,
  / Para leer una trayectoria tan larga conviene distinguir [^.]*\.( Aquí se sigue la identidad de constructor que registra F1DB\.)?/g
];

/** Polishes generated archive prose: drops self-referential filler, readable dates, singular counts and collapsed one-year ranges. */
export function tidyNarrative(text: string) {
  return filler.reduce((out, pattern) => out.replace(pattern, ""), text)
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y, m, d) => longDate.format(new Date(`${y}-${m}-${d}T12:00:00Z`)))
    .replace(/(?<![\d.,])1 temporadas entre (\d{4}) y \1/g, "1 temporada, la de $1")
    .replace(/\b(\d{4})[–-]\1\b/g, "$1")
    // Some archive files say "31 temporada": counts other than one take the plural.
    .replace(/(?<![\d.,])(\d{2,}|[02-9]) (temporada|victoria|podio|piloto|prueba|carrera|inscripción|participación)(?![\wáéíóúñ])/g, (_, n: string, word: string) => `${n} ${word.endsWith("ión") ? `${word.slice(0, -3)}iones` : `${word}s`}`)
    .replace(/(?<![\d.,])1 (temporadas|títulos|victorias|podios|carreras|inscripciones|participaciones|Grandes Premios|puntos)\b/g, (_, word: string) => `1 ${singular[word]}`);
}

export function plural(count: number, one: string, many: string) {
  return `${count.toLocaleString("es-AR")} ${count === 1 ? one : many}`;
}
