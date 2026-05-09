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
posts.get("/", async (c) => {
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
  const offset = (page - 1) * limit;

  const postList = await db.all(
    `SELECT p.*, (SELECT COUNT(*) FROM replies WHERE post_id = p.id) as reply_count
     FROM posts p
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    limit,
    offset
  );

  const { total } = (await db.get(
    "SELECT COUNT(*) as total FROM posts"
  )) as { total: number };

  return c.json({
    posts: postList,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/posts/:id — get post with replies
posts.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "Invalid post ID" }, 400);
  }

  const post = await db.get("SELECT * FROM posts WHERE id = ?", id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const replyList = await db.all(
    "SELECT * FROM replies WHERE post_id = ? ORDER BY created_at ASC",
    id
  );

  return c.json({ post, replies: replyList });
});

// POST /api/posts — create post
posts.post("/", async (c) => {
  const fp = c.get("fingerprint") as string;
  const body = await c.req.json();
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

  const result = await db.run(
    "INSERT INTO posts (fingerprint_hash, display_name, title, content) VALUES (?, ?, ?, ?)",
    fp,
    display_name.trim(),
    title.trim(),
    content.trim()
  );

  const post = await db.get("SELECT * FROM posts WHERE id = ?", result.lastInsertRowid);

  connectionManager.broadcast({ type: "new_post", post });

  return c.json(post, 201);
});

export default posts;
export { requireFingerprint };
