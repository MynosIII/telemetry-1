import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbeddedExperience } from "@/components/EmbeddedExperience";

const games = {
  piloto: { title: "¿Quién es el piloto?", source: "https://f1-telemetry-games.vercel.app/f1-driver-guess/" },
  circuito: { title: "Adiviná el circuito", source: "https://f1-telemetry-games.vercel.app/f1-circuit-guesser/" },
  "higher-lower": { title: "Higher or Lower", source: "https://f1-telemetry-games.vercel.app/f1_higher_lower/" },
  bingo: { title: "F1 Bingo", source: "https://f1-telemetry-games.vercel.app/f1-bingo/" }
} as const;

type Props = { params: Promise<{ game: string }> };

export function generateStaticParams() {
  return Object.keys(games).map((game) => ({ game }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game } = await params;
  const entry = games[game as keyof typeof games];
  return { title: entry?.title ?? "Juego" };
}

export default async function GamePage({ params }: Props) {
  const { game } = await params;
  const entry = games[game as keyof typeof games];
  if (!entry) notFound();
  return <EmbeddedExperience label="JUEGOS DE F1" title={entry.title} source={entry.source} />;
}
