import { chartReadings } from "./ranges";
import { isSynthetic } from "./provenance";
import type { IotTelemetryBucket, IotTelemetryReading } from "./types";

export type SoilStatusCounts = { DRY_WARNING: number; OPTIMAL: number; WET_WARNING: number };

/**
 * One chart point. Measured and simulated values live in separate fields so the chart draws
 * them as separate series and no point ever mixes the two provenances.
 */
export type SensorChartPoint = {
  at: string;
  airHumidity: number | null;
  measuredCount: number;
  soilMoisture: number | null;
  syntheticAirHumidity: number | null;
  syntheticCount: number;
  syntheticTemperature: number | null;
  temperature: number | null;
};

export type SensorSeries = {
  /** Width of each averaged bucket; undefined for raw readings. */
  bucketSeconds?: number;
  incomplete: boolean;
  points: SensorChartPoint[];
  resolution: "raw" | "bucketed";
  sampleCount: number;
  statusCounts: SoilStatusCounts;
  syntheticCount: number;
};

export const EMPTY_SERIES: SensorSeries = {
  incomplete: false, points: [], resolution: "raw", sampleCount: 0,
  statusCounts: { DRY_WARNING: 0, OPTIMAL: 0, WET_WARNING: 0 }, syntheticCount: 0,
};

export function seriesFromReadings(readings: IotTelemetryReading[], incomplete = false): SensorSeries {
  const statusCounts: SoilStatusCounts = { DRY_WARNING: 0, OPTIMAL: 0, WET_WARNING: 0 };
  let syntheticCount = 0;
  for (const reading of readings) {
    if (isSynthetic(reading)) syntheticCount += 1;
    if (reading.status) statusCounts[reading.status] += 1;
  }
  const points = chartReadings(readings).flatMap((reading): SensorChartPoint[] => {
    if (!reading.measuredAt) return [];
    const synthetic = isSynthetic(reading);
    const humidity = reading.humidity ?? reading.air_humidity ?? null;
    return [{
      at: reading.measuredAt,
      airHumidity: synthetic ? null : humidity,
      measuredCount: synthetic ? 0 : 1,
      soilMoisture: reading.soilMoisture ?? reading.soil_moisture ?? null,
      syntheticAirHumidity: synthetic ? humidity : null,
      syntheticCount: synthetic ? 1 : 0,
      syntheticTemperature: synthetic ? reading.temperature : null,
      temperature: synthetic ? null : reading.temperature,
    }];
  });
  return { incomplete, points, resolution: "raw", sampleCount: readings.length, statusCounts, syntheticCount };
}

/** Joins the per-source buckets of the same time slot into one point without averaging them together. */
export function seriesFromBuckets(buckets: IotTelemetryBucket[], bucketSeconds: number): SensorSeries {
  const statusCounts: SoilStatusCounts = { DRY_WARNING: 0, OPTIMAL: 0, WET_WARNING: 0 };
  const byStart = new Map<string, SensorChartPoint>();
  let sampleCount = 0;
  let syntheticCount = 0;
  for (const bucket of buckets) {
    sampleCount += bucket.count;
    statusCounts.DRY_WARNING += bucket.soilStatusCounts.DRY_WARNING;
    statusCounts.OPTIMAL += bucket.soilStatusCounts.OPTIMAL;
    statusCounts.WET_WARNING += bucket.soilStatusCounts.WET_WARNING;
    const point = byStart.get(bucket.bucketStart) ?? emptyPoint(bucket.bucketStart);
    if (bucket.source === "SYNTHETIC_BACKFILL") {
      syntheticCount += bucket.count;
      point.syntheticCount += bucket.count;
      point.syntheticTemperature = bucket.temperature;
      point.syntheticAirHumidity = bucket.humidity;
    } else {
      point.measuredCount += bucket.count;
      point.temperature = bucket.temperature;
      point.airHumidity = bucket.humidity;
      point.soilMoisture = bucket.soilMoisture;
    }
    byStart.set(bucket.bucketStart, point);
  }
  // Empty slots become explicit gaps, so the category axis stays linear in time and no line bridges missing data.
  const starts = [...byStart.keys()].map(Date.parse);
  if (starts.length > 1 && bucketSeconds > 0) {
    for (let at = Math.min(...starts); at < Math.max(...starts); at += bucketSeconds * 1000) {
      const key = new Date(at).toISOString();
      if (!byStart.has(key)) byStart.set(key, emptyPoint(key));
    }
  }
  const points = [...byStart.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return { bucketSeconds, incomplete: false, points, resolution: "bucketed", sampleCount, statusCounts, syntheticCount };
}

function emptyPoint(at: string): SensorChartPoint {
  return {
    at, airHumidity: null, measuredCount: 0, soilMoisture: null,
    syntheticAirHumidity: null, syntheticCount: 0, syntheticTemperature: null, temperature: null,
  };
}

export function bucketLabel(seconds: number) {
  if (seconds % 86400 === 0) return `${seconds / 86400} ngày`;
  if (seconds % 3600 === 0) return `${seconds / 3600} giờ`;
  return `${Math.round(seconds / 60)} phút`;
}
