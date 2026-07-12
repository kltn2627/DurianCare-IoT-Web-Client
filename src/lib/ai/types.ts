export type PredictionSource = "MOBILE" | "WEB" | "IOT_CAMERA";

export interface BoundingBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface StoredImageInfo {
  objectKey: string;
  url: string;
}

export interface ReferenceSourceSummary {
  sourceCode: string;
  sourceName: string;
  sourceType: string;
  publicationTitle?: string | null;
  publisher?: string | null;
  publicationYear?: number | null;
  url?: string | null;
  confidenceLevel: number;
  notes?: string | null;
}

export interface KnowledgeLineItem {
  order: number;
  text: string;
  source?: ReferenceSourceSummary | null;
  confidenceLevel: number;
}

export interface ActiveIngredientSummary {
  ingredientName: string;
  chemicalGroup?: string | null;
  source?: ReferenceSourceSummary | null;
  confidenceLevel: number;
}

export interface HarvestIntervalSummary {
  marketCode: string;
  marketName: string;
  phiDays?: number | null;
  notes?: string | null;
  source?: ReferenceSourceSummary | null;
  confidenceLevel: number;
}

export interface RecommendedChemicalSummary {
  recommendationOrder: number;
  productName: string;
  activeIngredientSummary: string;
  usageNote?: string | null;
  source?: ReferenceSourceSummary | null;
  confidenceLevel: number;
  activeIngredients: ActiveIngredientSummary[];
  harvestIntervals: HarvestIntervalSummary[];
}

export interface ChemicalTreatmentSummary {
  treatmentOrder: number;
  treatmentText: string;
  safeUsageNote: string;
  source?: ReferenceSourceSummary | null;
  confidenceLevel: number;
  recommendedProducts: RecommendedChemicalSummary[];
}

export interface ExportRequirementSummary {
  marketCode: string;
  marketName: string;
  requirementOrder: number;
  requirementText: string;
  warningText?: string | null;
  source?: ReferenceSourceSummary | null;
  confidenceLevel: number;
}

export interface DiseaseRecommendation {
  diseaseCode: string;
  vietnameseName: string;
  englishName: string;
  scientificName?: string | null;
  issueType: string;
  severity: string;
  diseaseSummary: string;
  favorableConditions?: string | null;
  confidenceLevel: number;
  symptoms: KnowledgeLineItem[];
  causes: KnowledgeLineItem[];
  prevention: KnowledgeLineItem[];
  biologicalTreatments: KnowledgeLineItem[];
  organicTreatments: KnowledgeLineItem[];
  chemicalTreatments: ChemicalTreatmentSummary[];
  exportConsiderations: ExportRequirementSummary[];
  references: ReferenceSourceSummary[];
}

export interface DecisionSupport {
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  immediateActions: string[];
  biologicalPlan: string[];
  organicPlan: string[];
  chemicalPlan: string[];
  monitoringPlan: string[];
  exportReadiness: string[];
  farmerNotes: string[];
}

export interface PredictionData {
  predictedDisease: string;
  confidence: number;
  confidenceLabel: string;
  source: PredictionSource;
  deviceId?: string | null;
  usedDetectionCrop: boolean;
  boundingBox?: BoundingBox | null;
  image?: StoredImageInfo | null;
  recommendation?: DiseaseRecommendation | null;
  decisionSupport?: DecisionSupport | null;
}

export interface PredictionResponse {
  status: "success";
  data: PredictionData;
}

export interface PredictionErrorBody {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
}
