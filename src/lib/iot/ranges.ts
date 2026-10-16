export type SensorTimeRange = "today" | "24h" | "7d" | "month" | "season";
const OFFSET_MS = 7 * 60 * 60 * 1000;

export function chartReadings<T>(rows: T[], maxPoints = 240): T[] {
  if (!Number.isInteger(maxPoints) || maxPoints < 2) throw new Error("Invalid chart sample limit");
  if (rows.length <= maxPoints) return rows;
  return Array.from({ length: maxPoints }, (_, i) => rows[Math.floor(i * (rows.length - 1) / (maxPoints - 1))]);
}

export function historyQueryForRange(range: SensorTimeRange, now = new Date()) {
  const local = new Date(now.getTime() + OFFSET_MS);
  let from: Date;
  if (range === "today" || range === "month") {
    from = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(),
      range === "month" ? 1 : local.getUTCDate()) - OFFSET_MS);
  } else if (range === "24h" || range === "7d") {
    from = new Date(now.getTime() - (range === "24h" ? 1 : 7) * 86400000);
  } else {
    from = new Date("2026-06-01T00:00:00.000Z");
  }
  return { from: from.toISOString(), to: now.toISOString(), limit: 1000 };
}

export function formatTimeLabel(value: string, range: SensorTimeRange) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return range === "24h" || range === "today"
    ? date.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" });
}
