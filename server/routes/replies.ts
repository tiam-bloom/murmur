import { Hono } from "hono";
import { requireFingerprint } from "./posts.js";
import db from "../db.js";
import { connectionManager } from "../ws.js";

const replies = new Hono();

replies.use("*", requireFingerprint);

// POST /api/posts/:id/replies
replies.post("/:id/replies", (c) => c.req.json().then((body) => {
    const fp = c.get("fingerprint") as string;
    const postId = Number(c.req.param("id"));

    if (!Number.isInteger(postId)) {
      return c.json({ error: "Invalid post ID" }, 400);
    }

    const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
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

    const result = db
      .prepare(
        "INSERT INTO replies (post_id, fingerprint_hash, display_name, reply_to_name, content) VALUES (?, ?, ?, ?, ?)"
      )
      .run(postId, fp, display_name.trim(), reply_to_name?.trim() || null, content.trim());

    const reply = db.prepare("SELECT * FROM replies WHERE id = ?").get(
      result.lastInsertRowid as number
    );

    connectionManager.broadcastToPost(postId, { type: "new_reply", reply });

    return c.json(reply, 201);
  }));

export default replies;
