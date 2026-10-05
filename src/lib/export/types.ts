export type TargetMarket = "CHINA" | "EU" | "US" | "JAPAN" | "DOMESTIC";
export type BatchStatus  = "PLANNED" | "GROWING" | "HARVESTING" | "EVALUATING" | "EXPORTED";
export type RiskSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type RecommendationPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ChemicalApplication {
  chemical_id:    string;
  applied_at:     string;   // ISO date
  dose_kg_per_ha: number;
}

export interface ChemicalRisk {
  chemical_id:     string;
  name:            string;
  applied_at:      string;
  days_since_app:  number;
  phi_days:        number;
  phi_remaining:   number;
  estimated_ppm:   number;
  mrl_ppm:         number | null;
  severity:        RiskSeverity;
  message:         string;
}

export interface Recommendation {
  priority: RecommendationPriority;
  text:     string;
}

export interface CriterionScore {
  key:     string;
  label:   string;
  score:   number;
  weight:  number;
}

export interface ExportAssessment {
  id:                 string;
  device_id:          string;
  target_market:      TargetMarket;
  market_label:       string;
  assessed_at:        string;
  overall_score:      number;
  residue_score:      number;
  env_score:          number;
  disease_score:      number;
  phi_score:          number;
  soil_score:         number;
  days_until_harvest: number;
  risk_summary:       ChemicalRisk[];
  recommendations:    Recommendation[];
  criteria:           CriterionScore[];
}

export interface AssessmentHistoryItem {
  id:             string;
  device_id:      string;
  target_market:  TargetMarket;
  market_label:   string;
  overall_score:  number;
  assessed_at:    string;
}

export interface Chemical {
  id:            string;
  name:          string;
  vietnamese_name?: string;
  phiDays:       number;
  halfLifeDays:  number;
}

export interface Market {
  id:    TargetMarket;
  label: string;
}

export interface FarmingBatch {
  id:                    string;
  batch_code:            string;
  device_id:             string;
  cam_device_id:         string | null;
  variety:               string | null;
  farm_name:             string | null;
  start_date:            string;
  harvest_date:          string | null;
  target_market:         TargetMarket;
  notes:                 string | null;
  created_at:            string;
  chemical_applications: ChemicalApplication[];
  status:                BatchStatus;
  traceability_code:     string | null;
  export_score:          number | null;
  finalized_at:          string | null;
}

export interface FinalizeResult {
  id:                string;
  batch_code:        string;
  status:            BatchStatus;
  traceability_code: string;
  export_score:      number | null;
  finalized_at:      string;
  traceability_url:  string;
}

export interface PublicTraceChemicalLog {
  chemical_id:    string;
  applied_at:     string;
  dose_kg_per_ha: number;
  stage:          string | null;
}

export interface PublicTraceData {
  traceability_code: string;
  farm: {
    name:          string;
    variety:       string;
    target_market: TargetMarket;
    batch_code:    string;
    start_date:    string;
    harvest_date:  string | null;
    finalized_at:  string | null;
  };
  export_score: number | null;
  certification: {
    status:    "PASS";
    standards: string[];
  };
  chemical_log: PublicTraceChemicalLog[];
  assessment_summary: {
    overall_score: number;
    residue_score: number;
    env_score:     number;
    disease_score: number;
    assessed_at:   string;
    risk_summary:  ChemicalRisk[];
  } | null;
  env_averages: {
    avg_temperature:  number | null;
    avg_humidity:     number | null;
    avg_soil_moisture: number | null;
    reading_count:    number;
  } | null;
}
