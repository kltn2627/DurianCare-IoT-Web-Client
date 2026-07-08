export type NotificationSortBy = "createdAt" | "title";
export type NotificationSortDirection = "asc" | "desc";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPageResponse {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  numberOfElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
  sortBy: NotificationSortBy;
  sortDirection: NotificationSortDirection;
  notifications: NotificationItem[];
}

export interface NotificationCountResponse {
  count: number;
}

export interface NotificationApiErrorBody {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
}
