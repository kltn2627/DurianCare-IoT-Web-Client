import { apiFetch } from "@/lib/auth/client";
import type {
  AssignTreeInput,
  CameraCapture,
  CaptureHistoryResponse,
  CameraDevice,
  DeviceListResponse,
  DeviceResponse,
  ScheduleResponse,
  ScheduleSlotInput,
} from "./types";

export class CameraApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CameraApiError";
  }
}

async function cameraFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  const text = await response.text().catch(() => "");
  const payload = text ? safeJson<T>(text) : null;

  if (!response.ok) {
    const message =
      payload !== null &&
      typeof payload === "object" &&
      "error" in (payload as object)
        ? String((payload as Record<string, unknown>).error)
        : "Lỗi kết nối camera.";
    throw new CameraApiError(message, response.status);
  }
  return payload as T;
}

function safeJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export const cameraClient = {
  captureNow: (deviceId: string): Promise<CameraCapture> =>
    cameraFetch<CameraCapture>(
      `/api/v1/camera/capture-now?device_id=${encodeURIComponent(deviceId)}`,
      { method: "POST", body: JSON.stringify({ device_id: deviceId }) },
    ),

  // Returns a blob URL for use in <img src={}> — caller is responsible for revoking it.
  fetchSnapshotBlob: async (deviceId: string): Promise<string> => {
    const response = await apiFetch(
      `/api/v1/camera/snapshot?device_id=${encodeURIComponent(deviceId)}`,
    );
    if (!response.ok) throw new CameraApiError("Snapshot không khả dụng", response.status);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  history: (params: {
    device_id?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<CaptureHistoryResponse> => {
    const query = new URLSearchParams();
    if (params.device_id) query.set("device_id", params.device_id);
    if (params.from)      query.set("from",      params.from);
    if (params.to)        query.set("to",        params.to);
    if (params.limit  != null) query.set("limit",  String(params.limit));
    if (params.offset != null) query.set("offset", String(params.offset));
    return cameraFetch<CaptureHistoryResponse>(`/api/v1/camera/history?${query.toString()}`);
  },

  getSchedule: (deviceId: string): Promise<ScheduleResponse> =>
    cameraFetch<ScheduleResponse>(
      `/api/v1/camera/schedule?device_id=${encodeURIComponent(deviceId)}`,
    ),

  updateSchedule: (deviceId: string, schedules: ScheduleSlotInput[]): Promise<ScheduleResponse> =>
    cameraFetch<ScheduleResponse>("/api/v1/camera/schedule", {
      method: "PUT",
      body: JSON.stringify({ device_id: deviceId, schedules }),
    }),

  listDevices: (): Promise<DeviceListResponse> =>
    cameraFetch<DeviceListResponse>("/api/v1/camera/devices"),

  getDevice: (deviceId: string): Promise<DeviceResponse> =>
    cameraFetch<DeviceResponse>(
      `/api/v1/camera/devices/${encodeURIComponent(deviceId)}`,
    ),

  assignTree: (deviceId: string, input: AssignTreeInput): Promise<DeviceResponse> =>
    cameraFetch<DeviceResponse>(
      `/api/v1/camera/devices/${encodeURIComponent(deviceId)}/tree`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),

  updateConfig: (deviceId: string, cameraUrl: string): Promise<{ device: CameraDevice; camera_url: string }> =>
    cameraFetch<{ device: CameraDevice; camera_url: string }>("/api/v1/camera/config", {
      method: "POST",
      body: JSON.stringify({ device_id: deviceId, camera_url: cameraUrl }),
    }),

  pingSnapshot: async (deviceId: string): Promise<boolean> => {
    try {
      const response = await apiFetch(
        `/api/v1/camera/snapshot?device_id=${encodeURIComponent(deviceId)}`,
        { method: "HEAD" },
      );
      return response.status < 500;
    } catch {
      return false;
    }
  },
};
