import Link from "next/link";
import { games } from "@/lib/games";
import { GameLogo } from "./GameLogo";

export function GameGrid() {
  return (
    <div className="game-grid">
      {games.map((game) => (
        <Link className={`game-card game-${game.accent}`} href={`/juegos/${game.slug}`} key={game.slug}>
          <div className="game-topline"><span>{game.number}</span><b>{game.label}</b></div>
          <div className="game-glyph game-logo-frame" aria-hidden="true"><GameLogo src={game.logo} /></div>
          <h3>{game.title}</h3>
          <p>{game.copy}</p>
          <div className="game-footer"><span>{game.meta}</span><b>JUGAR →</b></div>
        </Link>
      ))}
    </div>
  );
}
