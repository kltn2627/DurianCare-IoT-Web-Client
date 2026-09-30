export type KnowledgeStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "REJECTED";

export type KnowledgeRole = "ADMIN" | "ENGINEER" | "EXPERT" | "FARMER" | "OWNER";

export type KnowledgeSort = "publishedAt,desc" | "views,desc";

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  authorUserId?: string | null;
  authorRole?: KnowledgeRole | null;
  authorAvatar?: string | null;
  authorAvatarUrl?: string | null;
  publishedAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  views: number;
  status: KnowledgeStatus;
  featured: boolean;
  coverTone?: string;
  coverImage: string | null;
  coverPreview?: string | null;
  readingTime: string;
  tags: string[];
  excerpt: string;
  content: string;
  rejectionReason?: string | null;
}

export interface KnowledgeArticlePage {
  articles: KnowledgeArticle[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export type KnowledgeMyArticlesResponse = KnowledgeArticlePage;

export interface KnowledgeArticleListParams {
  search?: string;
  category?: string;
  page?: number;
  size?: number;
  sort?: KnowledgeSort | string;
  status?: KnowledgeStatus;
}

export interface KnowledgeCategoryCount {
  category: string;
  count: number;
}

export interface KnowledgeCategoryOption {
  value: string;
  label: string;
}

export interface KnowledgeArticleInput {
  title: string;
  category: string;
  author: string;
  excerpt: string;
  content: string;
  status?: KnowledgeStatus;
  featured?: boolean;
  coverPreview?: string | null;
  coverFile?: File | null;
  tags?: string[];
}

export type KnowledgeArticleRequest = KnowledgeArticleInput;

export interface KnowledgeUploadResponse {
  article: KnowledgeArticle;
}
