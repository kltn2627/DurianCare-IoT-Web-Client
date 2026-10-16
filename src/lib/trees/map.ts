import type { TreeSummary } from "./types";

export function partitionMapTrees(trees: TreeSummary[]) {
  const active = trees.filter(tree => tree.status !== "REMOVED");
  const positioned = active.filter(tree => Number.isFinite(tree.positionX) && Number.isFinite(tree.positionY) &&
    tree.positionX != null && tree.positionY != null && tree.positionX >= 0 && tree.positionX <= 1 &&
    tree.positionY >= 0 && tree.positionY <= 1);
  return { positioned, unpositionedCount: active.length - positioned.length };
}
