import type {
  NotificationApiErrorBody,
  NotificationCountResponse,
  NotificationPageResponse,
  NotificationSortBy,
  NotificationSortDirection,
} from "./types";

export class NotificationApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: NotificationApiErrorBody,
  ) {
    super(message);
    this.name = "NotificationApiError";
  }
}

type NotificationQuery = {
  page?: number;
  size?: number;
  sortBy?: NotificationSortBy;
  sortDirection?: NotificationSortDirection;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    const body = isNotificationApiError(payload)
      ? payload
      : {
          status: response.status,
          error: response.statusText || "Request Failed",
          message: "Không thể tải dữ liệu thông báo.",
        };
    throw new NotificationApiError(body.message, response.status, body);
  }

  return payload as T;
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await fetch(path, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (response.ok) return;

  const text = await response.text();
  const payload = text ? safeJson(text) : null;
  const body = isNotificationApiError(payload)
    ? payload
    : {
        status: response.status,
        error: response.statusText || "Request Failed",
        message: "Không thể thực hiện thao tác thông báo.",
      };
  throw new NotificationApiError(body.message, response.status, body);
}

function buildQuery(query: NotificationQuery) {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));
  params.set("sortBy", query.sortBy ?? "createdAt");
  params.set("sortDirection", query.sortDirection ?? "desc");
  return params.toString();
}

export const notificationClient = {
  count: () =>
    requestJson<NotificationCountResponse>(
      "/api/notifications/notifications/count",
    ),
  list: (query: NotificationQuery = {}) =>
    requestJson<NotificationPageResponse>(
      `/api/notifications/notifications?${buildQuery(query)}`,
    ),
  unread: (query: NotificationQuery = {}) =>
    requestJson<NotificationPageResponse>(
      `/api/notifications/notifications/unread?${buildQuery(query)}`,
    ),
  markRead: (id: string) =>
    requestVoid(
      `/api/notifications/notifications/${encodeURIComponent(id)}/read`,
      { method: "PATCH" },
    ),
  markAllRead: () =>
    requestVoid("/api/notifications/notifications/read-all", {
      method: "PATCH",
    }),
  delete: (id: string) =>
    requestVoid(`/api/notifications/notifications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isNotificationApiError(value: unknown): value is NotificationApiErrorBody {
  return Boolean(
    value &&
      typeof value === "object" &&
      "message" in value &&
      typeof value.message === "string",
  );
}
