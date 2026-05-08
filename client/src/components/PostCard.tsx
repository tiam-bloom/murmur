import { useNavigate } from "react-router-dom";
import { getColorFromName, formatRelativeTime } from "../utils";
import { useIdentity } from "../FingerprintContext";
import type { Post } from "../api";

export default function PostCard({ post, showLink }: { post: Post; showLink: boolean }) {
  const navigate = useNavigate();
  const { displayName } = useIdentity();
  const color = getColorFromName(post.display_name);
  const isMine = post.display_name === displayName;

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + "..." : text;

  return (
    <div
      className="card"
      onClick={() => showLink && navigate(`/post/${post.id}`)}
      style={{ cursor: showLink ? "pointer" : "default" }}
    >
      <div className="card-header">
        <span className="user-badge">
          <span className="user-dot" style={{ background: color }} />
          <span style={{ color }}>{post.display_name}</span>
          {isMine && <span style={{ color: "#666", fontSize: 11, marginLeft: 4 }}>(你)</span>}
        </span>
        <span className="time">{formatRelativeTime(post.created_at)}</span>
      </div>
      <h3 className="card-title">{post.title}</h3>
      <p className="card-content">{truncate(post.content, 200)}</p>
      {post.reply_count !== undefined && (
        <div className="card-footer">
          <span style={{ color: "#666", fontSize: 12 }}>
            {post.reply_count > 0 ? `${post.reply_count} 条回复` : "暂无回复"}
          </span>
        </div>
      )}
    </div>
  );
}
