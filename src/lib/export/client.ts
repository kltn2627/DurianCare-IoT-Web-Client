import { apiFetch } from "@/lib/auth/client";
import type {
  BatchStatus,
  Chemical,
  ChemicalApplication,
  ExportAssessment,
  AssessmentHistoryItem,
  FarmingBatch,
  FinalizeResult,
  Market,
  PublicTraceData,
  TargetMarket,
} from "./types";

async function exportFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res  = await apiFetch(path, init);
  const text = await res.text().catch(() => "");
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error ?? "Export API error");
  return json as T;
}

async function publicFetch<T>(path: string): Promise<T> {
  const res  = await fetch(path);
  const text = await res.text().catch(() => "");
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error ?? "Not found");
  return json as T;
}

export const exportClient = {
  chemicals: (): Promise<{ chemicals: Chemical[] }> =>
    exportFetch("/api/v1/export-assessment/chemicals"),

  markets: (): Promise<{ markets: Market[] }> =>
    exportFetch("/api/v1/export-assessment/markets"),

  batches: (): Promise<{ batches: FarmingBatch[] }> =>
    exportFetch("/api/v1/export-assessment/batches"),

  evaluate: (params: {
    device_id?:             string;
    target_market?:         TargetMarket;
    harvest_date?:          string;
    chemical_applications?: ChemicalApplication[];
    batch_id?:              string;
  }): Promise<ExportAssessment> =>
    exportFetch("/api/v1/export-assessment/evaluate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(params),
    }),

  history: (params?: { device_id?: string; limit?: number }): Promise<{ data: AssessmentHistoryItem[] }> => {
    const q = new URLSearchParams();
    if (params?.device_id) q.set("device_id", params.device_id);
    if (params?.limit)     q.set("limit", String(params.limit));
    return exportFetch(`/api/v1/export-assessment/history?${q.toString()}`);
  },

  updateBatchStatus: (id: string, status: BatchStatus): Promise<{ id: string; batch_code: string; status: BatchStatus }> =>
    exportFetch(`/api/v1/export-assessment/batches/${id}/status`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    }),

  finalizeBatch: (id: string): Promise<FinalizeResult> =>
    exportFetch(`/api/v1/export-assessment/batches/${id}/finalize`, {
      method: "POST",
    }),

  publicTrace: (code: string): Promise<PublicTraceData> =>
    publicFetch(`/api/backend/v1/public/traceability/${encodeURIComponent(code)}`),
};
