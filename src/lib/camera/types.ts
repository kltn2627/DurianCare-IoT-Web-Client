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
