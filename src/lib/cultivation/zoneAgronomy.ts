export type FarmZoneGrowthStage = "SEEDLING" | "VEGETATIVE" | "FLOWERING" | "FRUITING" | "PRODUCTIVE" | "RENOVATION";
export type FarmZoneIrrigationMethod = "DRIP" | "SPRINKLER" | "FLOOD" | "MANUAL" | "OTHER";
export type FarmZoneHarvestHistory = {
  id?: string | null;
  seasonName: string;
  harvestYear: number;
  harvestedAt?: string | null;
  yieldValue?: number | null;
  yieldUnit?: "kg" | "tấn" | null;
  qualityNote?: string | null;
  notes?: string | null;
};
export type FarmZoneAgronomy = {
  cropType?: "DURIAN" | "OTHER" | null;
  variety?: string | null;
  plantingDate?: string | null;
  initialTreeCount?: number | null;
  currentTreeCount?: number | null;
  growthStage?: FarmZoneGrowthStage | null;
  seedSource?: string | null;
  plantingDistance?: string | null;
  soilType?: string | null;
  waterSource?: string | null;
  irrigationMethod?: FarmZoneIrrigationMethod | null;
  drainageStatus?: string | null;
  locationDescription?: string | null;
  imageUrls?: string[] | null;
  notes?: string | null;
  harvestHistories?: FarmZoneHarvestHistory[] | null;
};

export type AgronomyFieldKey = Exclude<keyof FarmZoneAgronomy, "harvestHistories">;
export type HarvestForm = Record<keyof FarmZoneHarvestHistory, string>;
export type ZoneAgronomyForm = Record<AgronomyFieldKey, string> & { harvestHistories: HarvestForm[] };
type FieldDefinition = {
  key: AgronomyFieldKey;
  label: string;
  group: string;
  kind?: "date" | "integer" | "multiline";
  maxLength?: number;
  options?: { value: string; label: string }[];
};
export const agronomyFields: FieldDefinition[] = [
  { key: "cropType", label: "Loại cây trồng", group: "Thông tin cây trồng", options: [{ value: "DURIAN", label: "Sầu riêng" }, { value: "OTHER", label: "Cây khác" }] },
  { key: "variety", label: "Giống cây (RI6, Monthong, Dona…)", group: "Thông tin cây trồng", maxLength: 120 },
  { key: "plantingDate", label: "Ngày trồng", group: "Thông tin cây trồng", kind: "date" },
  { key: "initialTreeCount", label: "Số cây ban đầu", group: "Thông tin cây trồng", kind: "integer" },
  { key: "currentTreeCount", label: "Số cây hiện tại", group: "Thông tin cây trồng", kind: "integer" },
  { key: "growthStage", label: "Giai đoạn sinh trưởng", group: "Thông tin cây trồng", options: [
    { value: "SEEDLING", label: "Cây con" }, { value: "VEGETATIVE", label: "Sinh trưởng thân lá" },
    { value: "FLOWERING", label: "Ra hoa" }, { value: "FRUITING", label: "Nuôi trái" },
    { value: "PRODUCTIVE", label: "Đang cho thu hoạch" }, { value: "RENOVATION", label: "Cải tạo" },
  ] },
  { key: "seedSource", label: "Nguồn cung cấp giống", group: "Thông tin cây trồng", maxLength: 240 },
  { key: "plantingDistance", label: "Khoảng cách trồng (ví dụ 8m x 8m)", group: "Thông tin cây trồng", maxLength: 120 },
  { key: "soilType", label: "Loại đất", group: "Đất, nước và vị trí", maxLength: 240 },
  { key: "waterSource", label: "Nguồn nước tưới", group: "Đất, nước và vị trí", maxLength: 240 },
  { key: "irrigationMethod", label: "Phương pháp tưới", group: "Đất, nước và vị trí", options: [
    { value: "DRIP", label: "Tưới nhỏ giọt" }, { value: "SPRINKLER", label: "Tưới phun" },
    { value: "FLOOD", label: "Tưới tràn" }, { value: "MANUAL", label: "Tưới thủ công" }, { value: "OTHER", label: "Khác" },
  ] },
  { key: "drainageStatus", label: "Tình trạng thoát nước", group: "Đất, nước và vị trí", kind: "multiline", maxLength: 1000 },
  { key: "locationDescription", label: "Vị trí khu canh tác", group: "Đất, nước và vị trí", kind: "multiline", maxLength: 1000 },
  { key: "imageUrls", label: "Ảnh khu canh tác (URL https/http, mỗi dòng một ảnh)", group: "Hình ảnh và ghi chú", kind: "multiline" },
  { key: "notes", label: "Ghi chú quản lý", group: "Hình ảnh và ghi chú", kind: "multiline", maxLength: 5000 },
];
export const agronomyGroups = [...new Set(agronomyFields.map(field => field.group))];

export function createZoneAgronomyForm(value?: FarmZoneAgronomy | null): ZoneAgronomyForm {
  const fields = Object.fromEntries(agronomyFields.map(({ key }) => [
    key, key === "imageUrls" ? (value?.imageUrls ?? []).join("\n") : String(value?.[key] ?? ""),
  ])) as Record<AgronomyFieldKey, string>;
  return { ...fields, harvestHistories: (value?.harvestHistories ?? []).map(row => ({
    id: row.id ?? newHarvestForm().id, seasonName: row.seasonName, harvestYear: String(row.harvestYear),
    harvestedAt: row.harvestedAt ?? "", yieldValue: row.yieldValue == null ? "" : String(row.yieldValue),
    yieldUnit: row.yieldUnit ?? "", qualityNote: row.qualityNote ?? "", notes: row.notes ?? "",
  })) };
}

export function newHarvestForm(): HarvestForm {
  return { id: `harvest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, seasonName: "", harvestYear: "", harvestedAt: "", yieldValue: "", yieldUnit: "tấn", qualityNote: "", notes: "" };
}

export function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateValue(value: string, label: string) {
  if (!value.trim()) return null;
  const date = new Date(`${value}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) ||
      date.getFullYear() !== Number(value.slice(0, 4)) || date.getMonth() + 1 !== Number(value.slice(5, 7)) ||
      date.getDate() !== Number(value.slice(8, 10)) || value > todayLocal()) {
    throw new Error(`${label}: nhập ngày hợp lệ (YYYY-MM-DD), không ở tương lai.`);
  }
  return value;
}

function numberValue(value: string, label: string, integer = false) {
  if (!value.trim()) return null;
  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  if (!/^\d+(\.\d+)?$/.test(normalized) || !Number.isFinite(parsed) || parsed < 0 ||
      (integer && (!/^\d+$/.test(normalized) || !Number.isSafeInteger(parsed) || parsed > 2147483647))) {
    throw new Error(`${label}: nhập ${integer ? "số nguyên" : "số"} không âm hợp lệ.`);
  }
  return parsed;
}

export function toZoneAgronomy(form: ZoneAgronomyForm): FarmZoneAgronomy {
  for (const field of agronomyFields) {
    const value = form[field.key].trim();
    if (field.maxLength && value.length > field.maxLength) throw new Error(`${field.label}: tối đa ${field.maxLength} ký tự.`);
    if (field.options && value && !field.options.some(option => option.value === value)) throw new Error(`${field.label} không hợp lệ.`);
  }
  const plantingDate = dateValue(form.plantingDate, "Ngày trồng");
  const initialTreeCount = numberValue(form.initialTreeCount, "Số cây ban đầu", true);
  const currentTreeCount = numberValue(form.currentTreeCount, "Số cây hiện tại", true);
  if (initialTreeCount !== null && currentTreeCount !== null && currentTreeCount > initialTreeCount) throw new Error("Số cây hiện tại không được lớn hơn số cây ban đầu.");
  const imageUrls = form.imageUrls.split(/\r?\n/).map(url => url.trim()).filter(Boolean);
  if (imageUrls.length > 20 || imageUrls.some(url => url.length > 2048 || !/^https?:\/\/[^\s]+$/.test(url))) throw new Error("Tối đa 20 ảnh; mỗi dòng là một URL http/https hợp lệ (tối đa 2048 ký tự).");
  if (form.harvestHistories.length > 100) throw new Error("Tối đa 100 bản ghi thu hoạch.");
  const harvestHistories: FarmZoneHarvestHistory[] = form.harvestHistories.map((row, index) => {
    const title = `Lần thu hoạch ${index + 1}`;
    const harvestYear = numberValue(row.harvestYear, `${title}: năm thu hoạch`, true);
    const harvestedAt = dateValue(row.harvestedAt, `${title}: ngày thu hoạch`);
    if (!row.seasonName.trim() || row.seasonName.trim().length > 160) throw new Error(`${title}: cần tên mùa vụ (tối đa 160 ký tự).`);
    if (harvestYear === null || harvestYear < 1900 || harvestYear > new Date().getFullYear() ||
        (plantingDate && harvestYear < Number(plantingDate.slice(0, 4)))) throw new Error(`${title}: năm thu hoạch không hợp lệ hoặc trước năm trồng.`);
    if (harvestedAt && ((plantingDate && harvestedAt < plantingDate) || Number(harvestedAt.slice(0, 4)) !== harvestYear)) throw new Error(`${title}: ngày thu hoạch phải từ ngày trồng trở đi và đúng năm thu hoạch.`);
    if (row.yieldUnit && row.yieldUnit !== "kg" && row.yieldUnit !== "tấn") throw new Error(`${title}: đơn vị sản lượng phải là kg hoặc tấn.`);
    if (row.qualityNote.length > 1000 || row.notes.length > 2000) throw new Error(`${title}: ghi chú chất lượng tối đa 1000, ghi chú mùa vụ tối đa 2000 ký tự.`);
    return { id: row.id, seasonName: row.seasonName.trim(), harvestYear, harvestedAt,
      yieldValue: numberValue(row.yieldValue, `${title}: sản lượng`), yieldUnit: row.yieldUnit as "kg" | "tấn" || null,
      qualityNote: row.qualityNote.trim() || null, notes: row.notes.trim() || null };
  });
  return {
    cropType: form.cropType as FarmZoneAgronomy["cropType"] || null, variety: form.variety.trim() || null,
    plantingDate, initialTreeCount, currentTreeCount, growthStage: form.growthStage as FarmZoneGrowthStage || null,
    seedSource: form.seedSource.trim() || null, plantingDistance: form.plantingDistance.trim() || null,
    soilType: form.soilType.trim() || null, waterSource: form.waterSource.trim() || null,
    irrigationMethod: form.irrigationMethod as FarmZoneIrrigationMethod || null,
    drainageStatus: form.drainageStatus.trim() || null, locationDescription: form.locationDescription.trim() || null,
    imageUrls, notes: form.notes.trim() || null, harvestHistories,
  };
}

export function treeAgeLabel(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  const today = new Date();
  let months = (today.getFullYear() - date.getFullYear()) * 12 + today.getMonth() - date.getMonth();
  if (today.getDate() < date.getDate()) months -= 1;
  if (months < 0) return "Ngày trồng ở tương lai";
  return months < 12 ? `${months} tháng` : `${Math.floor(months / 12)} năm ${months % 12} tháng`;
}

export function agronomyFacts(value?: FarmZoneAgronomy | null) {
  return agronomyFields.filter(field => field.key !== "imageUrls").map(field => {
    const raw = value?.[field.key];
    return { label: field.label, value: raw == null || raw === "" ? "Chưa cập nhật" :
      field.options?.find(option => option.value === raw)?.label ?? String(raw) };
  });
}

