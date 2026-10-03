export type TreeHealthStatus = "HEALTHY" | "DISEASED" | "TREATING" | "SUSPECTED" | "RECOVERED";
export type TreeStatus = "ACTIVE" | "REMOVED" | "REPLANTED";
export type ZoneStatus = "ACTIVE" | "INACTIVE" | "PREPARING";

export interface FarmSummary {
  id: string;
  name: string;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  areaHectares?: number | null;
  status?: string | null;
  zoneCount: number;
  createdAt: string;
}

export interface ZoneSummary {
  id: string;
  name: string;
  code?: string | null;
  areaSquareMeters?: number | null;
  status?: string | null;
  treeCount: number;
  rowCount?: number | null;
  treesPerRow?: number | null;
}

export interface CreateFarmRequest {
  name: string;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  areaHectares?: number | null;
}

export interface CreateZoneRequest {
  name: string;
  code?: string | null;
  areaSquareMeters?: number | null;
  description?: string | null;
  rowCount?: number | null;
  treesPerRow?: number | null;
}

export interface GenerateTreesRequest {
  rows: number;
  treesPerRow: number;
  variety?: string | null;
  plantedDate?: string | null;
  notes?: string | null;
}

export interface GenerateTreesResult {
  zoneId: string;
  generated: number;
  skipped: number;
  treeCodePrefix: string;
}

export interface ZoneDetail extends ZoneSummary {
  farmId: string;
  boundaryGeoJson?: Record<string, unknown> | null;
  description?: string | null;
  activeTreeCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  rowCount?: number | null;
  treesPerRow?: number | null;
}

export interface TreeSummary {
  id: string;
  treeCode: string;
  nickname?: string | null;
  variety?: string | null;
  positionX?: number | null;
  positionY?: number | null;
  healthStatus?: TreeHealthStatus | null;
  status?: TreeStatus | null;
  latestDiagnosisAt?: string | null;
  latestDiseaseCode?: string | null;
  diagnosisCount: number;
}

export interface TreeDetail {
  id: string;
  farmId: string;
  farmZoneId: string;
  speciesId?: string | null;
  treeCode: string;
  nickname?: string | null;
  variety?: string | null;
  plantedDate?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  positionX?: number | null;
  positionY?: number | null;
  healthStatus?: TreeHealthStatus | null;
  status?: TreeStatus | null;
  notes?: string | null;
  diagnosisCount: number;
  latestDiagnosisAt?: string | null;
  latestDiseaseCode?: string | null;
  latestConfidence?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTreeRequest {
  treeCode?: string | null;
  nickname?: string | null;
  variety?: string | null;
  speciesId?: string | null;
  plantedDate?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  positionX?: number | null;
  positionY?: number | null;
  notes?: string | null;
}

export interface UpdateTreeRequest {
  nickname?: string | null;
  variety?: string | null;
  speciesId?: string | null;
  plantedDate?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  positionX?: number | null;
  positionY?: number | null;
  notes?: string | null;
}

export interface SaveDiagnosisRequest {
  imageUrl: string;
  diseaseCode: string;
  diseaseName?: string | null;
  confidence?: number | null;
  boundingBox?: Record<string, unknown> | null;
  source?: string | null;
}

export interface TreeDiagnosis {
  id: string;
  treeId: string;
  treeCode: string;
  imageUrl: string;
  diseaseCode: string;
  diseaseName?: string | null;
  confidence?: number | null;
  boundingBox?: Record<string, unknown> | null;
  source?: string | null;
  impliedHealthStatus?: string | null;
  diagnosedAt: string;
  createdAt: string;
}

export interface ZoneSafetySummary {
  zoneId: string;
  zoneName: string;
  totalTrees: number;
  assessedTrees: number;
  safeTrees: number;
  attentionTrees: number;
  notAssessedTrees: number;
  safetyRate?: number | null;
  safetyRateLabel: string;
  calculatedAt: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type CarePlanStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface TreeCarePlan {
  id: string;
  treeId: string;
  farmId: string;
  diagnosisId?: string | null;
  diseaseCode: string;
  knowledgeArticleId?: string | null;
  treatment?: string | null;
  startDate: string;
  followUpDate?: string | null;
  status: CarePlanStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCarePlanRequest {
  diagnosisId?: string | null;
  diseaseCode: string;
  knowledgeArticleId?: string | null;
  treatment?: string | null;
  startDate: string;
  followUpDate?: string | null;
}
