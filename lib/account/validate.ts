import { games, predestinato } from "@/lib/games";

export const PROGRESS_GAMES = [...games, predestinato].map((game) => game.slug);
export const MAX_PROGRESS_BYTES = 16_000;
const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function parseFollow(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const { kind, id, label } = body as Record<string, unknown>;
  if (kind !== "driver" && kind !== "team") return null;
  if (typeof id !== "string" || !ID.test(id)) return null;
  const name = typeof label === "string" ? label.trim().slice(0, 80) : "";
  return { kind, id, label: name || id } as const;
}

export function isProgressGame(game: unknown): game is string {
  return typeof game === "string" && PROGRESS_GAMES.includes(game);
}
