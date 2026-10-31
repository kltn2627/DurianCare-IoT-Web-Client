import type {
  IotDevice,
  IotAlertListResponse,
  IotDeviceListResponse,
  IotFarmSummary,
  IotRawTelemetryHistoryResponse,
  IotTelemetryReading,
  IotTelemetryHistoryResponse,
  IotTelemetryLatestResponse,
} from "./types";

export class IotApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = "IotApiError"; }
}

async function iotRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new IotApiError(body?.message ?? "Không thể tải dữ liệu IoT.", response.status);
  }
  return (await response.json()) as T;
}

export function normalizeTelemetry(reading: Partial<IotTelemetryReading> | null | undefined): IotTelemetryReading | null {
  if (!reading) return null;
  const humidity = reading.humidity ?? reading.air_humidity ?? null;
  const soilMoisture = reading.soilMoisture ?? reading.soil_moisture ?? null;
  return {
    device_id: reading.device_id,
    deviceUid: reading.deviceUid ?? reading.device_id ?? "",
    humidity,
    id: reading.id ?? "",
    light: reading.light ?? null,
    measuredAt: reading.measuredAt ?? reading.timestamp ?? null,
    receivedAt: reading.receivedAt ?? null,
    soil_moisture: soilMoisture,
    soilMoisture,
    status: reading.status ?? statusFromSoil(soilMoisture),
    temperature: reading.temperature ?? null,
    units: reading.units ?? {
      humidity: "%",
      light: "raw",
      temperature: "°C",
    },
  };
}

export function statusFromSoil(soilMoisture: number | null | undefined) {
  if (soilMoisture === null || soilMoisture === undefined) return null;
  if (soilMoisture < 60) return "DRY_WARNING";
  if (soilMoisture > 85) return "WET_WARNING";
  return "OPTIMAL";
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
  registerDevice: (deviceUid: string, farmId: string) =>
    iotRequest<{ device: IotDevice }>("/api/backend/iot/devices", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceUid: deviceUid.trim(), farmId, cultivationAreaId: null, status: "ACTIVE" }),
    }),
  listAlerts: (status = "ALERTING") =>
    iotRequest<IotAlertListResponse>(`/api/backend/iot/alerts?status=${encodeURIComponent(status)}`),
  listFarms: async () => {
    const payload = await iotRequest<unknown>("/api/backend/v1/farms");
    if (Array.isArray(payload)) return payload as IotFarmSummary[];
    if (payload && typeof payload === "object" && "data" in payload && Array.isArray((payload as { data: unknown }).data)) {
      return (payload as { data: IotFarmSummary[] }).data;
    }
    if (payload && typeof payload === "object" && "content" in payload && Array.isArray((payload as { content: unknown }).content)) {
      return (payload as { content: IotFarmSummary[] }).content;
    }
    return [];
  },
  listDevices: () => iotRequest<IotDeviceListResponse>("/api/backend/iot/devices"),
  latestTelemetry: async (deviceId: string) => {
    const response = await iotRequest<IotTelemetryLatestResponse>(
      `/api/backend/iot/devices/${encodeURIComponent(deviceId)}/telemetry/latest`,
    );
    return { ...response, telemetry: normalizeTelemetry(response.telemetry) };
  },
  rawLatestTelemetry: async (deviceId: string) =>
    normalizeTelemetry(
      await iotRequest<IotTelemetryReading>(
        `/api/backend/v1/sensors/latest?device_id=${encodeURIComponent(deviceId)}`,
      ),
    ),
  rawTelemetryHistory: async (
    deviceId: string,
    query: { from?: string; limit?: number; to?: string } = {},
  ) => {
    const limit = query.limit ?? 288;
    const params = new URLSearchParams({
      device_id: deviceId,
      limit: String(limit),
    });
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    const response = await iotRequest<IotRawTelemetryHistoryResponse>(
      `/api/backend/v1/sensors/history?${params.toString()}`,
    );
    return response.data.map(normalizeTelemetry).filter((item): item is IotTelemetryReading => item !== null).reverse();
  },
  telemetryHistory: async (
    deviceId: string,
    query: { from?: string; limit?: number; to?: string } = {},
  ) => {
    const response = await iotRequest<IotTelemetryHistoryResponse>(
      `/api/backend/iot/devices/${encodeURIComponent(deviceId)}/telemetry${historyQuery(query)}`,
    );
    return {
      ...response,
      telemetry: response.telemetry.map(normalizeTelemetry).filter((item): item is IotTelemetryReading => item !== null),
    };
  },
};
