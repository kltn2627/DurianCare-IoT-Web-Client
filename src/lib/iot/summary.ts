import type { IotDevice } from "./types";

// Same wording as the sensors page (SensorCharts CONNECTION_LABELS), plus UNKNOWN.
export const CONNECTIVITY_LABELS: Record<string, string> = {
  ONLINE: "Đang kết nối",
  STALE: "Dữ liệu đã cũ",
  OFFLINE: "Mất kết nối",
  UNKNOWN: "Chưa có tín hiệu",
};

export function connectivityLabel(status: string | null | undefined) {
  return CONNECTIVITY_LABELS[status ?? "UNKNOWN"] ?? CONNECTIVITY_LABELS.UNKNOWN;
}

export type IotSummary =
  | { state: "signed-out" }
  | { state: "error" }
  | {
      state: "ok";
      total: number;
      online: number;
      stale: number;
      offline: number;
      unknown: number;
      primaryName: string | null;
      primaryStatus: string | null;
      temperature: number | null;
      telemetryAt: string | null;
    };

/**
 * Counts follow the backend connectivity rule (connectivityStatus derived from last_seen_at):
 * only ONLINE devices are "active"; registration alone never counts.
 */
export function summarizeIotDevices(devices: IotDevice[]): IotSummary {
  const count = (status: string) => devices.filter((d) => (d.connectivityStatus ?? "UNKNOWN") === status).length;
  const primary = devices.find((d) => d.latestTelemetry) ?? devices[0] ?? null;
  const telemetry = primary?.latestTelemetry ?? null;
  return {
    state: "ok",
    total: devices.length,
    online: count("ONLINE"),
    stale: count("STALE"),
    offline: count("OFFLINE"),
    unknown: devices.length - count("ONLINE") - count("STALE") - count("OFFLINE"),
    primaryName: primary ? primary.name : null,
    primaryStatus: primary ? primary.connectivityStatus ?? "UNKNOWN" : null,
    temperature: typeof telemetry?.temperature === "number" ? telemetry.temperature : null,
    telemetryAt: telemetry?.receivedAt ?? telemetry?.measuredAt ?? null,
  };
}

export function stationStat(summary: IotSummary) {
  if (summary.state === "signed-out") return { value: "--", note: "Đăng nhập để xem trạng thái" };
  if (summary.state === "error") return { value: "--", note: "Không tải được trạng thái thiết bị" };
  if (summary.total === 0) return { value: "0/0", note: "Chưa có thiết bị trong phạm vi farm" };
  const value = `${summary.online}/${summary.total}`;
  if (summary.online === summary.total) return { value, note: "Kết nối ổn định" };
  const parts = [
    summary.stale && `${summary.stale} dữ liệu cũ`,
    summary.offline && `${summary.offline} mất kết nối`,
    summary.unknown && `${summary.unknown} chưa có tín hiệu`,
  ].filter(Boolean);
  return { value, note: parts.join(" · ") };
}
