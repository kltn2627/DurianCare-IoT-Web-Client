import type { NotificationItem } from "./types";

const TYPE_LABELS: Record<string, string> = {
  DEVICE: "Thiết bị IoT",
  ALERT: "Cảnh báo",
  SYSTEM: "Hệ thống",
  ACCOUNT: "Tài khoản",
  GENERAL: "Chung",
  AI: "Chẩn đoán AI",
  KNOWLEDGE: "Kiến thức",
  CONNECTION: "Kết nối",
};

/** Vietnamese label for the notification type; unknown types are shown as sent. */
export function notificationTypeLabel(type: string): string {
  return TYPE_LABELS[type?.toUpperCase?.() ?? ""] ?? type;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Where the notification comes from (device / tree), from its metadata; null when not provided. */
export function notificationSource(item: Pick<NotificationItem, "metadata">): string | null {
  const meta = item.metadata ?? {};
  const device = text(meta.deviceName) ?? text(meta.deviceUid) ?? text(meta.cameraId);
  const tree = text(meta.treeName) ?? text(meta.treeCode) ?? text(meta.treeId);
  const parts = [device && `Thiết bị ${device}`, tree && `Cây ${tree}`].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
