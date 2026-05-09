import { Hono } from "hono";
import { requireFingerprint } from "./posts.js";
import db from "../db.js";
import { connectionManager } from "../ws.js";

const replies = new Hono();

replies.use("*", requireFingerprint);

// POST /api/posts/:id/replies
replies.post("/:id/replies", async (c) => {
  const fp = c.get("fingerprint") as string;
  const body = await c.req.json();
  const postId = Number(c.req.param("id"));

  if (!Number.isInteger(postId)) {
    return c.json({ error: "Invalid post ID" }, 400);
  }

  const post = await db.get("SELECT id FROM posts WHERE id = ?", postId);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const { content, display_name, reply_to_name } = body;

  if (typeof content !== "string" || !content.trim()) {
    return c.json({ error: "Content is required" }, 400);
  }
  if (typeof display_name !== "string" || !display_name.trim()) {
    return c.json({ error: "Display name is required" }, 400);
  }
  if (reply_to_name !== undefined && typeof reply_to_name !== "string") {
    return c.json({ error: "Invalid reply_to_name" }, 400);
  }

  const result = await db.run(
    "INSERT INTO replies (post_id, fingerprint_hash, display_name, reply_to_name, content) VALUES (?, ?, ?, ?, ?)",
    postId,
    fp,
    display_name.trim(),
    reply_to_name?.trim() || null,
    content.trim()
  );

  const reply = await db.get("SELECT * FROM replies WHERE id = ?", result.lastInsertRowid);

  connectionManager.broadcastToPost(postId, { type: "new_reply", reply });

  return c.json(reply, 201);
});

export default replies;
