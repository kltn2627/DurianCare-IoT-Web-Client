export type KnowledgeStatus = "DRAFT" | "REVIEW" | "PUBLISHED";

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  views: number;
  status: KnowledgeStatus;
  featured: boolean;
  coverTone: string;
  excerpt: string;
  content: string;
  coverPreview?: string | null;
}

export interface KnowledgeEditorState {
  id: string | null;
  title: string;
  category: string;
  author: string;
  excerpt: string;
  content: string;
  status: KnowledgeStatus;
  featured: boolean;
  coverPreview: string | null;
  coverFileName: string | null;
}

export interface KnowledgeState {
  articles: KnowledgeArticle[];
  selectedCategory: string;
  query: string;
  editor: KnowledgeEditorState;
  saveNotice: string | null;
}

export type KnowledgeAction =
  | { type: "FILTER_CATEGORY"; value: string }
  | { type: "SEARCH"; value: string }
  | { type: "EDIT_ARTICLE"; article: KnowledgeArticle }
  | { type: "NEW_ARTICLE" }
  | {
      type: "UPDATE_EDITOR";
      field: keyof KnowledgeEditorState;
      value: KnowledgeEditorState[keyof KnowledgeEditorState];
    }
  | { type: "SET_COVER"; preview: string; fileName: string }
  | { type: "REMOVE_COVER" }
  | { type: "SAVE_ARTICLE"; status: KnowledgeStatus }
  | { type: "DELETE_ARTICLE"; id: string }
  | { type: "CLEAR_NOTICE" };
