import { apiFetch } from "@/lib/auth/client";
import type {
  CommunityComment,
  CommunityPage,
  CommunityPost,
  CommunityPostStatus,
  CommunityPostVisibility,
  CommunityReactionType,
} from "./types";

const REQUEST_TIMEOUT_MS = 15000;

export class CommunityApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CommunityApiError";
  }
}

type ListParams = {
  topic?: string;
  query?: string;
  status?: CommunityPostStatus | "";
  page?: number;
  size?: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await apiFetch(path, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        ...(init?.body instanceof FormData ? {} : init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new CommunityApiError("Backend cộng đồng phản hồi quá lâu. Vui lòng thử lại.", 503);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  const text = await response.text().catch(() => "");
  const payload = text ? safeJson(text) : null;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Không thể thực hiện yêu cầu cộng đồng.";
    throw new CommunityApiError(message, response.status);
  }
  return normalizePayload(payload) as T;
}

export const communityClient = {
  feed: (params: ListParams = {}) =>
    request<CommunityPage<CommunityPost>>(`/api/community/posts?${queryString(params)}`),
  mine: (page = 0, size = 20) =>
    request<CommunityPage<CommunityPost>>(`/api/community/posts/mine?page=${page}&size=${size}`),
  adminPosts: (params: ListParams = {}) =>
    request<CommunityPage<CommunityPost>>(`/api/community/admin/posts?${queryString(params)}`),
  detail: (postId: string) =>
    request<CommunityPost>(`/api/community/posts/${encodeURIComponent(postId)}`),
  create: (body: {
    content: string;
    topic: string;
    visibility: CommunityPostVisibility;
    media: File[];
  }) => {
    const formData = new FormData();
    formData.append("content", body.content);
    formData.append("topic", body.topic);
    formData.append("visibility", body.visibility);
    body.media.forEach((file) => formData.append("media", file));
    return request<CommunityPost>("/api/community/posts", {
      method: "POST",
      body: formData,
    });
  },
  react: (postId: string, type: CommunityReactionType | null) => {
    const suffix = type ? `?type=${encodeURIComponent(type)}` : "";
    return request<CommunityPost>(`/api/community/posts/${encodeURIComponent(postId)}/reaction${suffix}`, {
      method: "POST",
    });
  },
  comment: (postId: string, content: string, parentId?: string) =>
    request<CommunityPost>(`/api/community/posts/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, parentId }),
    }),
  deleteComment: (postId: string, commentId: string) =>
    request<CommunityPost>(`/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
    }),
  report: (postId: string) =>
    request<CommunityPost>(`/api/community/posts/${encodeURIComponent(postId)}/report`, {
      method: "POST",
    }),
  delete: (postId: string) =>
    request<void>(`/api/community/posts/${encodeURIComponent(postId)}`, {
      method: "DELETE",
    }),
};

function queryString(params: ListParams) {
  const search = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  if (params.topic) search.set("topic", params.topic);
  if (params.query) search.set("query", params.query);
  if (params.status) search.set("status", params.status);
  return search.toString();
}

function normalizePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  if ("items" in payload && Array.isArray((payload as CommunityPage<CommunityPost>).items)) {
    const page = payload as CommunityPage<CommunityPost>;
    return { ...page, items: page.items.map(normalizePost) };
  }
  if ("media" in payload) return normalizePost(payload as CommunityPost);
  return payload;
}

function normalizePost(post: CommunityPost): CommunityPost {
  return {
    ...post,
    media: post.media.map((item) => ({
      ...item,
      url: item.url.replace(/^\/api\//, "/api/backend/"),
    })),
    comments: (post.comments ?? []).map(normalizeComment),
  };
}

function normalizeComment(comment: CommunityComment): CommunityComment {
  return {
    ...comment,
    parentId: comment.parentId ?? null,
    replies: (comment.replies ?? []).map(normalizeComment),
  };
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
