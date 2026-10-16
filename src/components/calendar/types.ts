export type CultivationTaskType =
  | "IRRIGATION"
  | "FERTILIZATION"
  | "TREATMENT"
  | "SCOUTING"
  | "PRUNING"
  | "MAINTENANCE";

export type CultivationTaskStatus = "PLANNED" | "COMPLETED";

export interface IotEvidence {
  sensor: string;
  metric: string;
  before: string;
  after: string;
  delta: string;
  receivedAt: string;
}

export interface CultivationTask {
  id: string;
  title: string;
  type: CultivationTaskType;
  zoneId: string;
  zoneName: string;
  crop: string;
  scheduledDate: string;
  startTime: string;
  durationMinutes: number;
  assignee: string;
  status: CultivationTaskStatus;
  materialName: string;
  materialQuantity: number;
  materialUnit: string;
  materialUnitCost: number;
  notes: string;
  confirmedByIot: boolean;
  iotEvidence: IotEvidence | null;
}

export interface TaskFormState {
  title: string;
  type: CultivationTaskType;
  zoneId: string;
  crop: string;
  scheduledDate: string;
  startTime: string;
  durationMinutes: string;
  assignee: string;
  materialName: string;
  materialQuantity: string;
  materialUnit: string;
  materialUnitCost: string;
  notes: string;
}

export type TaskFilter = "ALL" | "PLANNED" | "COMPLETED" | "IOT";
