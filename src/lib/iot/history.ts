import { IotApiError, iotClient, normalizeTelemetry } from "./client";
import type { IotRawTelemetryHistoryResponse, IotTelemetryReading } from "./types";

export async function loadDashboardHistory(deviceUid: string, query: { from: string; to: string }) {
  const response = await iotClient.telemetryHistory(deviceUid, { ...query, limit: 1000 });
  if (response.telemetry.length < 1000) return { readings: response.telemetry, incomplete: false };
  try {
    return { readings: await completeTelemetryHistory(deviceUid, query), incomplete: false };
  } catch (error) {
    // A protected legacy route may not be integrated in the deployed Gateway. Do not weaken it.
    if (!(error instanceof IotApiError) || ![401, 404].includes(error.status)) throw error;
    return { readings: response.telemetry, incomplete: true };
  }
}

/** Existing scoped read-only API; fixed upper bound avoids live inserts shifting pages. */
export async function completeTelemetryHistory(deviceUid: string, query: { from: string; to: string }) {
  const readings: IotTelemetryReading[] = [];
  const seen = new Set<string>();
  const limit = 1000;
  for (let offset = 0; offset < 20000; offset += limit) {
    const params = new URLSearchParams({ device_id: deviceUid, from: query.from, to: query.to,
      limit: String(limit), offset: String(offset) });
    const response = await fetch(`/api/backend/v1/sensors/history?${params}`, { cache: "no-store" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const authMessages: Record<string, string> = {
        "Authenticated user is required": "Thiếu danh tính xác thực ở dịch vụ cảm biến",
        "Missing bearer token": "Gateway chưa nhận được phiên đăng nhập",
        "Invalid or expired token": "Phiên đăng nhập đã hết hạn",
        "Phiên đăng nhập đã hết hạn.": "Phiên đăng nhập đã hết hạn",
      };
      const reason = typeof body?.message === "string" ? authMessages[body.message] : undefined;
      throw new IotApiError(`${reason ?? "Không thể tải lịch sử cảm biến"} (HTTP ${response.status}). Vui lòng thử lại.`, response.status);
    }
    const page = await response.json() as IotRawTelemetryHistoryResponse;
    if (!Array.isArray(page.data) || page.offset !== offset || page.data.length > limit) {
      throw new Error("Chưa thể tải đầy đủ lịch sử cảm biến.");
    }
    for (const item of page.data) {
      const reading = normalizeTelemetry(item);
      const timestamp = Date.parse(reading?.measuredAt ?? "");
      if (!reading?.id || reading.deviceUid.toLowerCase() !== deviceUid.toLowerCase() ||
          !Number.isFinite(timestamp) || timestamp < Date.parse(query.from) || timestamp > Date.parse(query.to) || seen.has(reading.id)) {
        throw new Error("Lịch sử cảm biến chưa nhất quán. Vui lòng tải lại.");
      }
      seen.add(reading.id);
      readings.push(reading);
    }
    if (page.data.length < limit) return readings.sort((a, b) => Date.parse(a.measuredAt!) - Date.parse(b.measuredAt!));
  }
  throw new Error("Khoảng thời gian có quá nhiều mẫu. Vui lòng chọn khoảng ngắn hơn.");
}
