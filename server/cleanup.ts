import db from "./db.js";

const CUTOFF_SECONDS = 86400; // 24 hours

export async function runCleanup(): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - CUTOFF_SECONDS;

  await db.run("DELETE FROM replies WHERE created_at < ?", cutoff);
  await db.run("DELETE FROM posts WHERE created_at < ?", cutoff);
  await db.run("DELETE FROM messages WHERE created_at < ?", cutoff);
}

export function startCleanupJob(): void {
  runCleanup();
  setInterval(runCleanup, 60_000);
}
