export type SensorTimeRange = "today" | "24h" | "7d" | "month" | "season";
const OFFSET_MS = 7 * 60 * 60 * 1000;

export function chartReadings<T>(rows: T[], maxPoints = 240): T[] {
  if (!Number.isInteger(maxPoints) || maxPoints < 2) throw new Error("Invalid chart sample limit");
  if (rows.length <= maxPoints) return rows;
  return Array.from({ length: maxPoints }, (_, i) => rows[Math.floor(i * (rows.length - 1) / (maxPoints - 1))]);
}

export const SEASON_START = "2026-06-01T00:00:00.000Z";

/** `month` is "YYYY-MM" (Vietnam calendar); omitted means the current month. */
export function historyQueryForRange(range: SensorTimeRange, now = new Date(), month?: string) {
  const local = new Date(now.getTime() + OFFSET_MS);
  let from: Date;
  let to = now;
  if (range === "month" && month) {
    const [year, monthIndex] = parseMonthKey(month);
    from = new Date(Date.UTC(year, monthIndex, 1) - OFFSET_MS);
    const end = new Date(Date.UTC(year, monthIndex + 1, 1) - OFFSET_MS - 1);
    if (end.getTime() < now.getTime()) to = end;
    if (from.getTime() > now.getTime()) from = now;
  } else if (range === "today" || range === "month") {
    from = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(),
      range === "month" ? 1 : local.getUTCDate()) - OFFSET_MS);
  } else if (range === "24h" || range === "7d") {
    from = new Date(now.getTime() - (range === "24h" ? 1 : 7) * 86400000);
  } else {
    from = new Date(SEASON_START);
  }
  return { from: from.toISOString(), to: to.toISOString(), limit: 1000 };
}

/** Months of the season from June 2026 up to the current Vietnam month, newest first. */
export function seasonMonthOptions(now = new Date()) {
  const local = new Date(now.getTime() + OFFSET_MS);
  const options: Array<{ key: string; label: string }> = [];
  for (let year = 2026, month = 5; year < local.getUTCFullYear() || (year === local.getUTCFullYear() && month <= local.getUTCMonth());) {
    options.unshift({ key: `${year}-${String(month + 1).padStart(2, "0")}`, label: `Tháng ${month + 1}/${year}` });
    month += 1;
    if (month === 12) { month = 0; year += 1; }
  }
  return options;
}

export function currentMonthKey(now = new Date()) {
  const local = new Date(now.getTime() + OFFSET_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(month: string): [number, number] {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  const index = match ? Number(match[2]) - 1 : -1;
  if (!match || index < 0 || index > 11) throw new Error("Invalid month");
  return [Number(match[1]), index];
}

export function formatTimeLabel(value: string, range: SensorTimeRange, bucketSeconds?: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  if (bucketSeconds !== undefined && bucketSeconds < 86400 && range !== "24h" && range !== "today") {
    return date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  return range === "24h" || range === "today"
    ? date.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" });
}
