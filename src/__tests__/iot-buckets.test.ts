import { SENSOR_RANGE_OPTIONS } from "@/components/charts/SensorCharts";
import { normalizeTelemetry } from "@/lib/iot/client";
import { loadBucketedHistory } from "@/lib/iot/history";
import { pointSourceLabel, provenanceNotice, provenanceNoticeFromCounts } from "@/lib/iot/provenance";
import { currentMonthKey, formatTimeLabel, historyQueryForRange, seasonMonthOptions } from "@/lib/iot/ranges";
import { bucketLabel, seriesFromBuckets, seriesFromReadings } from "@/lib/iot/series";
import type { IotTelemetryBucket } from "@/lib/iot/types";

const bucket = (overrides: Partial<IotTelemetryBucket> = {}): IotTelemetryBucket => ({
  bucketEnd: "2026-08-12T17:00:00.000Z", bucketStart: "2026-08-11T17:00:00.000Z", count: 10, humidity: 80, light: null,
  soilMoisture: 70, soilStatusCounts: { DRY_WARNING: 1, OPTIMAL: 8, WET_WARNING: 1 }, source: "DEVICE",
  temperature: 31, temperatureMax: 34, temperatureMin: 27, ...overrides,
});
const device = { deviceUid: "esp32-01", id: "2634d1d5", telemetrySource: "registry" as const };
const query = { from: "2026-06-01T00:00:00.000Z", to: "2026-10-22T00:00:00.000Z" };
beforeEach(() => { global.fetch = jest.fn(); });

describe("bucketed season history", () => {
  it("uses server-side buckets for the month and season ranges only", () => {
    expect(SENSOR_RANGE_OPTIONS.filter(option => option.resolution === "bucketed").map(option => option.key))
      .toEqual(["month", "season"]);
  });

  it("keeps measured and synthetic averages in separate fields of the same time slot", () => {
    const series = seriesFromBuckets([
      bucket({ source: "SYNTHETIC_BACKFILL", count: 84, temperature: 27.67, humidity: 88, soilMoisture: null,
        soilStatusCounts: { DRY_WARNING: 0, OPTIMAL: 0, WET_WARNING: 0 } }),
      bucket({ count: 3556, temperature: 34.23 }),
      bucket({ bucketStart: "2026-07-22T17:00:00.000Z", source: "SYNTHETIC_BACKFILL", count: 144, temperature: 29,
        soilMoisture: null, soilStatusCounts: { DRY_WARNING: 0, OPTIMAL: 0, WET_WARNING: 0 } }),
    ], 86400);
    expect(series.resolution).toBe("bucketed");
    expect(series.sampleCount).toBe(3784);
    expect(series.syntheticCount).toBe(228);
    expect(series.statusCounts).toEqual({ DRY_WARNING: 1, OPTIMAL: 8, WET_WARNING: 1 });
    // Jul 23 .. Aug 12 = 21 daily slots; the 19 empty days are explicit gaps rather than collapsed.
    expect(series.points).toHaveLength(21);
    expect(series.points[0].at).toBe("2026-07-22T17:00:00.000Z");
    expect(series.points[1]).toMatchObject({ at: "2026-07-23T17:00:00.000Z", temperature: null, syntheticTemperature: null, measuredCount: 0, syntheticCount: 0 });
    expect(series.points[0]).toMatchObject({ temperature: null, syntheticTemperature: 29, measuredCount: 0, syntheticCount: 144 });
    expect(series.points.at(-1)).toMatchObject({
      temperature: 34.23, syntheticTemperature: 27.67, airHumidity: 80, syntheticAirHumidity: 88,
      measuredCount: 3556, syntheticCount: 84, soilMoisture: 70,
    });
  });

  it("labels synthetic share in the notice and every tooltip", () => {
    expect(provenanceNoticeFromCounts(228, 3784)).toMatch(/^Dữ liệu mô phỏng: 228\/3784 mẫu .* không phải số đo từ cảm biến\.$/);
    expect(provenanceNoticeFromCounts(0, 3784)).toBeNull();
    expect(pointSourceLabel({ measuredCount: 0, syntheticCount: 144 })).toBe("Dữ liệu mô phỏng (không phải số đo)");
    expect(pointSourceLabel({ measuredCount: 5, syntheticCount: 0 })).toBe("Số đo cảm biến");
    expect(pointSourceLabel({ measuredCount: 5, syntheticCount: 2 })).toBe("Số đo cảm biến 5 mẫu + Dữ liệu mô phỏng 2 mẫu (tách riêng)");
  });

  it("splits raw synthetic readings into their own series with the same notice as before", () => {
    const rows = [
      normalizeTelemetry({ id: "a", deviceUid: "esp32-01", measuredAt: "2026-09-01T00:00:00Z", temperature: 30, humidity: 70, soilMoisture: 50 })!,
      normalizeTelemetry({ id: "b", deviceUid: "esp32-01", measuredAt: "2026-09-01T00:10:00Z", temperature: 28, humidity: 90, source: "SYNTHETIC_BACKFILL" })!,
    ];
    const series = seriesFromReadings(rows);
    expect(series.points[0]).toMatchObject({ temperature: 30, syntheticTemperature: null, measuredCount: 1 });
    expect(series.points[1]).toMatchObject({ temperature: null, syntheticTemperature: 28, syntheticAirHumidity: 90, syntheticCount: 1 });
    expect(series.statusCounts.DRY_WARNING).toBe(1);
    expect(provenanceNoticeFromCounts(series.syntheticCount, series.sampleCount)).toBe(provenanceNotice(rows));
  });

  it("requests the registry bucket route and treats unknown sources as simulated", async () => {
    jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      range: { ...query, bucketSeconds: 86400, maxBuckets: 240, resolution: "bucketed" },
      buckets: [bucket(), { ...bucket(), source: "SOMETHING_ELSE" }],
    })));
    const result = await loadBucketedHistory(device, query);
    const url = new URL(String(jest.mocked(fetch).mock.calls[0][0]), "http://localhost");
    expect(url.pathname).toBe("/api/backend/iot/devices/2634d1d5/telemetry/buckets");
    expect(url.searchParams.get("from")).toBe(query.from);
    expect(url.searchParams.get("to")).toBe(query.to);
    expect(result?.buckets.map(item => item.source)).toEqual(["DEVICE", "SYNTHETIC_BACKFILL"]);
  });

  it("uses the device_id-scoped route for the raw-sensor fallback", async () => {
    jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      range: { ...query, bucketSeconds: 86400, maxBuckets: 240, resolution: "bucketed" }, buckets: [],
    })));
    await loadBucketedHistory({ ...device, telemetrySource: "raw-sensor" }, query);
    const url = new URL(String(jest.mocked(fetch).mock.calls[0][0]), "http://localhost");
    expect(url.pathname).toBe("/api/backend/v1/sensors/history/buckets");
    expect(url.searchParams.get("device_id")).toBe("esp32-01");
  });

  it("returns null only when the deployed service lacks the endpoint, and propagates other errors", async () => {
    jest.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 404 }));
    expect(await loadBucketedHistory(device, query)).toBeNull();
    jest.mocked(fetch).mockResolvedValueOnce(new Response('{"message":"Access denied"}', { status: 403 }));
    await expect(loadBucketedHistory(device, query)).rejects.toMatchObject({ status: 403 });
    jest.mocked(fetch).mockResolvedValueOnce(new Response('{"buckets":"nope"}'));
    await expect(loadBucketedHistory(device, query)).rejects.toThrow();
  });
});

describe("month picker", () => {
  const now = new Date("2026-10-22T10:00:00Z");

  it("lists every season month up to the current Vietnam month", () => {
    expect(seasonMonthOptions(now).map(option => option.key)).toEqual(["2026-10", "2026-09", "2026-08", "2026-07", "2026-06"]);
    expect(seasonMonthOptions(now)[2].label).toBe("Tháng 8/2026");
    expect(currentMonthKey(new Date("2026-10-31T17:30:00Z"))).toBe("2026-11");
  });

  it("bounds a past month to its Vietnam calendar days and the current month to now", () => {
    expect(historyQueryForRange("month", now, "2026-08")).toMatchObject({
      from: "2026-07-31T17:00:00.000Z", to: "2026-08-31T16:59:59.999Z",
    });
    expect(historyQueryForRange("month", now, "2026-10")).toMatchObject({ from: "2026-09-30T17:00:00.000Z", to: now.toISOString() });
    expect(historyQueryForRange("month", now)).toEqual(historyQueryForRange("month", now, "2026-10"));
    expect(() => historyQueryForRange("month", now, "2026-13")).toThrow();
  });

  it("shows hours on sub-day buckets and describes bucket widths", () => {
    expect(formatTimeLabel("2026-08-12T05:00:00Z", "month", 21600)).toMatch(/12:00/);
    expect(formatTimeLabel("2026-08-12T05:00:00Z", "season", 86400)).not.toMatch(/:/);
    expect(bucketLabel(86400)).toBe("1 ngày");
    expect(bucketLabel(21600)).toBe("6 giờ");
    expect(bucketLabel(600)).toBe("10 phút");
  });
});
