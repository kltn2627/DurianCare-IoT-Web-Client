import { apiFetch } from "@/lib/auth/client";
import type {
  AssignTreeInput,
  CameraCapture,
  CameraCommand,
  CaptureNowResult,
  CaptureHistoryResponse,
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

function captureErrorMessage(payload: Record<string, unknown> | null, status: number): string {
  const code = typeof payload?.code === "string" ? payload.code : "";
  if (code === "CAMERA_PUSH_UNSUPPORTED") return "Firmware camera quá cũ, chưa hỗ trợ gửi ảnh lên máy chủ. Cần cập nhật firmware.";
  if (code === "CAMERA_OFFLINE") return "Camera đang offline — không nhận lệnh chụp.";
  if (code === "CAMERA_NOT_READY") return "Camera báo không chụp được (lỗi cảm biến). Thiết bị đang tự thử lại.";
  if (typeof payload?.error === "string") return payload.error;
  return status === 502 ? "Camera không trả ảnh." : "Lỗi kết nối camera.";
}

function safeJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export const cameraClient = {
  /**
   * Push firmware: the backend queues a command (202) and the camera uploads the frame within seconds.
   * Legacy LAN firmware: the backend downloads the frame itself and answers 201 with the capture.
   */
  captureNow: async (deviceId: string): Promise<CaptureNowResult> => {
    const response = await apiFetch(`/api/v1/camera/capture-now?device_id=${encodeURIComponent(deviceId)}`,
      { method: "POST", body: JSON.stringify({ device_id: deviceId }) });
    const text = await response.text().catch(() => "");
    const payload = text ? safeJson<Record<string, unknown>>(text) : null;
    if (!response.ok) {
      throw new CameraApiError(captureErrorMessage(payload, response.status), response.status);
    }
    if (response.status === 202) return { kind: "queued", command: payload as unknown as CameraCommand };
    return { kind: "capture", capture: payload as unknown as CameraCapture };
  },

  /**
   * Live view: ask a push camera for one small preview frame (not stored in history, no AI). Repeated calls
   * while one is still open reuse it on the backend. Never throws: a missed live frame is not an error.
   */
  requestLivePreview: async (deviceId: string): Promise<boolean> => {
    try {
      const response = await apiFetch(`/api/v1/camera/capture-now?device_id=${encodeURIComponent(deviceId)}`,
        { method: "POST", body: JSON.stringify({ device_id: deviceId, preview: true }) });
      return response.status === 202;
    } catch {
      return false;
    }
  },

  /**
   * Opens or renews the real-time view (camera firmware >= 3.1.0). Returns the MJPEG stream URL for an <img>
   * and when to renew; call it again before `renewAfterMs` or the camera stops streaming.
   * Throws CameraApiError 409 for older firmware (the caller falls back to refreshed snapshots).
   */
  startLive: async (deviceId: string): Promise<{ streamUrl: string; renewAfterMs: number }> => {
    const response = await fetch(`/api/camera/live?device_id=${encodeURIComponent(deviceId)}`,
      { method: "POST", cache: "no-store" });
    const payload = safeJson<Record<string, unknown>>(await response.text().catch(() => "")) ?? {};
    if (!response.ok) {
      if (response.status === 401 && typeof window !== "undefined") window.location.assign("/login");
      throw new CameraApiError(typeof payload.error === "string" ? payload.error : "Không mở được camera trực tiếp",
        response.status);
    }
    const streamUrl = payload.streamUrl;
    if (typeof streamUrl !== "string" || !/^https?:\/\/[^/]+\/api\/v1\/public\/cameras\/[^/]+\/live\.mjpeg\?token=/.test(streamUrl)) {
      throw new CameraApiError("Địa chỉ camera trực tiếp không hợp lệ", 502);
    }
    const renew = Number(payload.renewAfterMs);
    return { streamUrl, renewAfterMs: Number.isFinite(renew) && renew >= 5_000 ? renew : 15_000 };
  },

  getCommand: (deviceId: string, commandId: string): Promise<CameraCommand> =>
    cameraFetch<CameraCommand>(
      `/api/v1/camera/commands/${encodeURIComponent(commandId)}?device_id=${encodeURIComponent(deviceId)}`,
    ),

  /** Polls a queued capture until it completes, fails or expires (or `signal` aborts). */
  waitForCommand: async (deviceId: string, commandId: string, options: { intervalMs?: number; timeoutMs?: number;
    isCancelled?: () => boolean } = {}): Promise<CameraCommand> => {
    const interval = options.intervalMs ?? 2_000;
    const deadline = Date.now() + (options.timeoutMs ?? 150_000);
    for (;;) {
      const command = await cameraClient.getCommand(deviceId, commandId);
      if (["COMPLETED", "FAILED", "EXPIRED"].includes(command.status)) return command;
      if (options.isCancelled?.() || Date.now() >= deadline) return { ...command, status: "EXPIRED" };
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  },

  // Returns a blob URL for use in <img src={}> — caller is responsible for revoking it.
  fetchSnapshotBlob: async (deviceId: string, snapshotPath?: string): Promise<string> =>
    (await cameraClient.fetchLatestFrame(deviceId, snapshotPath)).url,

  /** Latest frame through the backend (never the camera's address) and when the camera took it. */
  fetchLatestFrame: async (deviceId: string, snapshotPath?: string): Promise<{ url: string; capturedAt: Date | null }> => {
    const expectedPath = `/api/v1/camera/snapshot?device_id=${encodeURIComponent(deviceId)}`;
    if (snapshotPath && snapshotPath !== expectedPath) throw new CameraApiError("Đường dẫn camera không hợp lệ", 502);
    const response = await apiFetch(snapshotPath ?? expectedPath);
    if (response.status === 404) throw new CameraApiError("Camera chưa gửi ảnh nào.", 404);
    if (!response.ok) throw new CameraApiError("Snapshot không khả dụng", response.status);
    const blob = await response.blob();
    if (blob.type.split(";")[0] !== "image/jpeg" || blob.size < 4) throw new CameraApiError("Ảnh camera không hợp lệ", 502);
    const header = response.headers.get("X-Frame-Captured-At");
    const capturedAt = header && !Number.isNaN(Date.parse(header)) ? new Date(header) : null;
    return { url: URL.createObjectURL(blob), capturedAt };
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

};
