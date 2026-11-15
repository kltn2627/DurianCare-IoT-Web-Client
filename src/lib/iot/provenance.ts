import type { IotTelemetryReading } from "./types";

/** Backend provenance: DEVICE = measured by the sensor; SYNTHETIC_BACKFILL = simulated history. */
export const SYNTHETIC_LABEL = "Dữ liệu mô phỏng";

export function isSynthetic(reading: Pick<IotTelemetryReading, "source"> | null | undefined) {
  return reading?.source === "SYNTHETIC_BACKFILL";
}

export function provenanceSummary(readings: Array<Pick<IotTelemetryReading, "source">>) {
  const synthetic = readings.filter(isSynthetic).length;
  return { total: readings.length, synthetic, measured: readings.length - synthetic };
}

export function provenanceNotice(readings: Array<Pick<IotTelemetryReading, "source">>) {
  const { total, synthetic } = provenanceSummary(readings);
  return provenanceNoticeFromCounts(synthetic, total);
}

/** Same notice from sample counts, for server-side bucketed history. */
export function provenanceNoticeFromCounts(synthetic: number, total: number) {
  if (synthetic === 0) return null;
  return `${SYNTHETIC_LABEL}: ${synthetic}/${total} mẫu nhiệt độ – độ ẩm không khí trong khoảng này là dữ liệu mô phỏng `
    + "để lấp khoảng trống lịch sử, không phải số đo từ cảm biến.";
}

export function tooltipSourceLabel(synthetic: boolean | undefined) {
  return synthetic ? `${SYNTHETIC_LABEL} (không phải số đo)` : "Số đo cảm biến";
}

/** Tooltip label for a chart point that may hold a measured value, a simulated value, or both (never averaged together). */
export function pointSourceLabel(point: { measuredCount?: number; syntheticCount?: number } | undefined) {
  const measured = point?.measuredCount ?? 0;
  const synthetic = point?.syntheticCount ?? 0;
  if (measured > 0 && synthetic > 0) {
    return `${tooltipSourceLabel(false)} ${measured} mẫu + ${SYNTHETIC_LABEL} ${synthetic} mẫu (tách riêng)`;
  }
  return tooltipSourceLabel(synthetic > 0);
}
