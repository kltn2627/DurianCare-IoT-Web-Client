export type AiStatus = "PROCESSING" | "COMPLETED" | "FAILED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface TopPrediction {
  label: string;
  confidence: number;
}

export interface AiDiagnosisResult {
  predictedDisease: string | null;
  confidence: string | null;        // "94.23%" — display string
  confidenceScore: number | null;   // 0.9423 — raw float
  riskLevel: RiskLevel | null;
  vietnameseName: string | null;
  diseaseSummary: string | null;
  severity: string | null;
  symptoms: string[];
  immediateActions: string[];
  farmerNotes: string[];
  topPredictions: TopPrediction[];
}

export interface CameraCapture {
  id: string;
  device_id: string;
  image_url: string;
  capture_type: "MANUAL" | "SCHEDULED";
  captured_at: string;
  ai_status: AiStatus | null;
  disease_detected: string | null;
  confidence_score: number | null;
  diagnosis_result: AiDiagnosisResult | null;
  notes: string | null;
}

export interface CaptureHistoryResponse {
  data: CameraCapture[];
  limit: number;
  offset: number;
  count: number;
}

export interface CameraSchedule {
  id: string;
  device_id: string;
  cron_expression: string;
  label: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleResponse {
  device_id: string;
  schedules: CameraSchedule[];
}

export interface ScheduleSlotInput {
  cron_expression: string;
  label: string;
  enabled: boolean;
}

export interface CameraDiagnostics {
  vdd33?: number;
  resetReason?: string;
  uptimeSec?: number;
  freeHeap?: number;
  minFreeHeap?: number;
  freePsram?: number;
  captureOk?: number;
  captureFailures?: number;
  consecutiveCaptureFailures?: number;
  wifiRssi?: number;
  wifiChannel?: number;
  xclkMhz?: number;
  frameSize?: string;
  endpointSource?: string;
}

/**
 * Camera as returned by the backend. The camera's LAN address (ip_address/port/protocol/mac) is not sent to
 * farmers: the UI only ever uses backend URLs (snapshotUrl, image URLs), never the camera itself.
 */
export interface CameraDevice {
  cameraId: string;
  /** DEGRADED: heartbeat is fresh but the self-test failed, the Wi-Fi link is weak or captures keep failing. */
  status: "ONLINE" | "DEGRADED" | "OFFLINE" | "UNKNOWN";
  statusReasons?: string[];
  previewAvailable?: boolean;
  cameraReady?: boolean | null;
  lastError?: string | null;
  firmwareVersion?: string | null;
  wifiRssi?: number | null;
  diagnostics?: CameraDiagnostics | null;
  /** PUSH: the camera uploads frames and takes commands; PULL: legacy LAN-only firmware. */
  deliveryMode?: "PUSH" | "PULL";
  lastFrameAt?: string | null;
  lastSeenAt: string | null;
  endpointVersion: string;
  snapshotUrl: string;
  streamAvailable: boolean;
  id: string;
  device_id: string;
  online: boolean;
  last_seen: string | null;
  firmware_version: string | null;
  tree_id: string | null;
  zone_id: string | null;
  farm_id: string | null;
  created_at: string;
  updated_at: string;
}

export type CameraCommandStatus = "PENDING" | "DELIVERED" | "COMPLETED" | "FAILED" | "EXPIRED";

export interface CameraCommand {
  id: string;
  cameraId: string;
  reason: "ON_DEMAND" | "SCHEDULED";
  status: CameraCommandStatus;
  createdAt: string;
  expiresAt: string;
  captureId: string | null;
  error: string | null;
  capture: CameraCapture | null;
}

/** capture-now: 201 with a capture (legacy LAN pull) or 202 with a queued command (camera pushes the frame). */
export type CaptureNowResult =
  | { kind: "capture"; capture: CameraCapture }
  | { kind: "queued"; command: CameraCommand };

export interface DeviceListResponse {
  devices: CameraDevice[];
}

export interface DeviceResponse {
  device: CameraDevice;
}

export interface AssignTreeInput {
  treeId: string | null;
  zoneId?: string | null;
  farmId?: string | null;
}
