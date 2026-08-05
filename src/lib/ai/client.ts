import { apiFetch } from "@/lib/auth/client";
import type {
  PredictionErrorBody,
  PredictionResponse,
  PredictionSource,
} from "./types";

export class AiApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: PredictionErrorBody,
  ) {
    super(message);
    this.name = "AiApiError";
  }
}

export async function predictLeafDisease(
  image: File,
  source: PredictionSource = "WEB",
  deviceId?: string | null,
): Promise<PredictionResponse> {
  if (source === "IOT_CAMERA" && !deviceId?.trim()) {
    throw new AiApiError("Vui lòng nhập mã thiết bị IoT.", 422, {
      status: 422,
      error: "Unprocessable Entity",
      message: "device_id is required when source is IOT_CAMERA",
    });
  }

  const formData = new FormData();
  formData.append("image", image, image.name);
  formData.append("source", source);
  if (source === "IOT_CAMERA" && deviceId?.trim()) {
    formData.append("device_id", deviceId.trim());
  }

  const response = await apiFetch("/api/v1/predict", {
    method: "POST",
    body: formData,
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    const body = normalizePredictionError(payload, response.status, response.statusText);
    throw new AiApiError(body.message, response.status, body);
  }

  if (!hasPredictionData(payload)) {
    throw new AiApiError(
      "AI Service chưa trả dữ liệu chẩn đoán. Vui lòng kiểm tra service AI ở port 8000 và Gateway route /api/v1/predict.",
      503,
      {
        status: 503,
        error: "Service Unavailable",
        message:
          "AI Service chưa trả dữ liệu chẩn đoán. Vui lòng kiểm tra service AI ở port 8000 và Gateway route /api/v1/predict.",
      },
    );
  }

  return normalizePredictionResponse(payload);
}

function hasPredictionData(payload: unknown) {
  const root = isRecord(payload) ? payload : null;
  return isRecord(root?.data);
}

function normalizePredictionResponse(payload: unknown): PredictionResponse {
  const root = isRecord(payload) ? payload : null;
  const data = isRecord(root?.data) ? root.data : null;
  const confidenceText = normalizeConfidenceText(data?.confidence);

  return {
    status: "success",
    data: {
      predictedDisease: readString(data?.predictedDisease ?? data?.predicted_disease) ?? "",
      confidence: parseConfidence(confidenceText),
      confidenceLabel: confidenceText,
      confidenceText,
      source: (data?.source as PredictionSource) ?? "WEB",
      deviceId: readString(data?.deviceId ?? data?.device_id),
      usedDetectionCrop: Boolean(data?.usedDetectionCrop ?? data?.used_detection_crop),
      boundingBox: parseBoundingBox(data?.boundingBox ?? data?.bounding_box),
      image: parseStoredImage(data?.image),
      recommendation: isRecord(data?.recommendation)
        ? (data.recommendation as unknown as PredictionResponse["data"]["recommendation"])
        : null,
      decisionSupport: isRecord(data?.decision_support)
        ? (data.decision_support as unknown as PredictionResponse["data"]["decisionSupport"])
        : isRecord(data?.decisionSupport)
          ? (data.decisionSupport as unknown as PredictionResponse["data"]["decisionSupport"])
          : null,
    },
  };
}

function normalizePredictionError(
  payload: unknown,
  status: number,
  statusText: string,
): PredictionErrorBody {
  const root = isRecord(payload) ? payload : null;
  const detail = root?.detail;
  const error = readString(root?.error) ?? defaultErrorLabel(status);
  const message =
    readString(root?.message) ??
    extractFastApiDetail(detail) ??
    readString(root?.error_description) ??
    (statusText || "Không thể thực hiện chẩn đoán hình ảnh.");

  return {
    status,
    error,
    message,
    detail,
  };
}

function parseBoundingBox(value: unknown) {
  if (!isRecord(value)) return null;
  const left = Number(value.left);
  const top = Number(value.top);
  const right = Number(value.right);
  const bottom = Number(value.bottom);
  if ([left, top, right, bottom].some((entry) => Number.isNaN(entry))) return null;
  return { left, top, right, bottom };
}

function parseStoredImage(value: unknown) {
  if (!isRecord(value)) return null;
  const objectKey = readString(value.objectKey ?? value.object_key);
  const url = readString(value.url);
  if (!objectKey || !url) return null;
  return { objectKey, url };
}

function parseConfidence(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace("%", ""));
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function normalizeConfidenceText(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return `${value.toFixed(2)}%`;
  return "0.00%";
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractFastApiDetail(detail: unknown) {
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!isRecord(item)) return "";
        const message = readString(item.msg ?? item.message ?? item.detail);
        if (!message) return "";
        const location = Array.isArray(item.loc) ? item.loc.at(-1) : null;
        const field = readString(location);
        return field ? `${field}: ${message}` : message;
      })
      .filter(Boolean);

    return messages.length > 0 ? messages.join("; ") : null;
  }

  if (isRecord(detail)) {
    return readString(detail.message ?? detail.detail ?? detail.error);
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function defaultErrorLabel(status: number) {
  if (status === 422) return "Unprocessable Entity";
  if (status === 429) return "Too Many Requests";
  if (status === 502) return "Bad Gateway";
  if (status === 503) return "Service Unavailable";
  return "Request Failed";
}
