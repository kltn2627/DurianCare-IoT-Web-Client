export type SearchDocumentType = "ARTICLE" | "DISEASE";
export type SearchSortBy = "updatedAt" | "title";
export type SearchSortDirection = "asc" | "desc";

export interface SearchResult {
  id: string;
  type: SearchDocumentType | string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface SearchResponse {
  query: string;
  type: SearchDocumentType | null;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  numberOfElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
  sortBy: SearchSortBy;
  sortDirection: SearchSortDirection;
  results: SearchResult[];
}

export interface SearchRequest {
  query: string;
  type?: SearchDocumentType | "";
  page: number;
  size: number;
  sortBy: SearchSortBy;
  sortDirection: SearchSortDirection;
}

export interface SearchApiErrorBody {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
}
