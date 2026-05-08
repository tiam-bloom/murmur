import db from "./db.js";

const CUTOFF_SECONDS = 86400; // 24 hours

export function runCleanup(): void {
  const cutoff = Math.floor(Date.now() / 1000) - CUTOFF_SECONDS;

  const cleanup = db.transaction(() => {
    db.prepare("DELETE FROM replies WHERE created_at < ?").run(cutoff);
    db.prepare("DELETE FROM posts WHERE created_at < ?").run(cutoff);
    db.prepare("DELETE FROM messages WHERE created_at < ?").run(cutoff);
  });

  cleanup();
}

export function startCleanupJob(): void {
  runCleanup();
  setInterval(runCleanup, 60_000);
}
