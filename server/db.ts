import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "murmur.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
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

  ALTER TABLE replies ADD COLUMN reply_to_name TEXT;

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
`);

export default db;
