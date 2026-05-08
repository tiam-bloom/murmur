import { useEffect, useState } from "react";
import { api } from "../api";
import type { Post } from "../api";
import { useWebSocket } from "../hooks/useWebSocket";
import PostCard from "../components/PostCard";
import NewPostModal from "../components/NewPostModal";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const ws = useWebSocket();

  const fetchPosts = async (pageNum: number, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPosts(pageNum);
      setPosts(append ? (prev) => [...prev, ...data.posts] : data.posts);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(1);
  }, []);

  useEffect(() => {
    const unsub = ws.on("new_post", (data: unknown) => {
      const post = (data as { post: Post }).post;
      setPosts((prev) => {
        if (prev.some((p) => p.id === post.id)) return prev;
        return [post, ...prev];
      });
    });
    return unsub;
  }, [ws]);

  const loadMore = () => {
    if (page < totalPages) {
      fetchPosts(page + 1, true);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, color: "#e0e0e0", fontSize: 20 }}>所有帖子</h1>
        <button className="btn" onClick={() => setModalOpen(true)}>
          + 新帖子
        </button>
      </div>

      <NewPostModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => fetchPosts(1)}
      />

      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button className="btn btn-secondary" onClick={() => fetchPosts(1)}>
            重试
          </button>
        </div>
      )}

      {loading && posts.length === 0 && (
        <p style={{ color: "#666", textAlign: "center", padding: 40 }}>加载中...</p>
      )}

      {!loading && posts.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#888", fontSize: 15 }}>还没有帖子，来做第一个低语者吧。</p>
          <button className="btn" onClick={() => setModalOpen(true)} style={{ marginTop: 12 }}>
            发布第一帖
          </button>
        </div>
      )}

      <div className="post-list">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} showLink />
        ))}
      </div>

      {loading && posts.length > 0 && (
        <p style={{ color: "#666", textAlign: "center", padding: 16 }}>加载更多...</p>
      )}

      {!loading && page < totalPages && (
        <div style={{ textAlign: "center", padding: 16 }}>
          <button className="btn btn-secondary" onClick={loadMore}>
            加载更多
          </button>
        </div>
      )}
    </div>
  );
}
