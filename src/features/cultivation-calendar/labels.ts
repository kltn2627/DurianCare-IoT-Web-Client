import type {
  ActivityStatus,
  ActivityType,
  BiologicalLevel,
  ExportReleaseStatus,
  LabResultStatus,
  RiskLevel,
} from "@/lib/cultivation/types";

export const activityTypeLabels: Record<ActivityType, string> = {
  IRRIGATION: "Tưới nước",
  FERTILIZATION: "Bón phân",
  FERTIGATION: "Châm phân",
  BIOLOGICAL_TREATMENT: "Phun sinh học",
  CHEMICAL_TREATMENT: "Phun hóa chất",
  PEST_MONITORING: "Kiểm tra sâu hại",
  DISEASE_MONITORING: "Kiểm tra bệnh",
  PRUNING: "Cắt tỉa",
  ORCHARD_SANITATION: "Vệ sinh vườn",
  WEED_CONTROL: "Kiểm soát cỏ",
  SOIL_IMPROVEMENT: "Cải tạo đất",
  POLLINATION: "Thụ phấn",
  FRUIT_BAGGING: "Bao trái",
  SOIL_SAMPLING: "Lấy mẫu đất",
  WATER_SAMPLING: "Lấy mẫu nước",
  LEAF_SAMPLING: "Lấy mẫu lá",
  FRUIT_SAMPLING: "Lấy mẫu trái",
  HARVEST: "Thu hoạch",
  OTHER: "Khác",
};

export const activityStatusLabels: Record<ActivityStatus, string> = {
  DRAFT: "Nháp",
  SCHEDULED: "Đã lên lịch",
  PENDING_APPROVAL: "Chờ phê duyệt",
  APPROVED: "Đã duyệt",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Hoàn thành",
  SKIPPED: "Hoãn",
  CANCELLED: "Hủy",
  OVERDUE: "Quá hạn",
};

export const biologicalLevelLabels: Record<BiologicalLevel, string> = {
  FULLY_BIOLOGICAL: "Sinh học hoàn toàn",
  BIOLOGICAL: "Sinh học",
  LOW_RISK: "Rủi ro thấp",
  CHEMICAL: "Hóa chất",
  RESTRICTED_CHEMICAL: "Hóa chất hạn chế",
  PROHIBITED: "Bị cấm",
  UNKNOWN: "Chưa rõ",
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Nghiêm trọng",
  UNKNOWN: "Chưa xác định",
};

export const exportStatusLabels: Record<ExportReleaseStatus, string> = {
  DRAFT: "Nháp",
  UNDER_REVIEW: "Đang duyệt",
  WAITING_FOR_LAB_RESULT: "Chờ xét nghiệm",
  BLOCKED: "Bị chặn",
  APPROVED: "Đã duyệt",
  RELEASED: "Đã phát hành",
  RECALLED: "Đã thu hồi",
};

export const labResultLabels: Record<LabResultStatus, string> = {
  PASS: "Đạt",
  FAIL: "Không đạt",
  NOT_DETECTED: "Không phát hiện",
  BELOW_LIMIT_OF_QUANTIFICATION: "Dưới LOQ",
  NO_STANDARD_FOUND: "Chưa có giới hạn đối chiếu",
  PENDING_REVIEW: "Chờ xác minh",
};

export function badgeClass(kind: ActivityStatus | BiologicalLevel | RiskLevel | ExportReleaseStatus | LabResultStatus) {
  if (["FAIL", "CRITICAL", "PROHIBITED", "BLOCKED", "RECALLED", "CANCELLED", "OVERDUE"].includes(kind)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (["HIGH", "CHEMICAL", "RESTRICTED_CHEMICAL", "PENDING_APPROVAL", "WAITING_FOR_LAB_RESULT", "PENDING_REVIEW"].includes(kind)) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (["PASS", "LOW", "BIOLOGICAL", "FULLY_BIOLOGICAL", "APPROVED", "RELEASED", "COMPLETED"].includes(kind)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-neutral-200 bg-neutral-50 text-neutral-700";
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDate(value?: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
