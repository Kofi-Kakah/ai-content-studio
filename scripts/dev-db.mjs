/**
 * Local development database.
 *
 * Boots a zero-config embedded PostgreSQL (binaries from the `embedded-postgres`
 * npm package — no Docker required) so the whole stack can run locally.
 *
 * In production, point DATABASE_URL at a hosted Postgres such as Neon.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const databaseDir = resolve(".pgdata");
const persistent = existsSync(resolve(databaseDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: 54329,
  persistent,
  onLog: (msg) => console.log(`[pg] ${msg}`),
  onError: (err) => console.error(`[pg] ${err.message}`),
});

if (!persistent) {
  console.log("[db] initialising embedded postgres at", databaseDir);
  await pg.initialise();
}

await pg.start();
console.log("[db] embedded postgres running on port 54329");

try {
  await pg.createDatabase("aistudio");
  console.log("[db] created database 'aistudio'");
} catch {
  console.log("[db] database 'aistudio' already exists");
}

console.log("[db] connection string:");
console.log("     postgresql://postgres:postgres@localhost:54329/aistudio");
