import type { TreeHealthStatus, TreeStatus, TreeSummary } from "./types";

/**
 * Tree statuses exactly as duriancare-farm-service defines them (TreeHealthStatus / TreeStatus).
 * The owning farmer may set any health status manually on an active tree (single or bulk).
 * AI diagnosis is a separate feature: saving a diagnosis suggests/applies a status, but it is
 * never required before a manual change.
 */
export const HEALTH_STATUS_CATALOG: Array<{ value: TreeHealthStatus; label: string; meaning: string }> = [
  { value: "HEALTHY", label: "Khỏe mạnh", meaning: "Cây khỏe; cây mới tạo cũng bắt đầu ở trạng thái này." },
  { value: "SUSPECTED", label: "Nghi ngờ", meaning: "Có dấu hiệu bất thường, cần theo dõi thêm." },
  { value: "DISEASED", label: "Bệnh", meaning: "Cây đang bị bệnh." },
  { value: "TREATING", label: "Đang điều trị", meaning: "Cây đang được chăm sóc/điều trị." },
  { value: "RECOVERED", label: "Đã hồi phục", meaning: "Cây đã hồi phục sau điều trị." },
];

export const LIFECYCLE_STATUS_CATALOG: Array<{ value: TreeStatus; label: string; meaning: string }> = [
  { value: "ACTIVE", label: "Đang trồng", meaning: "Cây đang hiển thị trên bản đồ; có thể chẩn đoán và đổi trạng thái sức khỏe." },
  { value: "REMOVED", label: "Đã đốn", meaning: "Đã gỡ khỏi bản đồ bằng thao tác “Đốn cây”; lịch sử được giữ, không đổi được trạng thái." },
  { value: "DEAD", label: "Đã chết", meaning: "Giá trị có trong hệ thống nhưng hiện chưa có thao tác nào ghi trạng thái này." },
];

/** Filter key for trees that have no health status yet. */
export const UNASSESSED = "UNASSESSED";

export function healthKey(tree: Pick<TreeSummary, "healthStatus">): string {
  return tree.healthStatus ?? UNASSESSED;
}

export function countByHealth(trees: Array<Pick<TreeSummary, "healthStatus">>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tree of trees) counts[healthKey(tree)] = (counts[healthKey(tree)] ?? 0) + 1;
  return counts;
}

/** An empty filter shows every tree. */
export function matchesHealthFilter(tree: Pick<TreeSummary, "healthStatus">, filter: ReadonlySet<string>) {
  return filter.size === 0 || filter.has(healthKey(tree));
}

export function toggleFilterValue(filter: ReadonlySet<string>, value: string): Set<string> {
  const next = new Set(filter);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
