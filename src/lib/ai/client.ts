import { apiFetch } from "@/lib/auth/client";
import type { PredictionErrorBody, PredictionResponse, PredictionSource } from "./types";

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
): Promise<PredictionResponse> {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("source", source);

  const response = await apiFetch("/api/v1/predict", {
    method: "POST",
    body: formData,
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    const body = isPredictionError(payload)
      ? payload
      : {
          status: response.status,
          error: response.statusText || "Request Failed",
          message: "Không thể thực hiện chẩn đoán hình ảnh.",
        };
    throw new AiApiError(body.message, response.status, body);
  }

  return normalizePredictionResponse(payload);
}

function normalizePredictionResponse(payload: unknown): PredictionResponse {
  const root = payload as Record<string, unknown> | null;
  const data = (root?.data as Record<string, unknown> | null) ?? null;
  const recommendation = (data?.recommendation as Record<string, unknown> | null) ?? null;
  const decisionSupport = (data?.decision_support ??
    data?.decisionSupport) as Record<string, unknown> | null;

  return {
    status: "success",
    data: {
      predictedDisease: String(data?.predictedDisease ?? data?.predicted_disease ?? ""),
      confidence: parseConfidence(data?.confidence),
      confidenceLabel:
        typeof data?.confidence === "string"
          ? data.confidence
          : `${parseConfidence(data?.confidence).toFixed(2)}%`,
      source: (data?.source as PredictionSource) ?? "WEB",
      deviceId: (data?.deviceId ?? data?.device_id ?? null) as string | null,
      usedDetectionCrop: Boolean(data?.usedDetectionCrop ?? data?.used_detection_crop),
      boundingBox: parseBoundingBox(data?.boundingBox ?? data?.bounding_box),
      image: parseStoredImage(data?.image),
      recommendation: recommendation as PredictionResponse["data"]["recommendation"],
      decisionSupport: decisionSupport as PredictionResponse["data"]["decisionSupport"],
    },
  };
}

function parseBoundingBox(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const box = value as Record<string, unknown>;
  const left = Number(box.left);
  const top = Number(box.top);
  const right = Number(box.right);
  const bottom = Number(box.bottom);
  if ([left, top, right, bottom].some((entry) => Number.isNaN(entry))) return null;
  return { left, top, right, bottom };
}

function parseStoredImage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const image = value as Record<string, unknown>;
  const objectKey = image.objectKey ?? image.object_key;
  const url = image.url;
  if (typeof objectKey !== "string" || typeof url !== "string") return null;
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

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isPredictionError(value: unknown): value is PredictionErrorBody {
  return Boolean(
    value &&
      typeof value === "object" &&
      "message" in value &&
      typeof value.message === "string",
  );
}
