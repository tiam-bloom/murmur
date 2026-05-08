import { useState } from "react";
import { api } from "../api";
import { useIdentity } from "../FingerprintContext";
import { getColorFromName } from "../utils";

export default function ReplyForm({
  postId,
  replyToName,
  onReplyCreated,
  onCancelReply,
}: {
  postId: number;
  replyToName?: string;
  onReplyCreated: () => void;
  onCancelReply?: () => void;
}) {
  const { displayName } = useIdentity();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.createReply(postId, {
        content: content.trim(),
        display_name: displayName,
        ...(replyToName ? { reply_to_name: replyToName } : {}),
      });
      setContent("");
      onReplyCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "回复失败");
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="reply-form" onSubmit={handleSubmit}>
      {replyToName && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13 }}>
          <span style={{ color: "#888" }}>回复</span>
          <span style={{ color: getColorFromName(replyToName) }}>@{replyToName}</span>
          {onCancelReply && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: "1px 6px", marginLeft: "auto" }}
              onClick={() => {
                setContent("");
                onCancelReply();
              }}
            >
              取消
            </button>
          )}
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={replyToName ? `回复 @${replyToName}...` : "写下你的回复..."}
        rows={3}
        className="input"
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={sending || !content.trim()} className="btn">
        {sending ? "发送中..." : "回复"}
      </button>
    </form>
  );
}
