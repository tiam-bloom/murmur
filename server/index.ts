import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createAdaptorServer } from "@hono/node-server";
import posts from "./routes/posts.js";
import replies from "./routes/replies.js";
import messages from "./routes/messages.js";
import { initDb } from "./db.js";
import { startCleanupJob } from "./cleanup.js";
import { setupWebSocket } from "./ws.js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE"],
    allowHeaders: ["Content-Type", "X-Fingerprint"],
  }),
);
app.use("*", logger());

app.route("/api/posts", posts);
app.route("/api/posts", replies);
app.route("/api/messages", messages);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// 生产环境：托管前端静态文件
if (process.env.NODE_ENV === "production") {
  const clientDist = join(__dirname, "..", "client", "dist");

  // SPA catch-all：先尝试匹配静态文件，找不到回退到 index.html
  app.get("/*", async (c, next) => {
    const url = new URL(c.req.url);
    const filePath = join(
      clientDist,
      url.pathname === "/" ? "index.html" : url.pathname,
    );

    if (existsSync(filePath) && !filePath.startsWith(clientDist)) {
      // 路径遍历保护
      return next();
    }

    try {
      const content = await readFile(filePath);
      const ext = extname(filePath).slice(1) || "html";
      const mimeTypes: Record<string, string> = {
        html: "text/html; charset=utf-8",
        js: "application/javascript",
        mjs: "application/javascript",
        css: "text/css",
        png: "image/png",
        svg: "image/svg+xml",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        ico: "image/x-icon",
        json: "application/json",
        woff: "font/woff",
        woff2: "font/woff2",
      };
      return c.body(content, 200, {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
      });
    } catch {
      // SPA fallback：返回 index.html
      try {
        const html = await readFile(join(clientDist, "index.html"));
        return c.html(html.toString());
      } catch {
        return next();
      }
    }
  });
}

await initDb();
startCleanupJob();

const server = createAdaptorServer({ fetch: app.fetch, port: 3000 });
setupWebSocket(server);

server.listen(3000, () => {
  console.log(`murmur server listening on http://localhost:3000`);
});
