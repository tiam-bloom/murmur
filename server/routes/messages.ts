import { Hono } from "hono";
import { requireFingerprint } from "./posts.js";
import db from "../db.js";
import { connectionManager } from "../ws.js";

const messages = new Hono();

messages.use("*", requireFingerprint);

// Resolve display_name to fingerprint_hash (most recent match)
function resolveDisplayName(name: string): string | null {
  const fromPosts = db
    .prepare(
      "SELECT fingerprint_hash, MAX(created_at) as latest FROM posts WHERE display_name = ?"
    )
    .get(name) as { fingerprint_hash: string; latest: number | null } | undefined;

  const fromReplies = db
    .prepare(
      "SELECT fingerprint_hash, MAX(created_at) as latest FROM replies WHERE display_name = ?"
    )
    .get(name) as { fingerprint_hash: string; latest: number | null } | undefined;

  const fromMessages = db
    .prepare(
      "SELECT from_hash as fingerprint_hash, MAX(created_at) as latest FROM messages WHERE from_name = ?"
    )
    .get(name) as { fingerprint_hash: string; latest: number | null } | undefined;

  if (!fromPosts?.latest && !fromReplies?.latest && !fromMessages?.latest) return null;

  const postLatest = fromPosts?.latest ?? 0;
  const replyLatest = fromReplies?.latest ?? 0;
  const msgLatest = fromMessages?.latest ?? 0;

  if (postLatest >= replyLatest && postLatest >= msgLatest) return fromPosts!.fingerprint_hash;
  if (replyLatest >= msgLatest) return fromReplies!.fingerprint_hash;
  return fromMessages!.fingerprint_hash;
}

// GET /api/messages — list conversations
messages.get("/", (c) => {
  const fp = c.get("fingerprint") as string;
  const conversations = db
    .prepare(
      `SELECT
         other_hash,
         other_name,
         last_message,
         last_time,
         (SELECT COUNT(*) FROM messages m2
          WHERE m2.to_hash = ? AND m2.from_hash = conv.other_hash AND m2.read = 0) as unread_count
       FROM (
         SELECT *,
                ROW_NUMBER() OVER (PARTITION BY other_hash ORDER BY last_time DESC) as rn
         FROM (
           SELECT to_hash as other_hash, to_name as other_name,
                  content as last_message, created_at as last_time
           FROM messages WHERE from_hash = ?
           UNION ALL
           SELECT from_hash as other_hash, from_name as other_name,
                  content as last_message, created_at as last_time
           FROM messages WHERE to_hash = ?
         )
       ) conv
       WHERE rn = 1
       ORDER BY last_time DESC`
    )
    .all(fp, fp, fp);

  return c.json({ conversations });
});

// GET /api/messages/conversation/:fingerprint
messages.get("/conversation/:fingerprint", (c) => {
  const fp = c.get("fingerprint") as string;
  const otherFp = c.req.param("fingerprint");

  if (!/^[a-f0-9]{64}$/.test(otherFp)) {
    return c.json({ error: "Invalid fingerprint" }, 400);
  }

  // Mark messages as read
  db.prepare(
    "UPDATE messages SET read = 1 WHERE to_hash = ? AND from_hash = ? AND read = 0"
  ).run(fp, otherFp);

  const msgs = db
    .prepare(
      `SELECT * FROM messages
       WHERE (from_hash = ? AND to_hash = ?)
          OR (from_hash = ? AND to_hash = ?)
       ORDER BY created_at ASC`
    )
    .all(fp, otherFp, otherFp, fp);

  return c.json({ messages: msgs });
});

// POST /api/messages — send message
messages.post("/", (c) => c.req.json().then((body) => {
    const fp = c.get("fingerprint") as string;
    const { to_name, content, from_name } = body;

    if (typeof to_name !== "string" || !to_name.trim()) {
      return c.json({ error: "Recipient name is required" }, 400);
    }
    if (typeof content !== "string" || !content.trim()) {
      return c.json({ error: "Content is required" }, 400);
    }
    if (typeof from_name !== "string" || !from_name.trim()) {
      return c.json({ error: "Sender name is required" }, 400);
    }

    const toFp = resolveDisplayName(to_name.trim());
    if (!toFp) {
      return c.json({ error: "Recipient not found" }, 404);
    }
    if (toFp === fp) {
      return c.json({ error: "Cannot send message to yourself" }, 400);
    }

    const result = db
      .prepare(
        "INSERT INTO messages (from_hash, to_hash, from_name, to_name, content) VALUES (?, ?, ?, ?, ?)"
      )
      .run(fp, toFp, from_name.trim(), to_name.trim(), content.trim());

    const msg = db.prepare("SELECT * FROM messages WHERE id = ?").get(
      result.lastInsertRowid as number
    );

    connectionManager.sendToUser(toFp, { type: "new_message", message: msg });
    connectionManager.sendToUser(fp, { type: "new_message", message: msg });

    return c.json(msg, 201);
  }));

// DELETE /api/messages/conversation/:fingerprint — delete conversation
messages.delete("/conversation/:fingerprint", (c) => {
  const fp = c.get("fingerprint") as string;
  const otherFp = c.req.param("fingerprint");

  if (!/^[a-f0-9]{64}$/.test(otherFp)) {
    return c.json({ error: "Invalid fingerprint" }, 400);
  }

  db.prepare(
    `DELETE FROM messages
     WHERE (from_hash = ? AND to_hash = ?)
        OR (from_hash = ? AND to_hash = ?)`
  ).run(fp, otherFp, otherFp, fp);

  return c.json({ ok: true });
});

export default messages;
