import type { NotificationItem } from "./types";

export function notificationTargetUrl(item: NotificationItem) {
  const value = item.metadata?.targetUrl;
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/[\u0000-\u0020\u007f]/.test(value)) {
    const base = "https://duriancare.invalid";
    const target = new URL(value, base);
    if (target.origin === base) return target.pathname + target.search + target.hash;
  }
  const { treeId, farmId, zoneId } = item.metadata ?? {};
  if ([treeId, farmId, zoneId].every(id => typeof id === "string" && id.trim())) {
    return `/dashboard/client/farms/${encodeURIComponent(String(farmId))}/zones/${encodeURIComponent(String(zoneId))}?treeId=${encodeURIComponent(String(treeId))}`;
  }
  return null;
}
