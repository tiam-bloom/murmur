import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";

class ConnectionManager {
  private fingerprints = new Map<string, Set<WebSocket>>();
  private postWatchers = new Map<number, Set<WebSocket>>();

  register(fp: string, ws: WebSocket) {
    const set = this.fingerprints.get(fp);
    if (set) {
      set.add(ws);
    } else {
      this.fingerprints.set(fp, new Set([ws]));
    }
    this.startHeartbeat(fp, ws);
  }

  unregister(fp: string, ws: WebSocket) {
    this.fingerprints.get(fp)?.delete(ws);
    for (const [, watchers] of this.postWatchers) {
      watchers.delete(ws);
    }
  }

  subscribe(fp: string, postId: number, ws: WebSocket) {
    const watchers = this.postWatchers.get(postId);
    if (watchers) {
      watchers.add(ws);
    } else {
      this.postWatchers.set(postId, new Set([ws]));
    }
  }

  unsubscribe(postId: number, ws: WebSocket) {
    this.postWatchers.get(postId)?.delete(ws);
  }

  broadcast(message: object) {
    const data = JSON.stringify(message);
    for (const [, sockets] of this.fingerprints) {
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      }
    }
  }

  sendToUser(fp: string, message: object) {
    const data = JSON.stringify(message);
    for (const ws of this.fingerprints.get(fp) ?? []) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  broadcastToPost(postId: number, message: object) {
    const data = JSON.stringify(message);
    for (const ws of this.postWatchers.get(postId) ?? []) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  private startHeartbeat(fp: string, ws: WebSocket) {
    let alive = true;
    const pingTimer = setInterval(() => {
      if (!alive) {
        clearInterval(pingTimer);
        this.unregister(fp, ws);
        ws.terminate();
        return;
      }
      alive = false;
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30_000);

    ws.on("pong", () => {
      alive = true;
    });

    ws.on("close", () => {
      clearInterval(pingTimer);
      this.unregister(fp, ws);
    });

    ws.on("error", () => {
      clearInterval(pingTimer);
      this.unregister(fp, ws);
    });
  }
}

export const connectionManager = new ConnectionManager();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const fp = url.searchParams.get("fp");

    if (!fp || !/^[a-f0-9]{64}$/.test(fp)) {
      ws.close(4000, "Missing or invalid fingerprint");
      return;
    }

    connectionManager.register(fp, ws);

    ws.on("message", (raw) => {
      let msg: { type: string; postId?: number };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === "subscribe" && typeof msg.postId === "number") {
        connectionManager.subscribe(fp, msg.postId, ws);
      } else if (msg.type === "unsubscribe" && typeof msg.postId === "number") {
        connectionManager.unsubscribe(msg.postId, ws);
      }
    });
  });

  return wss;
}
