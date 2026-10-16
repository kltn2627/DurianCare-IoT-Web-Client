import type { SearchApiErrorBody, SearchRequest, SearchResponse } from "./types";

export class SearchApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: SearchApiErrorBody,
  ) {
    super(message);
    this.name = "SearchApiError";
  }
}

export async function searchDocuments(
  request: SearchRequest,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const query = request.query.trim();
  if (!query) {
    throw new SearchApiError("Từ khóa tìm kiếm không được để trống.", 400);
  }

  const params = new URLSearchParams({
    q: query,
    page: String(request.page),
    size: String(request.size),
    sortBy: request.sortBy,
    sortDirection: request.sortDirection,
  });

  if (request.type) {
    params.set("type", request.type);
  }

  const response = await fetch(`/api/backend/search?${params.toString()}`, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    const body = isSearchApiError(payload)
      ? payload
      : {
          status: response.status,
          error: response.statusText || "Request Failed",
          message: "Không thể tải dữ liệu tìm kiếm.",
        };
    throw new SearchApiError(body.message, response.status, body);
  }

  return payload as SearchResponse;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isSearchApiError(value: unknown): value is SearchApiErrorBody {
  return Boolean(
    value &&
      typeof value === "object" &&
      "message" in value &&
      typeof value.message === "string",
  );
}
