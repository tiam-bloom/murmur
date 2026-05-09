import dotenv from "dotenv";
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const DB_PATH = path.join(__dirname, "..", "murmur.db");

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

export interface DbResult {
  lastInsertRowid: number;
  changes: number;
}

export interface DbInterface {
  all(sql: string, ...params: any[]): Promise<unknown[]>;
  get(sql: string, ...params: any[]): Promise<unknown | undefined>;
  run(sql: string, ...params: any[]): Promise<DbResult>;
  exec(sql: string): Promise<void>;
}

const useTurso = Boolean(TURSO_URL && TURSO_TOKEN);

function createLocalDb(): DbInterface {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return {
    all(sql, ...params) {
      return Promise.resolve(sqlite.prepare(sql).all(...params));
    },
    get(sql, ...params) {
      return Promise.resolve(sqlite.prepare(sql).get(...params));
    },
    run(sql, ...params) {
      return Promise.resolve(sqlite.prepare(sql).run(...params) as DbResult);
    },
    exec(sql) {
      sqlite.exec(sql);
      return Promise.resolve();
    },
  };
}

function createTursoDb(): DbInterface {
  const client = createClient({
    url: TURSO_URL!,
    authToken: TURSO_TOKEN!,
  });

  return {
    async all(sql, ...params) {
      const rs = await client.execute({ sql, args: params });
      return Array.from(rs.rows);
    },
    async get(sql, ...params) {
      const rs = await client.execute({ sql, args: params });
      return rs.rows[0];
    },
    async run(sql, ...params) {
      const rs = await client.execute({ sql, args: params });
      return {
        lastInsertRowid: Number(rs.lastInsertRowid ?? 0),
        changes: rs.rowsAffected,
      };
    },
    async exec(sql) {
      await client.executeMultiple(sql);
    },
  };
}

const db: DbInterface = useTurso ? createTursoDb() : createLocalDb();

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    fingerprint_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    reply_to_name TEXT,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_hash TEXT NOT NULL,
    to_hash TEXT NOT NULL,
    from_name TEXT NOT NULL,
    to_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    read INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
  CREATE INDEX IF NOT EXISTS idx_posts_fingerprint ON posts(fingerprint_hash);
  CREATE INDEX IF NOT EXISTS idx_posts_display_name ON posts(display_name);
  CREATE INDEX IF NOT EXISTS idx_replies_post_id ON replies(post_id);
  CREATE INDEX IF NOT EXISTS idx_replies_created_at ON replies(created_at);
  CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_hash, created_at);
  CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_hash, created_at);
  CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
  CREATE INDEX IF NOT EXISTS idx_messages_from_name ON messages(from_name);
`;

export async function initDb(): Promise<void> {
  const label = useTurso
    ? `Turso: ${TURSO_URL}`
    : `local SQLite: ${DB_PATH}`;
  console.log(`Using ${label}`);

  try {
    await db.exec(SCHEMA_SQL);
  } catch (err: any) {
    console.error(`Failed to initialize ${label}`);
    if (useTurso) {
      console.error("Check that TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are correct, and the database is reachable.");
    }
    throw err;
  }

  // One-time migration: add reply_to_name column
  try {
    await db.exec("ALTER TABLE replies ADD COLUMN reply_to_name TEXT");
  } catch {
    // Column already exists
  }
}

export default db;
