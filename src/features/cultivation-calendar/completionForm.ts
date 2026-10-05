import type { ActivityType, AgriculturalInput } from "@/lib/cultivation/types";

export type UsageDraft = { agriculturalInputId: string; quantityUsed: string; quantityUnit: string; batchNumber: string };
export type CompletionDraft = {
  startedAt: string;
  completedAt: string;
  actualArea: string;
  areaUnit: string;
  notes: string;
  inputUsages: UsageDraft[];
};

export const requiresRecordedInput = (type: ActivityType) =>
  ["CHEMICAL_TREATMENT", "BIOLOGICAL_TREATMENT", "FERTILIZATION", "FERTIGATION"].includes(type);

export const emptyUsage = (): UsageDraft => ({ agriculturalInputId: "", quantityUsed: "", quantityUnit: "", batchNumber: "" });

export function buildCompletionPayload(type: ActivityType, draft: CompletionDraft, catalog: AgriculturalInput[], actorId: string) {
  if (!actorId) throw new Error("Không xác định được người thực hiện.");
  const started = new Date(draft.startedAt);
  const completed = new Date(draft.completedAt);
  if (!Number.isFinite(started.getTime()) || !Number.isFinite(completed.getTime()) || completed < started) {
    throw new Error("Thời gian hoàn thành phải sau thời gian bắt đầu.");
  }
  if (requiresRecordedInput(type) && draft.inputUsages.length === 0) {
    throw new Error("Loại công việc này cần ít nhất một vật tư đã sử dụng.");
  }
  const inputUsages = draft.inputUsages.map((usage) => {
    const input = catalog.find((item) => item.id === usage.agriculturalInputId && item.status === "VERIFIED");
    const quantity = Number(usage.quantityUsed);
    if (!input || !Number.isFinite(quantity) || quantity <= 0 || !usage.quantityUnit.trim()) {
      throw new Error("Chọn vật tư đã xác minh, nhập số lượng dương và đơn vị cho từng dòng.");
    }
    return {
      agriculturalInputId: input.id,
      quantityUsed: quantity,
      quantityUnit: usage.quantityUnit.trim(),
      batchNumber: usage.batchNumber.trim() || undefined,
    };
  });
  const actualArea = draft.actualArea.trim() ? Number(draft.actualArea) : undefined;
  if (actualArea !== undefined && (!Number.isFinite(actualArea) || actualArea < 0)) {
    throw new Error("Diện tích thực hiện phải là số không âm.");
  }
  return {
    startedAt: started.toISOString(), completedAt: completed.toISOString(), executedBy: actorId,
    actualArea, areaUnit: actualArea === undefined ? undefined : draft.areaUnit.trim() || undefined,
    notes: draft.notes.trim() || undefined, inputUsages,
    evidenceFiles: [], weatherSnapshot: {},
  };
}
