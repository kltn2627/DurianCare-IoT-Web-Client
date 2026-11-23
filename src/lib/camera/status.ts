import type { CameraDevice } from "./types";

export type CameraTone = "online" | "degraded" | "offline" | "unknown";

export interface CameraStatusView {
  label: string;
  tone: CameraTone;
  /** Latest frames are requested only while this is true (never for an offline/broken camera). */
  canPreview: boolean;
  /** "Chụp ngay" is offered only while this is true. */
  canCapture: boolean;
  message: string | null;
  /** Human-readable reasons reported by the backend (heartbeat diagnostics). */
  reasons: string[];
}

const ERROR_MESSAGES: Record<string, string> = {
  CAMERA_INIT_FAILED: "Camera không khởi tạo được (lỗi cảm biến/cáp camera). Thiết bị đang tự thử lại.",
  CAMERA_STREAM_FAILED: "Camera đang kết nối nhưng không chụp được ảnh. Thiết bị đang tự thử lại.",
  HEARTBEAT_TIMEOUT: "Không nhận được tín hiệu từ camera quá 5 phút. Kiểm tra nguồn điện và Wi-Fi tại vườn.",
  WIFI_WEAK: "Sóng Wi-Fi tại camera yếu (dưới −80 dBm): ảnh có thể về chậm. Đưa bộ phát Wi-Fi lại gần hoặc dùng ăng-ten ngoài.",
  CAPTURE_FAILING: "Camera chụp lỗi nhiều lần liên tiếp. Thiết bị đang tự thử lại.",
};

export function cameraReasonText(code: string): string {
  return ERROR_MESSAGES[code] ?? code;
}

type StatusInput = Pick<CameraDevice, "status"> & Partial<Pick<CameraDevice,
  "lastError" | "statusReasons" | "previewAvailable" | "cameraReady">>;

/** How the registry status is shown; the registry (heartbeat + self-test) is the only source of truth. */
export function cameraStatusView(device: StatusInput | null | undefined): CameraStatusView {
  if (!device) return { label: "Chưa có camera", tone: "unknown", canPreview: false, canCapture: false, message: null, reasons: [] };
  const reasons = (device.statusReasons ?? []).map(cameraReasonText);
  switch (device.status) {
    case "ONLINE":
      return { label: "Online", tone: "online", canPreview: true, canCapture: true, message: null, reasons };
    case "DEGRADED": {
      // Degraded only by a weak link (the camera itself works): frames still arrive, just slower.
      const working = device.previewAvailable === true && device.cameraReady !== false;
      const primary = device.statusReasons?.[0] ?? device.lastError ?? "CAMERA_STREAM_FAILED";
      return { label: "Hoạt động hạn chế", tone: "degraded", canPreview: working, canCapture: working,
        message: cameraReasonText(working ? primary : device.lastError ?? primary), reasons };
    }
    case "OFFLINE":
      return { label: "Offline", tone: "offline", canPreview: false, canCapture: false,
        message: ERROR_MESSAGES.HEARTBEAT_TIMEOUT, reasons };
    default:
      return { label: "Chưa kết nối", tone: "unknown", canPreview: false, canCapture: false,
        message: "Camera chưa từng gửi tín hiệu tới hệ thống. Xem “Hướng dẫn kết nối thiết bị”.", reasons };
  }
}

/** Latest-frame refresh interval after `failures` consecutive errors: 8 s, 16 s, 32 s, then 60 s. */
export function snapshotDelayMs(failures: number): number {
  return Math.min(60_000, 8_000 * 2 ** Math.max(0, failures));
}

/** Refresh interval during live view: fast while frames load, the normal back-off after errors. */
export function liveSnapshotDelayMs(failures: number): number {
  return failures <= 0 ? LIVE_SNAPSHOT_MS : snapshotDelayMs(failures);
}

/**
 * Live view (PUSH cameras): while the page is visible the Web asks the camera for a small preview frame
 * every LIVE_PREVIEW_INTERVAL_MS and refreshes the image every LIVE_SNAPSHOT_MS. Preview frames are kept
 * in backend memory only (no history, no AI).
 */
export const LIVE_PREVIEW_INTERVAL_MS = 6_000;
export const LIVE_SNAPSHOT_MS = 3_000;
/** A frame older than this is flagged as old, so a stale photo is never mistaken for the live view. */
export const STALE_FRAME_MS = 2 * 60_000;

/** Live view is possible only for push firmware that the registry says can deliver frames now. */
export function canLivePreview(device: Pick<CameraDevice, "deliveryMode"> | undefined, canPreview: boolean): boolean {
  return canPreview && device?.deliveryMode === "PUSH";
}

export interface FrameAgeView {
  /** e.g. "Ảnh lúc 17:05:12" today, "Ảnh lúc 14:54 19/10/2026" on another day. */
  text: string;
  /** Older than STALE_FRAME_MS. */
  stale: boolean;
}

export function frameAgeView(capturedAt: Date, now: Date = new Date()): FrameAgeView {
  const sameDay = capturedAt.toDateString() === now.toDateString();
  const text = sameDay
    ? `Ảnh lúc ${capturedAt.toLocaleTimeString("vi-VN")}`
    : `Ảnh lúc ${capturedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${capturedAt.toLocaleDateString("vi-VN")}`;
  return { text, stale: now.getTime() - capturedAt.getTime() > STALE_FRAME_MS };
}
