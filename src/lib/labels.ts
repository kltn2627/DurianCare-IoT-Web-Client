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

export type DiseaseCategory = "HEALTHY" | "PEST" | "DISEASE" | "LOW_CONFIDENCE" | "INVALID_IMAGE";

const PEST_CODES = new Set([
  "allocaridara_attack",
  "allocaridara_attacked",
]);

const HEALTHY_CODES = new Set([
  "healthy_leaf",
  "healthy",
]);

export function getDiseaseCategory(code: string, confidence?: number | null): DiseaseCategory {
  const normalized = code.trim().toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
  if (!code || normalized === "invalid_image") return "INVALID_IMAGE";
  if (normalized === "low_confidence") return "LOW_CONFIDENCE";
  if (HEALTHY_CODES.has(normalized)) return "HEALTHY";
  if (PEST_CODES.has(normalized)) return "PEST";
  // Confidence threshold: < 20% = INVALID_IMAGE, < 50% = LOW_CONFIDENCE
  if (confidence != null) {
    const pct = confidence <= 1 ? confidence * 100 : confidence;
    if (pct < 20) return "INVALID_IMAGE";
    if (pct < 50) return "LOW_CONFIDENCE";
  }
  return "DISEASE";
}

export function getDiseaseAlertMessage(code: string, confidence?: number | null): string {
  const cat = getDiseaseCategory(code, confidence);
  if (cat === "HEALTHY") return "Chưa phát hiện dấu hiệu bất thường trên lá.";
  if (cat === "PEST") return "⚠️ Phát hiện dấu hiệu sâu/bọ gây hại trên lá. Vui lòng kiểm tra cây.";
  if (cat === "LOW_CONFIDENCE") return "Độ tin cậy thấp — vui lòng chụp lại ảnh lá rõ hơn để có kết quả chính xác.";
  if (cat === "INVALID_IMAGE") return "Ảnh không hợp lệ — vui lòng chụp đúng lá cây sầu riêng, đủ sáng và rõ nét.";
  return "Phát hiện dấu hiệu bệnh trên lá.";
}

export const categoryLabels: Record<DiseaseCategory, string> = {
  HEALTHY: "Khỏe mạnh",
  DISEASE: "Bệnh",
  PEST: "Sâu/Bọ",
  LOW_CONFIDENCE: "Thấp tin cậy",
  INVALID_IMAGE: "Ảnh không hợp lệ",
};

export const categoryColors: Record<DiseaseCategory, { bg: string; text: string; dot: string }> = {
  HEALTHY:        { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
  DISEASE:        { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
  PEST:           { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
  LOW_CONFIDENCE: { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af" },
  INVALID_IMAGE:  { bg: "#f3f4f6", text: "#374151", dot: "#6b7280" },
};
