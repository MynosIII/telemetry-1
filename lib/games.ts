export type Game = {
  slug: string;
  number: string;
  label: string;
  title: string;
  copy: string;
  meta: string;
  accent: "red" | "yellow" | "blue" | "green";
  glyph: string;
  source: string;
};

/** The four quick games. El Predestinado has its own block on /juegos. */
export const games: Game[] = [
  {
    slug: "piloto",
    number: "01",
    label: "IDENTIDAD",
    title: "¿Quién es el piloto?",
    copy: "Descubrí al piloto con pistas de su carrera y estadísticas.",
    meta: "HISTORIA F1 · PISTAS POR INTENTO",
    accent: "red",
    glyph: "?",
    source: "https://f1-telemetry-games.vercel.app/f1-driver-guess/"
  },
  {
    slug: "circuito",
    number: "02",
    label: "GEOMETRÍA",
    title: "Adiviná el circuito",
    copy: "Reconocé trazados de todas las épocas por su silueta y sus curvas.",
    meta: "SILUETAS · TRES MODOS",
    accent: "yellow",
    glyph: "⌁",
    source: "https://f1-telemetry-games.vercel.app/f1-circuit-guesser/"
  },
  {
    slug: "higher-lower",
    number: "03",
    label: "ESTADÍSTICAS",
    title: "Higher or Lower",
    copy: "Elegí qué piloto tiene más victorias. Una racha, cero margen de error.",
    meta: "DUELO · RÉCORD PERSONAL",
    accent: "blue",
    glyph: "↕",
    source: "https://f1-telemetry-games.vercel.app/f1_higher_lower/"
  },
  {
    slug: "bingo",
    number: "04",
    label: "DESAFÍO",
    title: "F1 Bingo",
    copy: "Completá la grilla con pilotos que cumplan cada condición histórica.",
    meta: "LÓGICA · ARCHIVO COMPLETO",
    accent: "green",
    glyph: "▦",
    source: "https://f1-telemetry-games.vercel.app/f1-bingo/"
  }
];

export const predestinato = {
  slug: "predestinato",
  title: "El Predestinado",
  source: "https://predestinato.vercel.app/"
};
