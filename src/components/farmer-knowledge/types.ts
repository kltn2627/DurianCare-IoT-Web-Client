export interface FarmerKnowledgeArticle {
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
  status: "PUBLISHED" | "DRAFT" | "REVIEW" | "REJECTED";
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

export interface KnowledgeSection {
  heading: string;
  body: string;
}
