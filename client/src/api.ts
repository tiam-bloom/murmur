import { getStoredFingerprint } from "./fingerprint";

const BASE = "/api";

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const fp = getStoredFingerprint();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (fp) headers["X-Fingerprint"] = fp;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data as T;
}

// --- Types ---

export interface Post {
  id: number;
  fingerprint_hash: string;
  display_name: string;
  title: string;
  content: string;
  created_at: number;
  reply_count?: number;
}

export interface Reply {
  id: number;
  post_id: number;
  fingerprint_hash: string;
  display_name: string;
  reply_to_name: string | null;
  content: string;
  created_at: number;
}

export interface Message {
  id: number;
  from_hash: string;
  to_hash: string;
  from_name: string;
  to_name: string;
  content: string;
  created_at: number;
  read: number;
}

export interface Conversation {
  other_hash: string;
  other_name: string;
  last_message: string;
  last_time: number;
  unread_count: number;
}

export interface PaginatedPosts {
  posts: Post[];
  total: number;
  page: number;
  totalPages: number;
}

// --- API methods ---

export const api = {
  getPosts(page = 1, limit = 20): Promise<PaginatedPosts> {
    return request("GET", `/posts?page=${page}&limit=${limit}`);
  },

  getPost(id: number): Promise<{ post: Post; replies: Reply[] }> {
    return request("GET", `/posts/${id}`);
  },

  createPost(body: {
    title: string;
    content: string;
    display_name: string;
  }): Promise<Post> {
    return request("POST", "/posts", body);
  },

  createReply(
    postId: number,
    body: { content: string; display_name: string; reply_to_name?: string }
  ): Promise<Reply> {
    return request("POST", `/posts/${postId}/replies`, body);
  },

  getConversations(): Promise<{ conversations: Conversation[] }> {
    return request("GET", "/messages");
  },

  getConversation(fingerprint: string): Promise<{ messages: Message[] }> {
    return request("GET", `/messages/conversation/${fingerprint}`);
  },

  sendMessage(body: {
    to_name: string;
    content: string;
    from_name: string;
  }): Promise<Message> {
    return request("POST", "/messages", body);
  },

  deleteConversation(fingerprint: string): Promise<{ ok: boolean }> {
    return request("DELETE", `/messages/conversation/${fingerprint}`);
  },
};
