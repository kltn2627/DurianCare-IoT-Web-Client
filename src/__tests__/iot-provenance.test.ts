import { normalizeTelemetry } from "@/lib/iot/client";
import { isSynthetic, provenanceNotice, provenanceSummary, tooltipSourceLabel } from "@/lib/iot/provenance";

const reading = (source?: "DEVICE" | "SYNTHETIC_BACKFILL") =>
  normalizeTelemetry({ id: "x", deviceUid: "esp32-01", temperature: 30, humidity: 70, source });

describe("telemetry provenance on the dashboard", () => {
  it("keeps the backend source and defaults unknown rows to measured", () => {
    expect(reading("SYNTHETIC_BACKFILL")?.source).toBe("SYNTHETIC_BACKFILL");
    expect(reading("DEVICE")?.source).toBe("DEVICE");
    expect(reading(undefined)?.source).toBe("DEVICE");
  });

  it("states how many points are simulated and labels each tooltip", () => {
    const rows = [reading("DEVICE")!, reading("SYNTHETIC_BACKFILL")!, reading("SYNTHETIC_BACKFILL")!];
    expect(provenanceSummary(rows)).toEqual({ total: 3, synthetic: 2, measured: 1 });
    expect(provenanceNotice(rows)).toMatch(/^Dữ liệu mô phỏng: 2\/3 mẫu .* không phải số đo từ cảm biến\.$/);
    expect(provenanceNotice([reading("DEVICE")!])).toBeNull();
    expect(isSynthetic(rows[1])).toBe(true);
    expect(tooltipSourceLabel(true)).toBe("Dữ liệu mô phỏng (không phải số đo)");
    expect(tooltipSourceLabel(false)).toBe("Số đo cảm biến");
  });
});
