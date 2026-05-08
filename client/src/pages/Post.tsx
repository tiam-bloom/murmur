import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import type { Post, Reply } from "../api";
import { useWebSocket } from "../hooks/useWebSocket";
import { getColorFromName, formatRelativeTime } from "../utils";
import { useIdentity } from "../FingerprintContext";
import ReplyForm from "../components/ReplyForm";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { displayName } = useIdentity();
  const ws = useWebSocket();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ name: string } | null>(null);

  const fetchPost = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPost(Number(id));
      setPost(data.post);
      setReplies(data.replies);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "加载失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const postId = Number(id);
    ws.subscribe(postId);

    const unsub = ws.on("new_reply", (data: unknown) => {
      const reply = (data as { reply: Reply }).reply;
      if (reply.post_id !== postId) return;
      setReplies((prev) => {
        if (prev.some((r) => r.id === reply.id)) return prev;
        return [...prev, reply];
      });
    });

    return () => {
      ws.unsubscribe(postId);
      unsub();
    };
  }, [id, ws]);

  if (loading) {
    return <p style={{ color: "#666", textAlign: "center", padding: 40 }}>加载中...</p>;
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: "#888" }}>
          {error.includes("not found") ? "这篇帖子已被删除或从未存在。" : error}
        </p>
        <Link to="/" style={{ color: "#888", fontSize: 14 }}>返回首页</Link>
      </div>
    );
  }

  if (!post) return null;

  const postColor = getColorFromName(post.display_name);
  const isMyPost = post.display_name === displayName;

  return (
    <div>
      <Link to="/" style={{ color: "#888", fontSize: 13, textDecoration: "none" }}>
        ← 返回
      </Link>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-header">
          <span className="user-badge">
            <span className="user-dot" style={{ background: postColor }} />
            <span style={{ color: postColor }}>{post.display_name}</span>
            {isMyPost && <span style={{ color: "#666", fontSize: 11, marginLeft: 4 }}>(你)</span>}
          </span>
          <span className="time">{formatRelativeTime(post.created_at)}</span>
        </div>
        <h2 style={{ margin: "8px 0", color: "#e0e0e0", fontSize: 18 }}>{post.title}</h2>
        <p style={{ color: "#c0c0c0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{post.content}</p>
        {!isMyPost && (
          <div style={{ marginTop: 12 }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              onClick={() => navigate(`/messages?to=${encodeURIComponent(post.display_name)}`)}
            >
              私信作者
            </button>
          </div>
        )}
      </div>

      <h3 style={{ color: "#a0a0b8", margin: "24px 0 12px", fontSize: 15 }}>
        回复 ({replies.length})
      </h3>

      {replies.length === 0 && (
        <p style={{ color: "#666", fontSize: 13 }}>暂无回复。</p>
      )}

      {replies.map((reply) => {
        const replyColor = getColorFromName(reply.display_name);
        const isMyReply = reply.display_name === displayName;
        return (
          <div key={reply.id} className="card">
            <div className="card-header">
              <span className="user-badge">
                <span className="user-dot" style={{ background: replyColor }} />
                <span style={{ color: replyColor }}>{reply.display_name}</span>
                {isMyReply && (
                  <span style={{ color: "#666", fontSize: 11, marginLeft: 4 }}>(你)</span>
                )}
              </span>
              <span className="time">{formatRelativeTime(reply.created_at)}</span>
            </div>
            {reply.reply_to_name && (
              <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>
                回复 <span style={{ color: getColorFromName(reply.reply_to_name) }}>@{reply.reply_to_name}</span>
              </div>
            )}
            <p style={{ color: "#c0c0c0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {reply.content}
            </p>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 11 }}
                onClick={() =>
                  setReplyTo(replyTo?.name === reply.display_name ? null : { name: reply.display_name })
                }
              >
                {replyTo?.name === reply.display_name ? "取消回复" : "回复"}
              </button>
              {!isMyReply && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 11 }}
                  onClick={() =>
                    navigate(`/messages?to=${encodeURIComponent(reply.display_name)}`)
                  }
                >
                  私信
                </button>
              )}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 20 }}>
        <ReplyForm
          postId={post.id}
          replyToName={replyTo?.name}
          onReplyCreated={() => {
            setReplyTo(null);
            fetchPost();
          }}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
}
