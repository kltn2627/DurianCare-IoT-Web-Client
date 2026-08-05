export type KnowledgeStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "REJECTED";

export type KnowledgeRole = "ADMIN" | "ENGINEER" | "FARMER" | "OWNER";

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  views: number;
  status: KnowledgeStatus;
  featured: boolean;
  coverTone: string;
  coverImage: string | null;
  coverPreview?: string | null;
  readingTime: string;
  tags: string[];
  excerpt: string;
  content: string;
  rejectionReason?: string | null;
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
