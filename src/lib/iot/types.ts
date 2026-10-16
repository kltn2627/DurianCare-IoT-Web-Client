export type IotTelemetryReading = {
  air_humidity?: number | null;
  device_id?: string;
  deviceUid: string;
  humidity: number | null;
  id: string;
  light: number | null;
  measuredAt: string | null;
  receivedAt: string | null;
  soil_moisture?: number | null;
  soilMoisture?: number | null;
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
  deviceUid: string;
  farmId: string;
  id: string;
  lastSeenAt: string | null;
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
  startedAt: string | null;
  status: string;
  thresholdValue: number | null;
};

export type IotAlertListResponse = {
  alerts: IotAlert[];
};
