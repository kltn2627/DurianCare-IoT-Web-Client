import type {
  KnowledgeArticle,
  KnowledgeArticleInput,
  KnowledgeStatus,
} from "./types";

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
    throw new Error(payload?.message || "Không thể xử lý bài kiến thức.");
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
    coverImage:
      article.coverImage?.startsWith("/api/knowledge/")
        ? article.coverImage.replace("/api/knowledge/", "/api/backend/knowledge/")
        : article.coverImage,
  };
}

function normalizeArticlePayload<T extends { article: KnowledgeArticle }>(payload: T): T {
  return { ...payload, article: normalizeArticle(payload.article) };
}

export const knowledgeClient = {
  list: (status?: KnowledgeStatus) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return knowledgeRequest<{ articles: KnowledgeArticle[] }>(
      `/api/backend/knowledge/articles${query}`,
    ).then((payload) => ({
      ...payload,
      articles: payload.articles.map(normalizeArticle),
    }));
  },
  listMine: (status?: KnowledgeStatus) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return knowledgeRequest<{ articles: KnowledgeArticle[] }>(
      `/api/backend/knowledge/articles/mine${query}`,
    ).then((payload) => ({
      ...payload,
      articles: payload.articles.map(normalizeArticle),
    }));
  },
  get: (slug: string) =>
    knowledgeRequest<KnowledgeArticle>(
      `/api/backend/knowledge/articles/${encodeURIComponent(slug)}`,
    ).then(normalizeArticle),
  save: async (payload: KnowledgeArticleInput & { id?: string | null }) => {
    const { coverFile, coverPreview: _coverPreview, ...articlePayload } = payload;
    const result = await knowledgeRequest<{ article: KnowledgeArticle }>(
      payload.id
        ? `/api/backend/knowledge/articles/${encodeURIComponent(payload.id)}`
        : "/api/backend/knowledge/articles",
      {
        method: payload.id ? "PUT" : "POST",
        body: JSON.stringify(articlePayload),
      },
    );
    if (!coverFile) return normalizeArticlePayload(result);
    return knowledgeClient.uploadCover(result.article.id, coverFile);
  },
  approve: (id: string) =>
    knowledgeRequest<{ article: KnowledgeArticle }>(
      `/api/backend/knowledge/articles/${encodeURIComponent(id)}/approve`,
      { method: "POST" },
    ).then(normalizeArticlePayload),
  uploadCover: (id: string, file: File) => {
    const formData = new FormData();
    formData.set("coverImage", file);
    return knowledgeFormRequest<{ article: KnowledgeArticle }>(
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
