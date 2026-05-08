import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useIdentity } from "../FingerprintContext";
import type { Post, Reply, Message } from "../api";

type EventHandler = (data: unknown) => void;

interface WebSocketContextValue {
  subscribe: (postId: number) => void;
  unsubscribe: (postId: number) => void;
  on: (event: string, handler: EventHandler) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useWebSocket must be used within WebSocketProvider");
  return ctx;
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { fingerprint } = useIdentity();
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const subscribedRef = useRef<Set<number>>(new Set());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelayRef = useRef(1000);

  const listeners = listenersRef.current;

  const connect = useCallback(() => {
    if (!fingerprint) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`ws://localhost:3000/ws?fp=${fingerprint}`);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelayRef.current = 1000;
      // Re-subscribe to previously watched posts
      for (const postId of subscribedRef.current) {
        ws.send(JSON.stringify({ type: "subscribe", postId }));
      }
    };

    ws.onmessage = (e) => {
      let msg: { type: string };
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      const handlers = listeners.get(msg.type);
      if (handlers) {
        for (const fn of handlers) fn(msg);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, 30_000);
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [fingerprint, listeners]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const subscribe = useCallback(
    (postId: number) => {
      subscribedRef.current.add(postId);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "subscribe", postId }));
      }
    },
    []
  );

  const unsubscribe = useCallback(
    (postId: number) => {
      subscribedRef.current.delete(postId);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "unsubscribe", postId }));
      }
    },
    []
  );

  const on = useCallback(
    (event: string, handler: EventHandler) => {
      const existing = listeners.get(event);
      if (existing) {
        existing.add(handler);
      } else {
        listeners.set(event, new Set([handler]));
      }
      return () => {
        listeners.get(event)?.delete(handler);
      };
    },
    [listeners]
  );

  return (
    <WebSocketContext.Provider value={{ subscribe, unsubscribe, on }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export type { Post, Reply, Message };
