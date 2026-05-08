import { useState } from "react";
import { api } from "../api";
import { useIdentity } from "../FingerprintContext";

export default function MessageForm({
  prefillRecipient,
  onMessageSent,
}: {
  prefillRecipient?: string;
  onMessageSent: () => void;
}) {
  const { displayName } = useIdentity();
  const [toName, setToName] = useState(prefillRecipient || "");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toName.trim() || !content.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.sendMessage({
        to_name: toName.trim(),
        content: content.trim(),
        from_name: displayName,
      });
      setContent("");
      if (!prefillRecipient) setToName("");
      onMessageSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="message-form" onSubmit={handleSubmit}>
      {!prefillRecipient && (
        <input
          type="text"
          value={toName}
          onChange={(e) => setToName(e.target.value)}
          placeholder="收件人显示名 (例如 CalmEagle)"
          className="input"
        />
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="写下私信内容..."
        rows={3}
        className="input"
      />
      {error && <p className="error">{error}</p>}
      <button
        type="submit"
        disabled={sending || !toName.trim() || !content.trim()}
        className="btn"
      >
        {sending ? "发送中..." : "发送私信"}
      </button>
    </form>
  );
}
