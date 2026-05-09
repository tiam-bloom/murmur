import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../api";
import type { Conversation, Message } from "../api";
import { useWebSocket } from "../hooks/useWebSocket";
import { getColorFromName, formatRelativeTime } from "../utils";
import { useIdentity } from "../FingerprintContext";
import MessageForm from "../components/MessageForm";

export default function MessagesPage() {
  const { displayName, fingerprint } = useIdentity();
  const ws = useWebSocket();
  const [searchParams] = useSearchParams();
  const prefillTo = searchParams.get("to") || undefined;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Conversation detail
  const [selectedFp, setSelectedFp] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  // New message form (only used when no existing conversation with prefillTo)
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getConversations();
      setConversations(data.conversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (fp: string) => {
    setMsgsLoading(true);
    try {
      const data = await api.getConversation(fp);
      setMessages(data.messages);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setMsgsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // When conversations loaded and ?to= is set, auto-open existing conversation
  useEffect(() => {
    if (!prefillTo || loading || selectedFp) return;
    const existing = conversations.find((c) => c.other_name === prefillTo);
    if (existing) {
      openConversation(existing);
    } else {
      setShowNewForm(true);
    }
  }, [prefillTo, loading, conversations]);

  useEffect(() => {
    const unsub = ws.on("new_message", (data: unknown) => {
      const msg = (data as { message: Message }).message;
      const otherFp =
        msg.from_hash === fingerprint ? msg.to_hash : msg.from_hash;
      const otherName =
        msg.from_hash === fingerprint ? msg.to_name : msg.from_name;

      setConversations((prev) => {
        const filtered = prev.filter((c) => c.other_hash !== otherFp);
        const existing = prev.find((c) => c.other_hash === otherFp);
        const unreadInc = msg.to_hash === fingerprint ? 1 : 0;
        return [
          {
            other_hash: otherFp,
            other_name: otherName ?? existing?.other_name ?? "Unknown",
            last_message: msg.content,
            last_time: msg.created_at,
            unread_count: (existing?.unread_count ?? 0) + unreadInc,
          },
          ...filtered,
        ];
      });

      if (selectedFp === otherFp) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });
    return unsub;
  }, [ws, fingerprint, selectedFp]);

  const openConversation = (conv: Conversation) => {
    setSelectedFp(conv.other_hash);
    setSelectedName(conv.other_name);
    fetchMessages(conv.other_hash);
    // Update unread locally
    setConversations((prev) =>
      prev.map((c) =>
        c.other_hash === conv.other_hash ? { ...c, unread_count: 0 } : c,
      ),
    );
  };

  const backToList = () => {
    setSelectedFp(null);
    setMessages([]);
    fetchConversations(); // refresh list
  };

  // Conversation detail view
  if (selectedFp) {
    return (
      <div>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12, marginBottom: 12 }}
          onClick={backToList}
        >
          ← 返回私信列表
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "0 0 16px",
          }}
        >
          <span
            className="user-dot"
            style={{
              background: getColorFromName(selectedName),
              width: 10,
              height: 10,
              borderRadius: "50%",
              display: "inline-block",
            }}
          />
          <h2
            style={{
              color: getColorFromName(selectedName),
              margin: 0,
              fontSize: 18,
            }}
          >
            {selectedName}
          </h2>
          <span style={{ color: "#666", fontSize: 13 }}>· 私信对话</span>
        </div>

        {msgsLoading && (
          <p style={{ color: "#666", textAlign: "center", padding: 20 }}>
            加载中...
          </p>
        )}

        {!msgsLoading && messages.length === 0 && (
          <p style={{ color: "#666", textAlign: "center", padding: 20 }}>
            暂无消息。
          </p>
        )}

        <div className="message-list">
          {messages.map((msg) => {
            const isMine = msg.from_hash !== selectedFp;
            return (
              <div
                key={msg.id}
                className={`message-bubble ${isMine ? "mine" : "theirs"}`}
              >
                <div className="message-content">{msg.content}</div>
                <div className="message-time">
                  {formatRelativeTime(msg.created_at)}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20 }}>
          <MessageForm
            prefillRecipient={selectedName}
            onMessageSent={() => fetchMessages(selectedFp)}
          />
        </div>
      </div>
    );
  }

  // Conversation list view
  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, color: "#e0e0e0", fontSize: 20 }}>私信</h1>
        <button className="btn" onClick={() => setShowNewForm(!showNewForm)}>
          {showNewForm ? "取消" : "+ 新私信"}
        </button>
      </div>

      {showNewForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          {prefillTo && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span
                className="user-dot"
                style={{
                  background: getColorFromName(prefillTo),
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  display: "inline-block",
                }}
              />
              <span
                style={{ color: getColorFromName(prefillTo), fontWeight: 500 }}
              >
                发送给 {prefillTo}
              </span>
            </div>
          )}
          <MessageForm
            prefillRecipient={prefillTo}
            onMessageSent={() => {
              setShowNewForm(false);
              fetchConversations();
            }}
          />
        </div>
      )}

      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button className="btn btn-secondary" onClick={fetchConversations}>
            重试
          </button>
        </div>
      )}

      {loading && (
        <p style={{ color: "#666", textAlign: "center", padding: 40 }}>
          加载中...
        </p>
      )}

      {!loading && conversations.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#888", fontSize: 15 }}>还没有私信。</p>
          <button
            className="btn"
            onClick={() => setShowNewForm(true)}
            style={{ marginTop: 12 }}
          >
            发送第一条私信
          </button>
        </div>
      )}

      <div className="conversation-list">
        {conversations.map((conv) => (
          <div
            key={conv.other_hash}
            className="card"
            style={{ cursor: "pointer" }}
            onClick={() => openConversation(conv)}
          >
            <div className="card-header">
              <span className="user-badge">
                <span
                  className="user-dot"
                  style={{ background: getColorFromName(conv.other_name) }}
                />
                <span style={{ color: getColorFromName(conv.other_name) }}>
                  {conv.other_name}
                </span>
              </span>
              <span className="time">{formatRelativeTime(conv.last_time)}</span>
            </div>
            <p style={{ color: "#999", fontSize: 13, margin: "4px 0" }}>
              {conv.last_message.length > 60
                ? conv.last_message.slice(0, 60) + "..."
                : conv.last_message}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 11, padding: "2px 8px" }}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm("确定删除此私信会话？")) return;
                  try {
                    await api.deleteConversation(conv.other_hash);
                    setConversations((prev) =>
                      prev.filter((c) => c.other_hash !== conv.other_hash),
                    );
                  } catch (err) {
                    console.error("Failed to delete conversation:", err);
                  }
                }}
              >
                删除
              </button>
            </div>
            {conv.unread_count > 0 && (
              <span className="unread-badge">{conv.unread_count}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
