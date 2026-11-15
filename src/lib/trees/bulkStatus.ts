import type {
  BulkTreeHealthStatusResponse,
  ManualTreeHealthStatus,
  TreeSummary,
} from "./types";
import { HEALTH_STATUS_CATALOG } from "./statusCatalog";

/** Targets offered in bulk mode: every health status (labels shared with the map legend). */
export const BULK_STATUS_TARGETS: { value: ManualTreeHealthStatus; label: string; hint: string }[] =
  HEALTH_STATUS_CATALOG.map(({ value, label, meaning }) => ({ value, label, hint: meaning }));

export function bulkTargetLabel(target: ManualTreeHealthStatus) {
  return BULK_STATUS_TARGETS.find((t) => t.value === target)?.label ?? target;
}

/** A tree can be picked when it is active and not already in the target status (no-op). */
export function isBulkSelectable(tree: TreeSummary, target: ManualTreeHealthStatus) {
  const active = !tree.status || tree.status === "ACTIVE";
  return active && tree.healthStatus !== target;
}

export function toggleBulkSelection(
  selected: ReadonlySet<string>,
  tree: TreeSummary,
  target: ManualTreeHealthStatus,
): Set<string> {
  const next = new Set(selected);
  if (next.has(tree.id)) next.delete(tree.id);
  else if (isBulkSelectable(tree, target)) next.add(tree.id);
  return next;
}

/** Keeps only selections that are still valid after the target changes or trees reload. */
export function pruneBulkSelection(
  selected: ReadonlySet<string>,
  trees: TreeSummary[],
  target: ManualTreeHealthStatus,
): Set<string> {
  const byId = new Map(trees.map((t) => [t.id, t]));
  return new Set([...selected].filter((id) => {
    const tree = byId.get(id);
    return tree ? isBulkSelectable(tree, target) : false;
  }));
}

export function bulkConfirmMessage(count: number, target: ManualTreeHealthStatus) {
  return `Đổi trạng thái ${count} cây sang ${bulkTargetLabel(target)}?`;
}

const ERROR_LABELS: Record<string, string> = {
  NOT_FOUND: "không tìm thấy",
  FORBIDDEN: "không có quyền",
  NOT_ACTIVE: "cây đã đốn khỏi bản đồ",
  INVALID: "dữ liệu không hợp lệ",
};

/**
 * Summary text derived only from what the backend reports as saved. Failed trees stay
 * selected so the user can retry or deselect them.
 */
export function summarizeBulkResult(
  response: BulkTreeHealthStatusResponse,
  codeOf: (treeId: string) => string,
): { tone: "success" | "partial" | "error"; message: string; failedIds: string[] } {
  const failed = response.results.filter((r) => !r.updated);
  const label = bulkTargetLabel(response.healthStatus);
  if (failed.length === 0) {
    return { tone: "success", message: `Đã đổi ${response.updated} cây sang ${label}.`, failedIds: [] };
  }
  const details = failed
    .map((r) => `${codeOf(r.treeId)} (${ERROR_LABELS[r.errorCode ?? ""] ?? r.message ?? "lỗi"})`)
    .join(", ");
  return {
    tone: response.updated > 0 ? "partial" : "error",
    message: response.updated > 0
      ? `Đã đổi ${response.updated}/${response.requested} cây sang ${label}. Chưa đổi được: ${details}.`
      : `Không đổi được cây nào sang ${label}: ${details}.`,
    failedIds: failed.map((r) => r.treeId),
  };
}
