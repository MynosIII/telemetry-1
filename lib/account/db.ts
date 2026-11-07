import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/** Postgres (Neon) holds accounts, follows and saved game progress. Without DATABASE_URL accounts are off. */
let client: NeonQueryFunction<false, false> | null | undefined;
let schema: Promise<void> | undefined;

export function accountsEnabled() {
  return Boolean(process.env.DATABASE_URL && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET);
}

function sql() {
  if (client === undefined) client = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  if (!client) throw new Error("DATABASE_URL is not set");
  return client;
}

/** Creates the three tables the first time a cold instance touches the database. */
export function db() {
  const query = sql();
  schema ??= (async () => {
    await query`CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY, email text, name text, image text,
      created_at timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now())`;
    await query`CREATE TABLE IF NOT EXISTS follows (
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind text NOT NULL CHECK (kind IN ('driver', 'team')), entity_id text NOT NULL, label text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, kind, entity_id))`;
    await query`CREATE TABLE IF NOT EXISTS game_progress (
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game text NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, game))`;
  })().catch((error) => { schema = undefined; throw error; });
  return schema.then(() => query);
}

export type Follow = { kind: "driver" | "team"; id: string; label: string };

export async function upsertUser(user: { id: string; email?: string | null; name?: string | null; image?: string | null }) {
  const sql = await db();
  await sql`INSERT INTO users (id, email, name, image) VALUES (${user.id}, ${user.email ?? null}, ${user.name ?? null}, ${user.image ?? null})
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, image = EXCLUDED.image, last_seen = now()`;
}

export async function listFollows(userId: string): Promise<Follow[]> {
  const sql = await db();
  const rows = await sql`SELECT kind, entity_id, label FROM follows WHERE user_id = ${userId} ORDER BY created_at`;
  return rows.map((row) => ({ kind: row.kind, id: row.entity_id, label: row.label }));
}

export async function addFollow(userId: string, follow: Follow) {
  const sql = await db();
  await sql`INSERT INTO follows (user_id, kind, entity_id, label) VALUES (${userId}, ${follow.kind}, ${follow.id}, ${follow.label})
    ON CONFLICT (user_id, kind, entity_id) DO UPDATE SET label = EXCLUDED.label`;
}

export async function removeFollow(userId: string, kind: Follow["kind"], id: string) {
  const sql = await db();
  await sql`DELETE FROM follows WHERE user_id = ${userId} AND kind = ${kind} AND entity_id = ${id}`;
}

export async function listProgress(userId: string): Promise<Record<string, { data: unknown; updatedAt: string }>> {
  const sql = await db();
  const rows = await sql`SELECT game, data, updated_at FROM game_progress WHERE user_id = ${userId}`;
  return Object.fromEntries(rows.map((row) => [row.game, { data: row.data, updatedAt: new Date(row.updated_at).toISOString() }]));
}

export async function saveProgress(userId: string, game: string, data: unknown) {
  const sql = await db();
  await sql`INSERT INTO game_progress (user_id, game, data) VALUES (${userId}, ${game}, ${JSON.stringify(data)}::jsonb)
    ON CONFLICT (user_id, game) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
}

/** Deleting the user cascades to follows and progress. */
export async function deleteUser(userId: string) {
  const sql = await db();
  await sql`DELETE FROM users WHERE id = ${userId}`;
}
