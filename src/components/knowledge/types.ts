import type {
  KnowledgeArticle,
  KnowledgeStatus,
} from "@/lib/knowledge/types";

export type { KnowledgeArticle, KnowledgeStatus };

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
  coverFile: File | null;
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
  | { type: "SET_ARTICLES"; articles: KnowledgeArticle[] }
  | { type: "SET_NOTICE"; value: string | null }
  | { type: "SEARCH"; value: string }
  | { type: "EDIT_ARTICLE"; article: KnowledgeArticle }
  | { type: "NEW_ARTICLE" }
  | {
      type: "UPDATE_EDITOR";
      field: keyof KnowledgeEditorState;
      value: KnowledgeEditorState[keyof KnowledgeEditorState];
    }
  | { type: "SET_COVER"; preview: string; fileName: string; file: File }
  | { type: "REMOVE_COVER" }
  | { type: "DELETE_ARTICLE"; id: string }
  | { type: "CLEAR_NOTICE" };
