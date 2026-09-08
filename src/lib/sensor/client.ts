import { apiFetch } from "@/lib/auth/client";
import type {
  SensorHistoryPoint,
  SensorHistoryResponse,
  SensorLatest,
} from "./types";

export class SensorApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "SensorApiError";
  }
}

async function sensorFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  const text = await response.text().catch(() => "");
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload
        ? String((payload as Record<string, unknown>).message)
        : "Lỗi kết nối cảm biến IoT.";
    throw new SensorApiError(message, response.status);
  }

  return payload as T;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const sensorClient = {
  latest: async (deviceId: string): Promise<SensorLatest> => {
    const raw = await sensorFetch<SensorLatest | { data: SensorLatest }>(
      `/api/v1/sensors/latest?device_id=${encodeURIComponent(deviceId)}`,
    );
    return raw && typeof raw === "object" && "data" in raw ? raw.data : (raw as SensorLatest);
  },

  history: async (params: {
    device_id: string;
    limit?: number;
    from?: string;
    to?: string;
  }): Promise<SensorHistoryResponse> => {
    const query = new URLSearchParams({ device_id: params.device_id });
    if (params.limit != null) query.set("limit", String(params.limit));
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);

    const raw = await sensorFetch<SensorHistoryResponse | SensorHistoryPoint[]>(
      `/api/v1/sensors/history?${query.toString()}`,
    );
    return Array.isArray(raw) ? { data: raw } : raw;
  },
};
