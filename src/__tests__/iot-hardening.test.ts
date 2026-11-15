import { cameraStatusView, snapshotDelayMs } from "@/lib/camera/status";
import { soilSensorNote } from "@/lib/iot/soil";
import { normalizeTelemetry } from "@/lib/iot/client";
import { notificationSource, notificationTypeLabel } from "@/lib/notification/presentation";

describe("camera status view", () => {
  it("previews only an ONLINE camera; DEGRADED/OFFLINE explain why and never preview", () => {
    expect(cameraStatusView({ status: "ONLINE" })).toMatchObject({ tone: "online", canPreview: true });
    const degraded = cameraStatusView({ status: "DEGRADED", lastError: "CAMERA_INIT_FAILED" });
    expect(degraded).toMatchObject({ tone: "degraded", canPreview: false });
    expect(degraded.message).toContain("không khởi tạo được");
    expect(cameraStatusView({ status: "OFFLINE" })).toMatchObject({ tone: "offline", canPreview: false });
    expect(cameraStatusView({ status: "UNKNOWN" }).canPreview).toBe(false);
    expect(cameraStatusView(null).canPreview).toBe(false);
  });

  it("snapshot polling backs off on failures and is capped", () => {
    expect([0, 1, 2, 3, 10].map(snapshotDelayMs)).toEqual([8_000, 16_000, 32_000, 60_000, 60_000]);
  });
});

describe("soil sensor validity", () => {
  it("only OK (or older firmware without a status) is a real value", () => {
    expect(soilSensorNote("OK")).toBeNull();
    expect(soilSensorNote(null)).toBeNull();
    expect(soilSensorNote("UNCALIBRATED")).toBe("Chưa hiệu chuẩn");
    expect(soilSensorNote("NO_SIGNAL")).toContain("Không có tín hiệu");
    expect(soilSensorNote("SOMETHING_NEW")).toBe("Không có dữ liệu hợp lệ");
  });

  it("keeps the probe verdict through normalization and never invents a percentage", () => {
    const reading = normalizeTelemetry({ deviceUid: "esp32-01", soilMoisture: null, soilRaw: 0, soilStatus: "NO_SIGNAL",
      temperature: 29.4, humidity: 80.4 });
    expect(reading).toMatchObject({ soilMoisture: null, soilRaw: 0, soilStatus: "NO_SIGNAL", status: null });
  });
});

describe("notification presentation", () => {
  it("labels types in Vietnamese and shows the source device instead of an internal id", () => {
    expect(notificationTypeLabel("DEVICE")).toBe("Thiết bị IoT");
    expect(notificationTypeLabel("custom")).toBe("custom");
    expect(notificationSource({ metadata: { deviceUid: "esp32-01", alertId: "x" } })).toBe("Thiết bị esp32-01");
    expect(notificationSource({ metadata: { treeCode: "T-12" } })).toBe("Cây T-12");
    expect(notificationSource({})).toBeNull();
  });
});
