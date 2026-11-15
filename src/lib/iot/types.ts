export type IotTelemetryReading = {
  air_humidity?: number | null;
  device_id?: string;
  deviceUid: string;
  humidity: number | null;
  id: string;
  light: number | null;
  measuredAt: string | null;
  receivedAt: string | null;
  /** DEVICE = measured; SYNTHETIC_BACKFILL = labelled simulated history. */
  source?: "DEVICE" | "SYNTHETIC_BACKFILL";
  soil_moisture?: number | null;
  soilMoisture?: number | null;
  /** Firmware >= 1.4.0: raw ADC value and the probe verdict (soilMoisture is null unless soilStatus is OK). */
  soilRaw?: number | null;
  soilStatus?: string | null;
  dhtStatus?: string | null;
  status?: "DRY_WARNING" | "OPTIMAL" | "WET_WARNING" | null;
  temperature: number | null;
  timestamp?: string | null;
  units: {
    humidity: "%";
    light: "raw";
    temperature: "°C";
  };
};

export type IotDevice = {
  administrativeStatus?: string;
  cultivationAreaId: string | null;
  connectivity?: {
    ageSeconds?: number;
    basis: string;
    expectedTelemetryIntervalSeconds?: number;
    lastTelemetryAt: string | null;
    offlineAfterSeconds?: number;
    staleAfterSeconds?: number;
    status: string;
    suppressesOfflineAlert?: boolean;
  };
  connectivityStatus?: string;
  claimedAt?: string | null;
  deviceType?: "SENSOR" | "CAMERA";
  deviceUid: string;
  farmId: string;
  firmwareVersion?: string | null;
  id: string;
  lastSeenAt: string | null;
  provisioningStatus?: "PROVISIONED" | "CLAIMED";
  latestTelemetry: IotTelemetryReading | null;
  name: string;
  status: string;
  telemetryState: string;
  telemetrySource?: "registry" | "raw-sensor";
};

export type IotDeviceSummary = Omit<IotDevice, "latestTelemetry">;

export type IotDeviceListResponse = {
  devices: IotDevice[];
};

export type IotTelemetryLatestResponse = {
  device: IotDeviceSummary;
  telemetry: IotTelemetryReading | null;
};

export type IotTelemetryHistoryResponse = {
  device?: IotDeviceSummary;
  range: {
    from: string;
    limit: number;
    resolution: string;
    to: string;
  };
  telemetry: IotTelemetryReading[];
};

/** Server-side average of one source over one time bucket; DEVICE and SYNTHETIC_BACKFILL never share a bucket. */
export type IotTelemetryBucket = {
  bucketEnd: string;
  bucketStart: string;
  count: number;
  humidity: number | null;
  light: number | null;
  soilMoisture: number | null;
  soilStatusCounts: { DRY_WARNING: number; OPTIMAL: number; WET_WARNING: number };
  source: "DEVICE" | "SYNTHETIC_BACKFILL";
  temperature: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
};

export type IotTelemetryBucketResponse = {
  device?: IotDeviceSummary;
  range: {
    bucketSeconds: number;
    from: string;
    maxBuckets: number;
    resolution: "bucketed";
    to: string;
  };
  buckets: IotTelemetryBucket[];
};

export type IotRawTelemetryHistoryResponse = {
  count: number;
  data: IotTelemetryReading[];
  limit: number;
  offset: number;
};

export type IotFarmSummary = {
  code?: string | null;
  id: string;
  name?: string | null;
};

export type IotAlert = {
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  alertType: string;
  cultivationAreaId: string | null;
  deviceId: string | null;
  deviceName: string;
  deviceUid: string;
  farmId: string;
  id: string;
  lastObservedAt: string | null;
  measuredValue: number | null;
  message: string;
  recoveredAt: string | null;
  severity?: "INFO" | "WARNING" | "CRITICAL" | null;
  startedAt: string | null;
  status: string;
  thresholdValue: number | null;
};

export type IotAlertListResponse = {
  alerts: IotAlert[];
};
