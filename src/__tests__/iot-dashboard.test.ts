import { SENSOR_CHART_MODES, SENSOR_RANGE_OPTIONS } from "@/components/charts/SensorCharts";
import { normalizeTelemetry, statusFromSoil } from "@/lib/iot/client";
import { chartReadings, formatTimeLabel, historyQueryForRange } from "@/lib/iot/ranges";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("IoT telemetry normalization", () => {
  it("maps backend snake_case telemetry fields for the dashboard", () => {
    const reading = normalizeTelemetry({
      air_humidity: 83.5,
      device_id: "esp32-01",
      id: "sample-1",
      soil_moisture: 100,
      temperature: 33.5,
      timestamp: "2026-10-14T11:16:42.481Z",
    });

    expect(reading).toMatchObject({
      deviceUid: "esp32-01",
      humidity: 83.5,
      measuredAt: "2026-10-14T11:16:42.481Z",
      soilMoisture: 100,
      status: "WET_WARNING",
      temperature: 33.5,
    });
  });

  it("derives soil status from configured dashboard thresholds", () => {
    expect(statusFromSoil(59.9)).toBe("DRY_WARNING");
    expect(statusFromSoil(60)).toBe("OPTIMAL");
    expect(statusFromSoil(85)).toBe("OPTIMAL");
    expect(statusFromSoil(85.1)).toBe("WET_WARNING");
    expect(statusFromSoil(null)).toBeNull();
  });
});

describe("IoT dashboard chart controls", () => {
  it("offers line, area, and bar chart modes", () => {
    expect(SENSOR_CHART_MODES.map((mode) => mode.key).sort()).toEqual(["area", "bar", "line"]);
  });

  it("offers the required time ranges without exceeding the backend history cap", () => {
    expect(SENSOR_RANGE_OPTIONS.map((option) => option.key)).toEqual(["today", "24h", "7d", "month", "season"]);
    expect(SENSOR_RANGE_OPTIONS.every((option) => option.limit <= 1000)).toBe(true);
  });
});

describe("Vietnam sensor calendar boundaries", () => {
  it("bounds SVG rendering using existing readings only, preserving endpoints and full input", () => {
    const rows = Array.from({length: 5000}, (_, i) => ({id: i}));
    const points = chartReadings(rows);
    expect(points).toHaveLength(240);
    expect(points[0]).toBe(rows[0]);
    expect(points.at(-1)).toBe(rows.at(-1));
    expect(points.every(point => rows.includes(point))).toBe(true);
    expect(rows).toHaveLength(5000);
    expect(chartReadings([])).toEqual([]);
    expect(chartReadings(rows.slice(0, 4))).toHaveLength(4);
  });
  it.each(["2026-03-01T00:30:00+07:00", "2024-03-01T00:30:00+07:00", "2026-05-01T00:30:00+07:00"])(
    "starts the local day/month independently of host timezone: %s", value => {
      const now = new Date(value);
      const expected = value.slice(0, 10) + "T00:00:00+07:00";
      expect(historyQueryForRange("today", now).from).toBe(new Date(expected).toISOString());
      expect(historyQueryForRange("month", now).from).toBe(new Date(expected).toISOString());
    });
  it("uses elapsed 24h / 7d rather than a mislabeled range", () => {
    const now = new Date("2026-10-15T10:00:00Z");
    expect(historyQueryForRange("24h", now).from).toBe("2026-10-14T10:00:00.000Z");
    expect(historyQueryForRange("7d", now).from).toBe("2026-10-08T10:00:00.000Z");
    expect(historyQueryForRange("month", now).from).toBe("2026-09-30T17:00:00.000Z");
    expect(formatTimeLabel("invalid", "today")).toBe("--");
    expect(formatTimeLabel("2026-10-14T18:00:00Z", "7d")).toContain("15");
  });
  it("removes only the sensors alert widget/request, retaining polling and stale-response protection", () => {
    const source = readFileSync(join(process.cwd(), "src/components/charts/SensorCharts.tsx"), "utf8");
    expect(source).not.toContain("listAlerts");
    expect(source).not.toContain("Cảnh báo IoT đang mở");
    expect(source).toContain("POLL_INTERVAL_MS = 8000");
    expect(source).toContain("sequence !== requestSequence.current");
    expect(source).toContain("setHistory([])");
  });
});
