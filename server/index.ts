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

const app = new Hono();

app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "DELETE"], allowHeaders: ["Content-Type", "X-Fingerprint"] }));
app.use("*", logger());

app.route("/api/posts", posts);
app.route("/api/posts", replies);
app.route("/api/messages", messages);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

await initDb();
startCleanupJob();

const server = createAdaptorServer({ fetch: app.fetch, port: 3000 });
setupWebSocket(server);

server.listen(3000, () => {
  console.log(`murmur server listening on http://localhost:3000`);
});
