import { useState } from "react";
import { api } from "../api";
import { useIdentity } from "../FingerprintContext";

export default function NewPostModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { displayName } = useIdentity();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.createPost({
        title: title.trim(),
        content: content.trim(),
        display_name: displayName,
      });
      setTitle("");
      setContent("");
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 16px", color: "#e0e0e0" }}>新帖子</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题"
            className="input"
            autoFocus
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="内容..."
            rows={5}
            className="input"
          />
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              取消
            </button>
            <button
              type="submit"
              disabled={sending || !title.trim() || !content.trim()}
              className="btn"
            >
              {sending ? "发布中..." : "发布"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
