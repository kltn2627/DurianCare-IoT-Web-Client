import { formatVietnamDate, msUntilNextMinute, vietnamGreeting } from "@/lib/time/vietnamClock";
import { connectivityLabel, stationStat, summarizeIotDevices } from "@/lib/iot/summary";
import type { IotDevice } from "@/lib/iot/types";

describe("Vietnam clock", () => {
  it("formats the current date in Asia/Ho_Chi_Minh, not UTC", () => {
    // 2026-10-18T18:30Z is already 19/10 01:30 in Vietnam (UTC+7).
    expect(formatVietnamDate(new Date("2026-10-18T18:30:00Z"))).toBe("19/10/2026");
    expect(formatVietnamDate(new Date("2026-10-18T16:59:00Z"))).toBe("18/10/2026");
  });

  it("rolls over at Vietnam midnight", () => {
    expect(formatVietnamDate(new Date("2026-10-18T16:59:59Z"))).toBe("18/10/2026");
    expect(formatVietnamDate(new Date("2026-10-18T17:00:00Z"))).toBe("19/10/2026");
  });

  it("chooses the greeting from Vietnam local hour", () => {
    expect(vietnamGreeting(new Date("2026-10-18T01:00:00Z"))).toBe("Chào buổi sáng"); // 08:00
    expect(vietnamGreeting(new Date("2026-10-18T05:00:00Z"))).toBe("Chào buổi trưa"); // 12:00
    expect(vietnamGreeting(new Date("2026-10-18T08:00:00Z"))).toBe("Chào buổi chiều"); // 15:00
    expect(vietnamGreeting(new Date("2026-10-18T13:30:00Z"))).toBe("Chào buổi tối"); // 20:30
  });

  it("schedules the next tick at the minute boundary", () => {
    expect(msUntilNextMinute(new Date("2026-10-18T13:30:45.500Z"))).toBe(14_500);
  });
});

function device(partial: Partial<IotDevice>): IotDevice {
  return {
    cultivationAreaId: null, deviceUid: "d", farmId: "farm-khoa-luan-2026", id: "id", lastSeenAt: null,
    latestTelemetry: null, name: "d", status: "ACTIVE", telemetryState: "NEVER_REPORTED", ...partial,
  };
}

describe("IoT station summary", () => {
  it("counts only ONLINE devices as active; registration alone is not online", () => {
    const summary = summarizeIotDevices([
      device({ id: "1", name: "esp32-01", connectivityStatus: "ONLINE" }),
      device({ id: "2", connectivityStatus: "STALE" }),
      device({ id: "3", connectivityStatus: "OFFLINE" }),
      device({ id: "4" }), // registered, never reported -> no connectivityStatus
    ]);
    expect(stationStat(summary)).toEqual({ value: "1/4", note: "1 dữ liệu cũ · 1 mất kết nối · 1 chưa có tín hiệu" });
  });

  it("reports stable only when every device in scope is ONLINE", () => {
    const summary = summarizeIotDevices([device({ connectivityStatus: "ONLINE" })]);
    expect(stationStat(summary)).toEqual({ value: "1/1", note: "Kết nối ổn định" });
  });

  it("shows honest unavailable states instead of mock numbers", () => {
    expect(stationStat({ state: "error" })).toEqual({ value: "--", note: "Không tải được trạng thái thiết bị" });
    expect(stationStat({ state: "signed-out" }).value).toBe("--");
    expect(stationStat(summarizeIotDevices([]))).toEqual({ value: "0/0", note: "Chưa có thiết bị trong phạm vi farm" });
  });

  it("uses the latest telemetry of the reporting device and maps UNKNOWN to a Vietnamese label", () => {
    const summary = summarizeIotDevices([
      device({ id: "a", name: "silent", connectivityStatus: "UNKNOWN" }),
      device({
        id: "b", name: "esp32-01", connectivityStatus: "UNKNOWN",
        latestTelemetry: { deviceUid: "esp32-01", humidity: 70, id: "t", light: null, measuredAt: null,
          receivedAt: "2026-10-18T13:26:04.223Z", temperature: 30.2, units: { humidity: "%", light: "raw", temperature: "°C" } },
      }),
    ]);
    expect(summary).toMatchObject({ state: "ok", primaryName: "esp32-01", temperature: 30.2, telemetryAt: "2026-10-18T13:26:04.223Z" });
    expect(connectivityLabel("UNKNOWN")).toBe("Chưa có tín hiệu");
    expect(connectivityLabel(undefined)).toBe("Chưa có tín hiệu");
  });
});
