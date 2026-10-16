import type {
  KnowledgeArticle,
  KnowledgeArticleListParams,
  KnowledgeArticlePage,
  KnowledgeCategoryCount,
  KnowledgeCategoryOption,
  KnowledgeArticleInput,
  KnowledgeStatus,
} from "./types";

export class KnowledgeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "KnowledgeApiError";
  }
}

async function knowledgeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new KnowledgeApiError(
      payload?.message || "Không thể xử lý bài kiến thức.",
      response.status,
    );
  }
  if (response.status === 204) return { ok: true } as T;
  return (await response.json()) as T;
}

async function knowledgeFormRequest<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || "Không thể tải ảnh bài kiến thức.");
  }
  return (await response.json()) as T;
}

function normalizeArticle(article: KnowledgeArticle): KnowledgeArticle {
  return {
    ...article,
    coverTone: article.coverTone ?? "green",
    coverImage:
      article.coverImage?.startsWith("/api/knowledge/")
        ? article.coverImage.replace("/api/knowledge/", "/api/backend/knowledge/")
        : article.coverImage,
  };
}

function isArticle(value: unknown): value is KnowledgeArticle {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "title" in value &&
      "content" in value,
  );
}

function normalizeArticlePayload(payload: unknown): { article: KnowledgeArticle } {
  if (payload && typeof payload === "object" && "article" in payload) {
    const article = (payload as { article?: unknown }).article;
    if (isArticle(article)) {
      return { article: normalizeArticle(article) };
    }
  }

  if (isArticle(payload)) {
    return { article: normalizeArticle(payload) };
  }

  throw new Error("Backend không trả dữ liệu bài kiến thức hợp lệ.");
}

function normalizePage(payload: KnowledgeArticlePage): KnowledgeArticlePage {
  return {
    ...payload,
    articles: payload.articles.map(normalizeArticle),
  };
}

function queryString(params?: KnowledgeArticleListParams) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.category?.trim() && params.category.trim() !== "Tất cả") {
    query.set("category", params.category.trim());
  }
  if (params?.status) query.set("status", params.status);
  if (params?.page != null) query.set("page", String(params.page));
  if (params?.size != null) query.set("size", String(params.size));
  if (params?.sort) query.set("sort", params.sort);
  const value = query.toString();
  return value ? `?${value}` : "";
}

export const knowledgeClient = {
  list: (params?: KnowledgeArticleListParams) =>
    knowledgeRequest<KnowledgeArticlePage>(
      `/api/backend/knowledge/articles${queryString(params)}`,
    ).then(normalizePage),
  listAdmin: (params?: KnowledgeArticleListParams) =>
    knowledgeRequest<KnowledgeArticlePage>(
      `/api/backend/knowledge/admin/articles${queryString(params)}`,
    ).then(normalizePage),
  listMine: (params?: KnowledgeArticleListParams | KnowledgeStatus) => {
    const normalizedParams =
      typeof params === "string" ? { status: params } : params;
    return knowledgeRequest<KnowledgeArticlePage>(
      `/api/backend/knowledge/articles/mine${queryString(normalizedParams)}`,
    ).then(normalizePage);
  },
  recent: (size = 5) =>
    knowledgeRequest<KnowledgeArticlePage>(
      `/api/backend/knowledge/articles/recent?size=${encodeURIComponent(String(size))}`,
    ).then(normalizePage),
  popular: (size = 5) =>
    knowledgeRequest<KnowledgeArticlePage>(
      `/api/backend/knowledge/articles/popular?size=${encodeURIComponent(String(size))}`,
    ).then(normalizePage),
  categories: () =>
    knowledgeRequest<KnowledgeCategoryCount[]>("/api/backend/knowledge/categories"),
  categoryOptions: () =>
    knowledgeRequest<KnowledgeCategoryOption[]>("/api/backend/knowledge/category-options"),
  related: (slug: string, size = 4) =>
    knowledgeRequest<KnowledgeArticlePage>(
      `/api/backend/knowledge/articles/${encodeURIComponent(slug)}/related?size=${encodeURIComponent(String(size))}`,
    ).then(normalizePage),
  get: (slug: string) =>
    knowledgeRequest<KnowledgeArticle>(
      `/api/backend/knowledge/articles/${encodeURIComponent(slug)}`,
    ).then(normalizeArticle),
  save: async (payload: KnowledgeArticleInput & { id?: string | null }) => {
    const { coverFile, coverPreview, ...articlePayload } = payload;
    void coverPreview;
    const result = normalizeArticlePayload(await knowledgeRequest<unknown>(
      payload.id
        ? `/api/backend/knowledge/articles/${encodeURIComponent(payload.id)}`
        : "/api/backend/knowledge/articles",
      {
        method: payload.id ? "PUT" : "POST",
        body: JSON.stringify(articlePayload),
      },
    ));
    if (!coverFile) return normalizeArticlePayload(result);
    return knowledgeClient.uploadCover(result.article.id, coverFile);
  },
  approve: (id: string) =>
    knowledgeRequest<unknown>(
      `/api/backend/knowledge/articles/${encodeURIComponent(id)}/approve`,
      { method: "POST" },
    ).then(normalizeArticlePayload),
  reject: (id: string, reason: string) =>
    knowledgeRequest<unknown>(
      `/api/backend/knowledge/articles/${encodeURIComponent(id)}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    ).then(normalizeArticlePayload),
  uploadCover: (id: string, file: File) => {
    const formData = new FormData();
    formData.set("coverImage", file);
    return knowledgeFormRequest<unknown>(
      `/api/backend/knowledge/articles/${encodeURIComponent(id)}/cover`,
      formData,
    ).then(normalizeArticlePayload);
  },
  delete: (id: string) =>
    knowledgeRequest<{ ok: boolean }>(
      `/api/backend/knowledge/articles/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
};
