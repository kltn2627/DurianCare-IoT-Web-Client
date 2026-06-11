export interface FarmerKnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  views: number;
  status: "PUBLISHED" | "DRAFT" | "REVIEW";
  featured: boolean;
  coverTone: string;
  coverImage: string;
  readingTime: string;
  tags: string[];
  excerpt: string;
  content: string;
}

export interface KnowledgeSection {
  heading: string;
  body: string;
}
