import { apiFetch } from "@/lib/auth/client";
import type {
  CreateTreeRequest,
  FarmSummary,
  PagedResponse,
  SaveDiagnosisRequest,
  TreeDetail,
  TreeDiagnosis,
  TreeSummary,
  UpdateTreeRequest,
  ZoneDetail,
  ZoneSafetySummary,
  ZoneSummary,
} from "./types";

export class TreeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "TreeApiError";
  }
}

async function treeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const text = await response.text();
  const payload = text ? safeJson(text) : null;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : response.statusText || "Yêu cầu không thành công.";
    throw new TreeApiError(message, response.status, payload);
  }
  return payload as T;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const treeClient = {
  // ── Farms ──────────────────────────────────────────────────────────────────

  listFarms: () =>
    treeRequest<FarmSummary[]>("/api/farms"),

  getFarm: (farmId: string) =>
    treeRequest<FarmSummary>(`/api/farms/${encodeURIComponent(farmId)}`),

  listZones: (farmId: string) =>
    treeRequest<ZoneSummary[]>(`/api/farms/${encodeURIComponent(farmId)}/zones`),

  // ── Zones ──────────────────────────────────────────────────────────────────

  getZone: (zoneId: string) =>
    treeRequest<ZoneDetail>(`/api/zones/${encodeURIComponent(zoneId)}`),

  listTrees: (zoneId: string) =>
    treeRequest<TreeSummary[]>(`/api/zones/${encodeURIComponent(zoneId)}/trees`),

  createTree: (zoneId: string, body: CreateTreeRequest) =>
    treeRequest<TreeDetail>(`/api/zones/${encodeURIComponent(zoneId)}/trees`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getZoneSafety: (zoneId: string) =>
    treeRequest<ZoneSafetySummary>(
      `/api/zones/${encodeURIComponent(zoneId)}/safety-summary`,
    ),

  // ── Trees ──────────────────────────────────────────────────────────────────

  getTree: (treeId: string) =>
    treeRequest<TreeDetail>(`/api/trees/${encodeURIComponent(treeId)}`),

  updateTree: (treeId: string, body: UpdateTreeRequest) =>
    treeRequest<TreeDetail>(`/api/trees/${encodeURIComponent(treeId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  // ── Diagnoses ──────────────────────────────────────────────────────────────

  listDiagnoses: (treeId: string, page = 0, size = 20) =>
    treeRequest<PagedResponse<TreeDiagnosis>>(
      `/api/trees/${encodeURIComponent(treeId)}/diagnoses?page=${page}&size=${size}`,
    ),

  saveDiagnosis: (treeId: string, body: SaveDiagnosisRequest) =>
    treeRequest<TreeDiagnosis>(
      `/api/trees/${encodeURIComponent(treeId)}/diagnoses`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  getLatestDiagnosis: (treeId: string) =>
    treeRequest<TreeDiagnosis>(
      `/api/trees/${encodeURIComponent(treeId)}/diagnoses/latest`,
    ),
};
