import type { CameraDevice } from "./types";

export type CameraTone = "online" | "degraded" | "offline" | "unknown";

export interface CameraStatusView {
  label: string;
  tone: CameraTone;
  /** Snapshots are requested only while this is true (never for an offline/degraded camera). */
  canPreview: boolean;
  message: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  CAMERA_INIT_FAILED: "Camera không khởi tạo được (lỗi cảm biến/cáp camera). Thiết bị đang tự thử lại.",
  CAMERA_STREAM_FAILED: "Camera đang kết nối nhưng không chụp được ảnh. Thiết bị đang tự thử lại.",
  HEARTBEAT_TIMEOUT: "Không nhận được tín hiệu từ camera. Kiểm tra nguồn điện và Wi-Fi tại vườn.",
};

/** How the registry status is shown; the registry (heartbeat + self-test) is the only source of truth. */
export function cameraStatusView(device: Pick<CameraDevice, "status"> & { lastError?: string | null } | null | undefined): CameraStatusView {
  if (!device) return { label: "Chưa có camera", tone: "unknown", canPreview: false, message: null };
  switch (device.status) {
    case "ONLINE":
      return { label: "Online", tone: "online", canPreview: true, message: null };
    case "DEGRADED":
      return { label: "Hoạt động hạn chế", tone: "degraded", canPreview: false,
        message: ERROR_MESSAGES[device.lastError ?? ""] ?? ERROR_MESSAGES.CAMERA_STREAM_FAILED };
    case "OFFLINE":
      return { label: "Offline", tone: "offline", canPreview: false,
        message: ERROR_MESSAGES.HEARTBEAT_TIMEOUT };
    default:
      return { label: "Chưa kết nối", tone: "unknown", canPreview: false,
        message: "Camera chưa từng gửi tín hiệu tới hệ thống." };
  }
}

/** Snapshot polling interval after `failures` consecutive errors: 8 s, 16 s, 32 s, then 60 s. */
export function snapshotDelayMs(failures: number): number {
  return Math.min(60_000, 8_000 * 2 ** Math.max(0, failures));
}
