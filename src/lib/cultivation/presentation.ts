import type { ExportRelease, HarvestBatch } from "./types";

export function isSyntheticBatch(batch: HarvestBatch) {
  return batch.dataOrigin === "DEMO_SYNTHETIC" || batch.batchCode.startsWith("DEMO-SYNTHETIC-");
}

export function batchDisplayName(batch: HarvestBatch, releases: ExportRelease[]) {
  if (!isSyntheticBatch(batch)) return batch.batchCode;
  const release = releases.find(value => value.harvestBatchId === batch.id && isSyntheticRelease(value));
  return release ? releaseDisplayName(release) : "Lô thu hoạch";
}

export function displayQuantity(quantity: number | string, unit: string) {
  return `${new Intl.NumberFormat("vi-VN", {maximumFractionDigits: 3}).format(Number(quantity))} ${unit.toLowerCase()}`;
}

export function isSyntheticRelease(release: ExportRelease) {
  return release.dataOrigin === "DEMO_SYNTHETIC" || release.releaseCode.startsWith("DEMO-SYNTHETIC-") || release.traceabilitySnapshot?.dataOrigin === "DEMO_SYNTHETIC";
}

export function releaseDisplayName(release: ExportRelease) {
  if (!isSyntheticRelease(release)) return release.releaseCode;
  const variety = release.traceabilitySnapshot?.variety;
  return typeof variety === "string" && variety.trim() ? `Lô ${variety}` : "Hồ sơ xuất xưởng";
}
