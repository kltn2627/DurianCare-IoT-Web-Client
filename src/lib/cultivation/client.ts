import { apiFetch } from "@/lib/auth/client";
import type {
  ActivityStatus,
  ActivityType,
  AgriculturalInput,
  AuditLog,
  BiologicalLevel,
  CareHistoryResponse,
  ComplianceAssessment,
  CultivationActivity,
  CultivationDashboardData,
  CultivationPlan,
  CultivationZone,
  CultivationZoneRequest,
  ExportRelease,
  ExportReleaseStatus,
  FarmOption,
  HarvestBatch,
  InputStatus,
  LabResidueResult,
  LabSample,
  ResidueStandard,
  SafeHarvestDateResponse,
  TraceabilitySnapshot,
} from "./types";
import { cultivationMockClient } from "./mock";

export class CultivationApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "CultivationApiError";
  }
}

type QueryValue = string | number | boolean | null | undefined;
type Query = Record<string, QueryValue>;

function queryString(query?: Query) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

async function cultivationRequest<T>(path: string, init?: RequestInit): Promise<T> {
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
    throw new CultivationApiError(errorMessage(payload, response.statusText), response.status, payload);
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

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    return String((payload as { message: unknown }).message);
  }
  if (payload && typeof payload === "object" && "detail" in payload) {
    return String((payload as { detail: unknown }).detail);
  }
  return fallback || "Khong the tai du lieu lich canh tac.";
}

function unwrapArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload && Array.isArray((payload as { data: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  if (payload && typeof payload === "object" && "content" in payload && Array.isArray((payload as { content: unknown }).content)) {
    return (payload as { content: T[] }).content;
  }
  return [];
}

function shouldUseMock(caught: unknown) {
  if (caught instanceof CultivationApiError) {
    return caught.status === 404 || caught.status === 501 || caught.status === 503;
  }
  return caught instanceof TypeError;
}

export const cultivationClient = {
  listFarms: async () => {
    try {
      const payload = await cultivationRequest<unknown>("/api/v1/farms");
      return unwrapArray<FarmOption>(payload);
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.listFarms();
      throw caught;
    }
  },
  listCultivationZones: async (query?: { farmId?: string; status?: string; search?: string }) => {
    try {
      const payload = await cultivationRequest<unknown>(`/api/v1/cultivation-zones${queryString(query)}`);
      return unwrapArray<CultivationZone>(payload);
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.listCultivationZones(query);
      throw caught;
    }
  },
  createCultivationZone: async (body: CultivationZoneRequest) => {
    try {
      return await cultivationRequest<CultivationZone>("/api/v1/cultivation-zones", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.createCultivationZone(body);
      throw caught;
    }
  },
  getCultivationZone: async (id: string) => {
    try {
      return await cultivationRequest<CultivationZone>(`/api/v1/cultivation-zones/${encodeURIComponent(id)}`);
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.getCultivationZone(id);
      throw caught;
    }
  },
  updateCultivationZone: async (id: string, body: CultivationZoneRequest) => {
    try {
      return await cultivationRequest<CultivationZone>(`/api/v1/cultivation-zones/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.updateCultivationZone(id, body);
      throw caught;
    }
  },
  deleteCultivationZone: async (id: string) => {
    try {
      await cultivationRequest<unknown>(`/api/v1/cultivation-zones/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.deleteCultivationZone(id);
      throw caught;
    }
  },

  listPlans: async (query?: { farmId?: string; plotId?: string; cultivationSeasonId?: string }) => {
    try {
      return await cultivationRequest<CultivationPlan[]>(`/api/v1/cultivation-plans${queryString(query)}`);
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.listPlans(query);
      throw caught;
    }
  },
  createPlan: async (body: Partial<CultivationPlan>) => {
    try {
      return await cultivationRequest<CultivationPlan>("/api/v1/cultivation-plans", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.createPlan(body);
      throw caught;
    }
  },
  getPlan: (id: string) =>
    cultivationRequest<CultivationPlan>(`/api/v1/cultivation-plans/${encodeURIComponent(id)}`),
  getPlanCalendar: (id: string) =>
    cultivationRequest<CultivationActivity[]>(`/api/v1/cultivation-plans/${encodeURIComponent(id)}/calendar`),

  listActivities: async (query?: { cultivationSeasonId?: string; activityType?: ActivityType; status?: ActivityStatus }) => {
    try {
      return await cultivationRequest<CultivationActivity[]>(`/api/v1/cultivation-activities${queryString(query)}`);
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.listActivities(query);
      throw caught;
    }
  },
  getActivity: (id: string) =>
    cultivationRequest<CultivationActivity>(`/api/v1/cultivation-activities/${encodeURIComponent(id)}`),
  createActivity: async (body: Record<string, unknown>) => {
    try {
      return await cultivationRequest<CultivationActivity>("/api/v1/cultivation-activities", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.createActivity(body);
      throw caught;
    }
  },
  updateActivity: (id: string, body: Record<string, unknown>) =>
    cultivationRequest<CultivationActivity>(`/api/v1/cultivation-activities/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  approveActivity: (id: string, userId: string) =>
    cultivationRequest<CultivationActivity>(`/api/v1/cultivation-activities/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  rejectActivity: (id: string, userId: string, reason: string) =>
    cultivationRequest<CultivationActivity>(`/api/v1/cultivation-activities/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: JSON.stringify({ userId, reason }),
    }),
  startActivity: async (id: string) => {
    try {
      return await cultivationRequest<CultivationActivity>(`/api/v1/cultivation-activities/${encodeURIComponent(id)}/start`, {
        method: "POST",
      });
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.updateActivityStatus(id, "IN_PROGRESS");
      throw caught;
    }
  },
  completeActivity: async (id: string, body: Record<string, unknown>) => {
    try {
      return await cultivationRequest<{ activity: CultivationActivity; execution: unknown; inputUsages: unknown[]; earliestSafeHarvestDate?: string | null }>(
        `/api/v1/cultivation-activities/${encodeURIComponent(id)}/complete`,
        { method: "POST", body: JSON.stringify(body) },
      );
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.completeActivity(id);
      throw caught;
    }
  },
  skipActivity: async (id: string) => {
    try {
      return await cultivationRequest<CultivationActivity>(`/api/v1/cultivation-activities/${encodeURIComponent(id)}/skip`, {
        method: "POST",
      });
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.updateActivityStatus(id, "SKIPPED");
      throw caught;
    }
  },
  cancelActivity: async (id: string) => {
    try {
      return await cultivationRequest<CultivationActivity>(`/api/v1/cultivation-activities/${encodeURIComponent(id)}/cancel`, {
        method: "POST",
      });
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.updateActivityStatus(id, "CANCELLED");
      throw caught;
    }
  },

  careHistory: async (seasonId: string) => {
    try {
      return await cultivationRequest<CareHistoryResponse>(`/api/v1/cultivation-seasons/${encodeURIComponent(seasonId)}/care-history`);
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.careHistory(seasonId);
      throw caught;
    }
  },
  chemicalHistory: (seasonId: string) =>
    cultivationRequest<CultivationActivity[]>(`/api/v1/cultivation-seasons/${encodeURIComponent(seasonId)}/chemical-history`),
  getSafeHarvestDate: (cultivationSeasonId: string) =>
    cultivationRequest<SafeHarvestDateResponse | string | null>(
      `/api/v1/cultivation-seasons/${encodeURIComponent(cultivationSeasonId)}/safe-harvest-date`,
    ),
  assessCompliance: (cultivationSeasonId: string, targetMarketCode: string, harvestBatchId?: string) =>
    cultivationRequest<ComplianceAssessment>(
      `/api/v1/cultivation-seasons/${encodeURIComponent(cultivationSeasonId)}/compliance-assessments`,
      { method: "POST", body: JSON.stringify({ targetMarketCode, harvestBatchId }) },
    ),

  listAgriculturalInputs: (query?: { biologicalLevel?: BiologicalLevel; status?: InputStatus }) =>
    cultivationRequest<AgriculturalInput[]>(`/api/v1/agricultural-inputs${queryString(query)}`),
  createAgriculturalInput: (body: Record<string, unknown>) =>
    cultivationRequest<AgriculturalInput>("/api/v1/agricultural-inputs", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listResidueStandards: (query?: { marketCode?: string; commodityCode?: string; activeIngredientCode?: string }) =>
    cultivationRequest<ResidueStandard[]>(`/api/v1/residue-standards${queryString(query)}`),
  createResidueStandard: (body: Record<string, unknown>) =>
    cultivationRequest<ResidueStandard>("/api/v1/residue-standards", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  importResidueStandards: (body: Record<string, unknown>[]) =>
    cultivationRequest<ResidueStandard[]>("/api/v1/residue-standards/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listLabSamples: (query?: { cultivationSeasonId?: string; harvestBatchId?: string }) =>
    cultivationRequest<LabSample[]>(`/api/v1/lab-samples${queryString(query)}`),
  getLabSample: (id: string) =>
    cultivationRequest<LabSample>(`/api/v1/lab-samples/${encodeURIComponent(id)}`),
  createLabSample: (body: Record<string, unknown>) =>
    cultivationRequest<LabSample>("/api/v1/lab-samples", { method: "POST", body: JSON.stringify(body) }),
  createLabResult: (body: Record<string, unknown>) =>
    cultivationRequest<LabResidueResult>("/api/v1/lab-results", { method: "POST", body: JSON.stringify(body) }),

  listHarvestBatches: (query?: { cultivationSeasonId?: string; farmId?: string; plotId?: string }) =>
    cultivationRequest<HarvestBatch[]>(`/api/v1/harvest-batches${queryString(query)}`),
  getHarvestBatch: (id: string) =>
    cultivationRequest<HarvestBatch>(`/api/v1/harvest-batches/${encodeURIComponent(id)}`),
  createHarvestBatch: (body: Record<string, unknown>) =>
    cultivationRequest<HarvestBatch>("/api/v1/harvest-batches", { method: "POST", body: JSON.stringify(body) }),

  assessExportRelease: (harvestBatchId: string, targetMarketCode: string) =>
    cultivationRequest<ComplianceAssessment>("/api/v1/export-releases/assess", {
      method: "POST",
      body: JSON.stringify({ harvestBatchId, targetMarketCode }),
    }),
  listExportReleases: (query?: { harvestBatchId?: string; targetMarketCode?: string; status?: ExportReleaseStatus }) =>
    cultivationRequest<ExportRelease[]>(`/api/v1/export-releases${queryString(query)}`),
  getExportRelease: (id: string) =>
    cultivationRequest<ExportRelease>(`/api/v1/export-releases/${encodeURIComponent(id)}`),
  createExportRelease: (body: Record<string, unknown>) =>
    cultivationRequest<ExportRelease>("/api/v1/export-releases", { method: "POST", body: JSON.stringify(body) }),
  submitExportRelease: (id: string, userId: string) =>
    cultivationRequest<ExportRelease>(`/api/v1/export-releases/${encodeURIComponent(id)}/submit`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  approveExportRelease: (id: string, userId: string) =>
    cultivationRequest<ExportRelease>(`/api/v1/export-releases/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  releaseExportRelease: (id: string, userId: string) =>
    cultivationRequest<ExportRelease>(`/api/v1/export-releases/${encodeURIComponent(id)}/release`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  recallExportRelease: (id: string, userId: string, reason: string) =>
    cultivationRequest<ExportRelease>(`/api/v1/export-releases/${encodeURIComponent(id)}/recall`, {
      method: "POST",
      body: JSON.stringify({ userId, reason }),
    }),
  traceability: (id: string) =>
    cultivationRequest<TraceabilitySnapshot>(`/api/v1/export-releases/${encodeURIComponent(id)}/traceability`),
  auditLogs: (query?: { resourceType?: string; resourceId?: string }) =>
    cultivationRequest<AuditLog[]>(`/api/v1/audit-logs${queryString(query)}`),

  dashboard: async (): Promise<CultivationDashboardData> => {
    try {
      const [plans, activities, inputs, residueStandards, labSamples, harvestBatches, exportReleases] = await Promise.all([
        cultivationClient.listPlans(),
        cultivationClient.listActivities(),
        cultivationClient.listAgriculturalInputs(),
        cultivationClient.listResidueStandards(),
        cultivationClient.listLabSamples(),
        cultivationClient.listHarvestBatches(),
        cultivationClient.listExportReleases(),
      ]);
      return { plans, activities, inputs, residueStandards, labSamples, harvestBatches, exportReleases };
    } catch (caught) {
      if (shouldUseMock(caught)) return cultivationMockClient.dashboard();
      throw caught;
    }
  },
};
