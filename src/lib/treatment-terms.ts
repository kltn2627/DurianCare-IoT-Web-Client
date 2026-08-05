export function formatSafetyInterval(
  value?: number | string | null,
  options?: {
    mode?: "phi" | "rei" | "isolation";
  },
) {
  const mode = options?.mode ?? "phi";
  const normalized = normalizeDays(value);

  if (normalized == null || normalized <= 0) {
    if (mode === "rei") return "Thời gian an toàn sau phun";
    if (mode === "isolation") return "Không yêu cầu cách ly cây bệnh";
    return "Không yêu cầu cách ly";
  }

  if (mode === "rei") {
    return `${normalized} ngày (sau khi phun)`;
  }

  if (mode === "isolation") {
    return `${normalized} ngày (cách ly cây bệnh)`;
  }

  return `${normalized} ngày (trước khi thu hoạch)`;
}

export function formatDays(value?: number | string | null) {
  const normalized = normalizeDays(value);
  if (normalized == null || normalized <= 0) return "Không yêu cầu cách ly";
  return `${normalized} ngày`;
}

export function formatDosageLabel(value?: string | null) {
  const text = normalizeText(value);
  if (!text) return "Theo hướng dẫn trên bao bì";
  return translateRecommendation(text);
}

export function translateTreatmentText(value: string) {
  return translateRecommendation(value);
}

export function translateRecommendation(value: string) {
  if (!value) return value;

  const replacements: Array<[RegExp, string]> = [
    [/\bBiological Control\b/gi, "Biện pháp sinh học"],
    [/\bChemical Control\b/gi, "Biện pháp hóa học"],
    [/\bIntegrated Pest Management\b/gi, "Quản lý dịch hại tổng hợp"],
    [/\bRecommended Action\b/gi, "Khuyến nghị"],
    [/\bRecommendation\b/gi, "Khuyến nghị"],
    [/\bDescription\b/gi, "Mô tả"],
    [/\bSymptoms\b/gi, "Dấu hiệu"],
    [/\bCauses\b/gi, "Nguyên nhân"],
    [/\bPrevention\b/gi, "Biện pháp phòng ngừa"],
    [/\bTreatment\b/gi, "Điều trị"],
    [/\bSeverity\b/gi, "Mức độ"],
    [/\bConfidence\b/gi, "Độ tin cậy"],
    [/\bHealthy\b/gi, "Lá khỏe mạnh"],
    [/\bLeaf Blight\b/gi, "Cháy lá"],
    [/\bPhomopsis Leaf Spot\b/gi, "Đốm lá Phomopsis"],
    [/\bAlgal Leaf Spot\b/gi, "Đốm lá tảo"],
    [/\bAllocaridara Attack\b/gi, "Sâu chích hút Allocaridara"],
    [/\bRemove infected leaves\b/gi, "Cắt bỏ các lá bị nhiễm bệnh."],
    [/\bImprove air circulation\b/gi, "Tăng độ thông thoáng cho vườn."],
    [/\bApply copper fungicide\b/gi, "Phun thuốc gốc đồng theo hướng dẫn."],
    [/\bMonitor weekly\b/gi, "Theo dõi tình trạng hằng tuần."],
    [/\bDestroy infected leaves\b/gi, "Tiêu hủy lá bệnh."],
    [/\bPruning\b/gi, "Cắt tỉa"],
    [/\bMonitoring\b/gi, "Theo dõi"],
    [/\bWhat to do immediately\b/gi, "Việc cần làm ngay"],
    [/\bHow to prevent\b/gi, "Cách phòng ngừa"],
    [/\bWhen to spray\b/gi, "Khi nào phun"],
    [/\bWhen to prune\b/gi, "Khi nào cắt tỉa"],
    [/\bSafe interval\b/gi, "Thời gian cách ly an toàn"],
    [/\bDisease\b/gi, "Bệnh"],
    [/\bObserve PHI before harvest\.?/gi, "Tuân thủ nghiêm ngặt thời gian cách ly an toàn (PHI) trước khi thu hoạch."],
    [/\bMaintain pesticide application records\.?/gi, "Ghi chép và lưu trữ đầy đủ nhật ký phun thuốc bảo vệ thực vật."],
    [/\bFollow VietGAP practices\.?/gi, "Áp dụng đúng quy trình thực hành nông nghiệp tốt VietGAP."],
    [/\bVerify destination-country residue regulations\.?/gi, "Kiểm tra quy định về mức giới hạn dư lượng tối đa (MRL) của thị trường xuất khẩu."],
    [/\bPrefer Biện pháp sinh học whenever possible\.?/gi, "Ưu tiên áp dụng các biện pháp sinh học bất cứ khi nào có thể."],
    [/\bAvoid spraying close to harvest\.?/gi, "Tuyệt đối không phun thuốc sát ngày thu hoạch."],
    [
      /\bChina:\s*Confirm the current MRL position for any fungicide used in the control program\.?/gi,
      "Thị trường Trung Quốc: Đối chiếu và xác nhận mức dư lượng MRL hiện hành cho các hoạt chất trị nấm được sử dụng.",
    ],
    [
      /\bEuropean Union:\s*Use destination-specific MRL lookup before packing the harvest lot\.?/gi,
      "Thị trường Liên minh Châu Âu (EU): Tra cứu quy định MRL cụ thể trước khi đóng gói lô hàng thu hoạch.",
    ],
    [
      /\bEuropean Union:\s*Verify the destination residue rule for the exact fungicide before shipment\.?/gi,
      "Thị trường Liên minh Châu Âu (EU): Kiểm tra lại quy định dư lượng của hoạt chất trị nấm trước khi xuất hàng.",
    ],
    [
      /\bJapan:\s*Validate residue limits in the Japan database before export\.?/gi,
      "Thị trường Nhật Bản: Đối chiếu giới hạn dư lượng trên cơ sở dữ liệu Nhật Bản trước khi xuất khẩu.",
    ],
    [
      /\bVietnam:\s*Prefer sanitation and canopy management; if fungicide is needed, keep the label and PHI records\.?/gi,
      "Việt Nam: Ưu tiên vệ sinh vườn và tỉa cành tạo tán; nếu cần dùng thuốc trị nấm, phải giữ lại nhãn thuốc và nhật ký PHI.",
    ],
    [
      /\bVietnam:\s*Keep field spray logs and PHI records for every treated block\.?/gi,
      "Việt Nam: Duy trì nhật ký phun thuốc tại vườn và ghi chép thời gian cách ly PHI cho từng lô sầu riêng.",
    ],
    [/\bPre-harvest Interval\b/gi, "Thời gian cách ly an toàn"],
    [/\bPHI\b/gi, "Thời gian cách ly an toàn"],
    [/\bSafety Interval\b/gi, "Thời gian cách ly an toàn"],
    [/\bRe-entry Interval\b/gi, "Thời gian an toàn sau phun"],
    [/\bREI\b/gi, "Thời gian an toàn sau phun"],
    [/\bIsolation Period\b/gi, "Thời gian cách ly cây bệnh"],
    [/\bQuarantine Time\b/gi, "Thời gian cách ly cây bệnh"],
    [/\bActive Ingredient\b/gi, "Hoạt chất"],
    [/\bDosage\b/gi, "Liều lượng phun"],
    [/\bApplication Rate\b/gi, "Liều lượng phun"],
    [/\bSafety Interval\b/gi, "Thời gian cách ly an toàn"],
    [/\bPre-harvest\b/gi, "trước thu hoạch"],
    [/\bdays before harvest\b/gi, "ngày trước khi thu hoạch"],
    [/\bdays after spraying\b/gi, "ngày sau khi phun"],
    [/\bdays after spray\b/gi, "ngày sau khi phun"],
    [/\bdays after application\b/gi, "ngày sau khi phun"],
    [/\bday(s)?\b/gi, "ngày"],
    [/\bwhen to spray\b/gi, "Khi nào phun"],
    [/\bapply\b/gi, "phun"],
    [/\bprefer\b/gi, "ưu tiên"],
    [/\bwhenever possible\b/gi, "bất cứ khi nào có thể"],
    [/\bavoid\b/gi, "tránh"],
    [/\bclose to harvest\b/gi, "sát ngày thu hoạch"],
    [/\bobserve\b/gi, "tuân thủ"],
    [/\bmaintain\b/gi, "duy trì"],
    [/\brecords?\b/gi, "nhật ký"],
    [/\bpesticide\b/gi, "thuốc bảo vệ thực vật"],
    [/\bapplication\b/gi, "phun"],
    [/\bguideline(s)?\b/gi, "hướng dẫn"],
    [/\bresidue\b/gi, "dư lượng"],
    [/\bregulation(s)?\b/gi, "quy định"],
    [/\bdestination-country\b/gi, "thị trường xuất khẩu"],
    [/\bdestination-specific\b/gi, "cụ thể theo thị trường đích"],
    [/\bdestination\b/gi, "thị trường đích"],
    [/\bmarket\b/gi, "thị trường"],
    [/\bshipment\b/gi, "xuất hàng"],
    [/\bpacking\b/gi, "đóng gói"],
    [/\bexport\b/gi, "xuất khẩu"],
    [/\bvalidate\b/gi, "đối chiếu"],
    [/\bverify\b/gi, "kiểm tra"],
    [/\bconfirm\b/gi, "xác nhận"],
    [/\bcontrol program\b/gi, "phác đồ kiểm soát"],
    [/\bfungicide\b/gi, "hoạt chất trị nấm"],
    [/\bdatabase\b/gi, "cơ sở dữ liệu"],
    [/\bcanopy management\b/gi, "tỉa cành tạo tán"],
    [/\bsanitation\b/gi, "vệ sinh vườn"],
    [/\bfield spray logs\b/gi, "nhật ký phun thuốc tại vườn"],
    [/\bthe label\b/gi, "nhãn thuốc"],
    [/\blabel\b/gi, "nhãn thuốc"],
    [/\bMRL\b/gi, "MRL"],
    [/\bVietGAP\b/gi, "VietGAP"],
    [/\bChina\b/gi, "Trung Quốc"],
    [/\bJapan\b/gi, "Nhật Bản"],
    [/\bEuropean Union\b/gi, "Liên minh Châu Âu (EU)"],
  ];

  const translated = replacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value);
  const cleaned = cleanupTranslatedText(translated);

  if (shouldFallbackToVietnamese(cleaned)) {
    return "Đang cập nhật";
  }

  return cleaned;
}

function normalizeDays(value?: number | string | null) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.floor(value) : null;

  const text = value.trim();
  if (!text) return null;
  if (/^0+(\.0+)?$/.test(text)) return 0;

  const match = text.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0].replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed);
}

function normalizeText(value?: string | null) {
  return (value ?? "").trim();
}

function cleanupTranslatedText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])([^\s])/g, "$1 $2")
    .replace(/\s+\)/g, ")")
    .replace(/\(\s+/g, "(")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function shouldFallbackToVietnamese(value: string) {
  const englishWords = value.match(/\b[A-Za-z]{4,}\b/g) ?? [];
  return englishWords.length >= 4 && !/[À-ỹ]/u.test(value);
}
