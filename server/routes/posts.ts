import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import db from "../db.js";
import { connectionManager } from "../ws.js";

const posts = new Hono();

// Validate fingerprint middleware
const requireFingerprint = createMiddleware(async (c, next) => {
  const fp = c.req.header("X-Fingerprint");
  if (!fp || !/^[a-f0-9]{64}$/.test(fp)) {
    return c.json({ error: "Missing or invalid X-Fingerprint header" }, 400);
  }
  c.set("fingerprint", fp);
  await next();
});

posts.use("*", requireFingerprint);

// GET /api/posts — list posts with pagination
posts.get("/", (c) => {
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
  const offset = (page - 1) * limit;

  const posts = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM replies WHERE post_id = p.id) as reply_count
       FROM posts p
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  const { total } = db
    .prepare("SELECT COUNT(*) as total FROM posts")
    .get() as { total: number };

  return c.json({
    posts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/posts/:id — get post with replies
posts.get("/:id", (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "Invalid post ID" }, 400);
  }

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const replies = db
    .prepare("SELECT * FROM replies WHERE post_id = ? ORDER BY created_at ASC")
    .all(id);

  return c.json({ post, replies });
});

// POST /api/posts — create post
posts.post("/", (c) => c.req.json().then((body) => {
    const fp = c.get("fingerprint") as string;
    const { title, content, display_name } = body;

    if (typeof title !== "string" || !title.trim()) {
      return c.json({ error: "Title is required" }, 400);
    }
    if (typeof content !== "string" || !content.trim()) {
      return c.json({ error: "Content is required" }, 400);
    }
    if (typeof display_name !== "string" || !display_name.trim()) {
      return c.json({ error: "Display name is required" }, 400);
    }

    const result = db
      .prepare(
        "INSERT INTO posts (fingerprint_hash, display_name, title, content) VALUES (?, ?, ?, ?)"
      )
      .run(fp, display_name.trim(), title.trim(), content.trim());

    const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(
      result.lastInsertRowid as number
    );

    connectionManager.broadcast({ type: "new_post", post });

    return c.json(post, 201);
  }));

export default posts;
export { requireFingerprint };
