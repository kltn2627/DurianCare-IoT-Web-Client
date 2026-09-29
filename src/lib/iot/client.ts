import type {
  IotAlertListResponse,
  IotDeviceListResponse,
  IotTelemetryHistoryResponse,
  IotTelemetryLatestResponse,
} from "./types";

async function iotRequest<T>(path: string) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? "Không thể tải dữ liệu IoT.");
  }
  return (await response.json()) as T;
}

function historyQuery(query: { from?: string; limit?: number; to?: string }) {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.limit) params.set("limit", String(query.limit));
  const text = params.toString();
  return text ? `?${text}` : "";
}

export const iotClient = {
  listAlerts: (status = "ALERTING") =>
    iotRequest<IotAlertListResponse>(`/api/backend/iot/alerts?status=${encodeURIComponent(status)}`),
  listDevices: () => iotRequest<IotDeviceListResponse>("/api/backend/iot/devices"),
  latestTelemetry: (deviceId: string) =>
    iotRequest<IotTelemetryLatestResponse>(
      `/api/backend/iot/devices/${encodeURIComponent(deviceId)}/telemetry/latest`,
    ),
  telemetryHistory: (
    deviceId: string,
    query: { from?: string; limit?: number; to?: string } = {},
  ) =>
    iotRequest<IotTelemetryHistoryResponse>(
      `/api/backend/iot/devices/${encodeURIComponent(deviceId)}/telemetry${historyQuery(query)}`,
    ),
};
