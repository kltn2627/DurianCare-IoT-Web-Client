export type ActivityType =
  | "IRRIGATION"
  | "FERTILIZATION"
  | "FERTIGATION"
  | "BIOLOGICAL_TREATMENT"
  | "CHEMICAL_TREATMENT"
  | "PEST_MONITORING"
  | "DISEASE_MONITORING"
  | "PRUNING"
  | "ORCHARD_SANITATION"
  | "WEED_CONTROL"
  | "SOIL_IMPROVEMENT"
  | "POLLINATION"
  | "FRUIT_BAGGING"
  | "SOIL_SAMPLING"
  | "WATER_SAMPLING"
  | "LEAF_SAMPLING"
  | "FRUIT_SAMPLING"
  | "HARVEST"
  | "OTHER";

export type ActivityStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SKIPPED"
  | "CANCELLED"
  | "OVERDUE";

export type BiologicalLevel =
  | "FULLY_BIOLOGICAL"
  | "BIOLOGICAL"
  | "LOW_RISK"
  | "CHEMICAL"
  | "RESTRICTED_CHEMICAL"
  | "PROHIBITED"
  | "UNKNOWN";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";

export type ExportReleaseStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "WAITING_FOR_LAB_RESULT"
  | "BLOCKED"
  | "APPROVED"
  | "RELEASED"
  | "RECALLED";

export type InputCategory =
  | "ORGANIC_FERTILIZER"
  | "MICROBIAL_FERTILIZER"
  | "CHEMICAL_FERTILIZER"
  | "SOIL_CONDITIONER"
  | "BIOLOGICAL_CONTROL"
  | "BOTANICAL_PRODUCT"
  | "BENEFICIAL_ORGANISM"
  | "PHEROMONE"
  | "TRAP"
  | "MINERAL_OIL"
  | "CHEMICAL_PESTICIDE"
  | "OTHER";

export type InputStatus = "DRAFT" | "VERIFIED" | "INACTIVE" | "PROHIBITED";
export type LabResultStatus =
  | "PASS"
  | "FAIL"
  | "NOT_DETECTED"
  | "BELOW_LIMIT_OF_QUANTIFICATION"
  | "NO_STANDARD_FOUND"
  | "PENDING_REVIEW";
export type LabSampleStatus = "COLLECTED" | "SENT" | "RESULT_RECORDED" | "CANCELLED";
export type HarvestBatchStatus = "DRAFT" | "BLOCKED" | "APPROVED" | "HARVESTED" | "CANCELLED";
export type PlanStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type CultivationZoneAreaUnit = "SQUARE_METER" | "HECTARE";
export type CultivationZoneCropType = "DURIAN" | "OTHER";
export type CultivationZoneGrowthStage =
  | "SEEDLING"
  | "VEGETATIVE"
  | "FLOWERING"
  | "FRUITING"
  | "PRODUCTIVE"
  | "RENOVATION";
export type CultivationZoneIrrigationMethod =
  | "DRIP"
  | "SPRINKLER"
  | "FLOOD"
  | "MANUAL"
  | "OTHER";
export type CultivationZoneStatus =
  | "PREPARING"
  | "ACTIVE"
  | "PAUSED"
  | "RENOVATING"
  | "CLOSED";
export type SourceType =
  | "CODEX"
  | "VIETNAM"
  | "EU"
  | "CHINA"
  | "JAPAN"
  | "SOUTH_KOREA"
  | "CUSTOMER_SPECIFICATION"
  | "OTHER";

export interface ActiveIngredientSnapshot {
  code: string;
  name: string;
  concentration?: number | null;
  concentrationUnit?: string | null;
}

export interface AgriculturalInputSnapshot {
  code: string;
  productName: string;
  tradeName?: string | null;
  manufacturer?: string | null;
  category: InputCategory;
  biologicalLevel: BiologicalLevel;
  preHarvestIntervalDays?: number | null;
  activeIngredients: ActiveIngredientSnapshot[];
  allowedMarketCodes: string[];
  prohibitedMarketCodes: string[];
}

export interface CultivationPlanTemplate {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  durianVarietyId?: string | null;
  growthStage?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CultivationPlan {
  id: string;
  farmId: string;
  plotId: string;
  cultivationSeasonId: string;
  templateId?: string | null;
  name: string;
  startDate: string;
  expectedHarvestDate?: string | null;
  targetMarketCodes: string[];
  status: PlanStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FarmOption {
  id: string;
  name?: string | null;
  code?: string | null;
  location?: string | null;
}

/** Canonical persisted zone model returned inside FarmCatalogDto.FarmResponse.zones. */
export type FarmZoneStatus = "ACTIVE" | "INACTIVE" | "QUARANTINED" | "ARCHIVED";

export interface FarmZoneRequest {
  areaSquareMeters?: number | null;
  boundaryGeoJson?: Record<string, unknown> | null;
  code?: string | null;
  description?: string | null;
  name: string;
}

export interface FarmZoneCatalog extends FarmZoneRequest {
  createdAt?: string | null;
  id: string;
  status: FarmZoneStatus;
  updatedAt?: string | null;
}

export interface FarmCatalog extends FarmOption {
  address?: string | null;
  areaHectares?: number | null;
  createdAt?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ownerUserId: string;
  province?: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  updatedAt?: string | null;
  zones: FarmZoneCatalog[];
}

export interface CanonicalCultivationZone extends FarmZoneCatalog {
  farmId: string;
  farmName: string;
}

export interface CultivationZoneRequest {
  farmId: string;
  name: string;
  areaValue: number;
  areaUnit: CultivationZoneAreaUnit;
  cropType: CultivationZoneCropType;
  variety: string;
  plantingDate: string;
  initialTreeCount?: number | null;
  currentTreeCount: number;
  previousHarvestCount: number;
  growthStage?: CultivationZoneGrowthStage | null;
  seedSource?: string | null;
  plantingDistance?: string | null;
  soilType?: string | null;
  waterSource?: string | null;
  irrigationMethod?: CultivationZoneIrrigationMethod | null;
  drainageStatus?: string | null;
  status: CultivationZoneStatus;
  locationDescription?: string | null;
  imageUrls?: string[];
  notes: string;
  harvestHistories?: HarvestSeasonHistory[];
}

export interface CultivationZone extends CultivationZoneRequest {
  id: string;
  code?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface HarvestSeasonHistory {
  id?: string;
  seasonName: string;
  harvestYear: number;
  harvestedAt?: string | null;
  yieldValue?: number | null;
  yieldUnit?: string | null;
  qualityNote?: string | null;
  notes?: string | null;
}

export interface CultivationActivity {
  id: string;
  cultivationPlanId: string;
  cultivationSeasonId: string;
  farmId: string;
  plotId: string;
  treeIds: string[];
  activityType: ActivityType;
  title: string;
  description?: string | null;
  scheduledStartAt: string;
  scheduledEndAt?: string | null;
  recurrenceRule?: string | null;
  priority?: string | null;
  status: ActivityStatus;
  assignedUserIds: string[];
  approvalRequired: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  version?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityExecution {
  id: string;
  cultivationActivityId: string;
  startedAt: string;
  completedAt: string;
  executedBy: string;
  supervisedBy?: string | null;
  actualTreeCount?: number | null;
  actualArea?: number | null;
  areaUnit?: string | null;
  weatherSnapshot?: Record<string, unknown> | null;
  applicationMethod?: string | null;
  equipment?: string | null;
  notes?: string | null;
  resultObservation?: string | null;
  evidenceFiles: string[];
  locked: boolean;
  createdAt: string;
}

export interface ActivityInputUsage {
  id: string;
  activityExecutionId: string;
  agriculturalInputId: string;
  agriculturalInputSnapshot?: AgriculturalInputSnapshot | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  quantityUsed: number;
  quantityUnit: string;
  waterVolume?: number | null;
  waterVolumeUnit?: string | null;
  concentration?: number | null;
  concentrationUnit?: string | null;
  treatedArea?: number | null;
  areaUnit?: string | null;
  activeIngredientSnapshots: ActiveIngredientSnapshot[];
  calculatedSafeHarvestDate?: string | null;
  createdAt: string;
}

export interface AgriculturalInput {
  id: string;
  code: string;
  productName: string;
  tradeName?: string | null;
  manufacturer?: string | null;
  registrationNumber?: string | null;
  category: InputCategory;
  biologicalLevel: BiologicalLevel;
  formulation?: string | null;
  unit?: string | null;
  activeIngredients: ActiveIngredientSnapshot[];
  beneficialOrganisms: string[];
  recommendedDose?: string | null;
  maximumDose?: string | null;
  preHarvestIntervalDays?: number | null;
  reEntryIntervalHours?: number | null;
  targetPests: string[];
  applicableCrops: string[];
  allowedMarketCodes: string[];
  prohibitedMarketCodes: string[];
  labelDocumentUrl?: string | null;
  certificateDocumentUrls: string[];
  status: InputStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResidueStandard {
  id: string;
  marketCode: string;
  commodityCode: string;
  commodityName: string;
  activeIngredientCode: string;
  activeIngredientName: string;
  mrlValue: number;
  unit: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  sourceType: SourceType;
  sourceReference?: string | null;
  version?: number | null;
  verified: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LabSample {
  id: string;
  cultivationSeasonId: string;
  harvestBatchId?: string | null;
  sampleCode: string;
  sampleType: string;
  sampledAt: string;
  sampledBy: string;
  samplingLocation?: string | null;
  laboratoryName: string;
  laboratoryAccreditation?: string | null;
  status: LabSampleStatus;
  attachments: string[];
  createdAt: string;
}

export interface LabResidueResult {
  id: string;
  labSampleId: string;
  activeIngredientCode: string;
  activeIngredientName: string;
  measuredValue?: number | null;
  unit: string;
  detectionLimit?: number | null;
  quantificationLimit?: number | null;
  applicableMrl?: number | null;
  applicableMrlSource?: string | null;
  resultStatus: LabResultStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface HarvestBatch {
  id: string;
  batchCode: string;
  cultivationSeasonId: string;
  farmId: string;
  plotId: string;
  harvestedAt: string;
  quantity: number;
  quantityUnit: string;
  expectedDestinationMarket: string;
  latestSafeHarvestDate?: string | null;
  chemicalRiskLevel: RiskLevel;
  status: HarvestBatchStatus;
  createdBy: string;
  createdAt: string;
}

export interface ComplianceAssessment {
  id: string;
  cultivationSeasonId: string;
  harvestBatchId?: string | null;
  targetMarketCode: string;
  riskScore: number;
  riskLevel: RiskLevel;
  blockingReasons: string[];
  warnings: string[];
  earliestSafeHarvestDate?: string | null;
  requiresLabTest: boolean;
  eligibleForHarvest: boolean;
  eligibleForExportRelease: boolean;
  assessmentDetails: Record<string, unknown>;
  assessedAt: string;
  rulesVersion: string;
}

export interface CareHistoryResponse {
  activities: CultivationActivity[];
  executions: ActivityExecution[];
  inputUsages: ActivityInputUsage[];
}

export interface ExportRelease {
  id: string;
  releaseCode: string;
  harvestBatchId: string;
  targetMarketCode: string;
  traceabilitySnapshot: Record<string, unknown>;
  complianceAssessmentSnapshot: Record<string, unknown>;
  status: ExportReleaseStatus;
  submittedBy?: string | null;
  submittedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  releasedAt?: string | null;
  createdAt: string;
}

export interface TraceabilitySnapshot {
  releaseId: string;
  snapshot: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorId?: string | null;
  reason?: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface ApiError {
  status?: number;
  error?: string;
  message: string;
}

export interface SafeHarvestDateResponse {
  cultivationSeasonId?: string;
  earliestSafeHarvestDate?: string | null;
}

export type CultivationDashboardData = {
  plans: CultivationPlan[];
  activities: CultivationActivity[];
  inputs: AgriculturalInput[];
  residueStandards: ResidueStandard[];
  labSamples: LabSample[];
  harvestBatches: HarvestBatch[];
  exportReleases: ExportRelease[];
};
