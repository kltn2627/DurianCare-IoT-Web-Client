import { apiFetch } from "@/lib/auth/client";
import type {
  ConnectionPage,
  ConnectionUser,
  UserConnection,
  UserConnectionSource,
} from "./types";

const REQUEST_TIMEOUT_MS = 12000;

export class ConnectionApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ConnectionApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await apiFetch(path, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ConnectionApiError(
        "Backend kết nối phản hồi quá lâu. Hãy kiểm tra auth-service/gateway rồi thử lại.",
        503,
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  const text = await response.text().catch(() => "");
  const payload = text ? safeJson(text) : null;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Không thể thực hiện yêu cầu kết nối.";
    throw new ConnectionApiError(message, response.status);
  }
  return payload as T;
}

export const connectionClient = {
  searchByPhone: (phoneNumber: string) =>
    request<ConnectionUser | null>(
      `/api/connections/search?phoneNumber=${encodeURIComponent(phoneNumber)}`,
    ),
  communityUsers: (query: string, page = 0, size = 20) => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (query.trim()) params.set("query", query.trim());
    return request<ConnectionPage<ConnectionUser>>(
      `/api/community/users?${params.toString()}`,
    );
  },
  sendRequest: (receiverId: string, source: UserConnectionSource) =>
    request<UserConnection>("/api/connections/requests", {
      method: "POST",
      body: JSON.stringify({ receiverId, source }),
    }),
  incoming: () =>
    request<UserConnection[]>("/api/connections/requests/incoming"),
  outgoing: () =>
    request<UserConnection[]>("/api/connections/requests/outgoing"),
  accept: (connectionId: string) =>
    request<UserConnection>(
      `/api/connections/requests/${encodeURIComponent(connectionId)}/accept`,
      { method: "PATCH" },
    ),
  reject: (connectionId: string) =>
    request<UserConnection>(
      `/api/connections/requests/${encodeURIComponent(connectionId)}/reject`,
      { method: "PATCH" },
    ),
  cancel: (connectionId: string) =>
    request<UserConnection>(
      `/api/connections/requests/${encodeURIComponent(connectionId)}/cancel`,
      { method: "PATCH" },
    ),
  listConnections: (page = 0, size = 20) =>
    request<ConnectionPage<UserConnection>>(
      `/api/connections?page=${page}&size=${size}`,
    ),
  disconnect: (connectionId: string) =>
    request<UserConnection>(`/api/connections/${encodeURIComponent(connectionId)}`, {
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
