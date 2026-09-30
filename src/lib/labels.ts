export const diseaseLabels: Record<string, string> = {
  Healthy_Leaf: "Lá khỏe",
  HEALTHY_LEAF: "Lá khỏe",
  Algal_Leaf_Spot: "Đốm tảo",
  ALGAL_LEAF_SPOT: "Đốm tảo",
  Leaf_Blight: "Cháy lá",
  LEAF_BLIGHT: "Cháy lá",
  Phomopsis_Leaf_Spot: "Đốm lá Phomopsis",
  PHOMOPSIS_LEAF_SPOT: "Đốm lá Phomopsis",
  Allocaridara_Attacked: "Sâu chích hút Allocaridara",
  ALLOCARIDARA_ATTACK: "Sâu chích hút Allocaridara",
};

export type DiseaseCategory = "HEALTHY" | "PEST" | "DISEASE";

const PEST_CODES = new Set([
  "allocaridara_attack",
  "allocaridara_attacked",
]);

const HEALTHY_CODES = new Set([
  "healthy_leaf",
  "healthy",
]);

export function getDiseaseCategory(code: string): DiseaseCategory {
  const normalized = code.trim().toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
  if (HEALTHY_CODES.has(normalized)) return "HEALTHY";
  if (PEST_CODES.has(normalized)) return "PEST";
  return "DISEASE";
}

export function getDiseaseAlertMessage(code: string): string {
  const cat = getDiseaseCategory(code);
  if (cat === "HEALTHY") return "Chưa phát hiện dấu hiệu bất thường trên lá.";
  if (cat === "PEST") return "⚠️ Phát hiện dấu hiệu sâu/bọ gây hại trên lá. Vui lòng kiểm tra cây.";
  return "Phát hiện dấu hiệu bệnh trên lá.";
}
