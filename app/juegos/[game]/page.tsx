import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbeddedExperience } from "@/components/EmbeddedExperience";
import { games, predestinato } from "@/lib/games";

const entries = [...games, predestinato];

type Props = { params: Promise<{ game: string }> };

export function generateStaticParams() {
  return entries.map(({ slug }) => ({ game: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game } = await params;
  const entry = entries.find(({ slug }) => slug === game);
  return { title: entry?.title ?? "Juego" };
}

export default async function GamePage({ params }: Props) {
  const { game } = await params;
  const entry = entries.find(({ slug }) => slug === game);
  if (!entry) notFound();
  return (
    <EmbeddedExperience
      label={entry === predestinato ? "JUEGOS · MODO CARRERA" : "JUEGOS"}
      title={entry.title}
      source={entry.source}
      logo={entry.logo}
      back={{ href: "/juegos", label: "JUEGOS" }}
    />
  );
}
