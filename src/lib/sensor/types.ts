export interface SensorLatest {
  device_id: string;
  timestamp: string;
  temperature: number;
  air_humidity: number;
  soil_moisture: number;
}

export interface SensorHistoryPoint {
  timestamp: string;
  temperature: number;
  air_humidity: number;
  soil_moisture: number;
}

export interface SensorHistoryResponse {
  device_id?: string;
  from?: string;
  to?: string;
  data: SensorHistoryPoint[];
}

export type TimeRange = "1D" | "1W" | "1M" | "1Y" | "custom";
export type ChartType = "line" | "bar" | "area";
export type SensorMetric = "temperature" | "air_humidity" | "soil_moisture";
