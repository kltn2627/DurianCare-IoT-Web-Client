export const mockAccounts = [
  { email: "owner@duriancare.vn", password: "123456", role: "OWNER", name: "Nguyễn Minh" },
  { email: "admin@duriancare.vn", password: "123456", role: "ADMIN", name: "Lê Thảo" },
  { email: "engineer@duriancare.vn", password: "123456", role: "ENGINEER", name: "Trần Hoàng Nam" },
];

export const farmZones = [
  { id: "A1", name: "Vườn Dona A1", trees: 128, health: 96, moisture: 82, status: "Ổn định" },
  { id: "A2", name: "Vườn Dona A2", trees: 112, health: 91, moisture: 78, status: "Ổn định" },
  { id: "B1", name: "Vườn Ri6 B1", trees: 96, health: 84, moisture: 73, status: "Cần theo dõi" },
  { id: "B2", name: "Vườn Ri6 B2", trees: 104, health: 94, moisture: 80, status: "Ổn định" },
];

export const sensorTimeline = [
  { time: "06:00", temperature: 28.2, airHumidity: 88, soilMoisture: 84 },
  { time: "08:00", temperature: 29.1, airHumidity: 84, soilMoisture: 82 },
  { time: "10:00", temperature: 30.4, airHumidity: 80, soilMoisture: 79 },
  { time: "12:00", temperature: 31.8, airHumidity: 76, soilMoisture: 75 },
  { time: "14:00", temperature: 31.2, airHumidity: 78, soilMoisture: 72 },
  { time: "16:00", temperature: 30.1, airHumidity: 82, soilMoisture: 76 },
  { time: "18:00", temperature: 29.3, airHumidity: 86, soilMoisture: 81 },
  { time: "20:00", temperature: 28.6, airHumidity: 89, soilMoisture: 83 },
];

export const zoneSensorData = farmZones.map((zone, zoneIndex) => ({
  ...zone,
  readings: sensorTimeline.map((item, index) => ({
    ...item,
    temperature: Number(Math.min(32, item.temperature + zoneIndex * 0.2 - (index % 3) * 0.1).toFixed(1)),
    airHumidity: Math.max(70, item.airHumidity - zoneIndex * 2),
    soilMoisture: Math.max(70, item.soilMoisture - zoneIndex * 2 + (index % 2)),
  })),
}));

export const diagnosisHistory = [
  { id: "AI-2406", detectedAt: "05/06/2026 16:42", zone: "Vườn Dona A1", treeCode: "DC-A1-084", disease: "Healthy_Leaf", confidence: 98.6, source: "DurianCare Mobile" },
  { id: "AI-2405", detectedAt: "05/06/2026 14:18", zone: "Vườn Ri6 B1", treeCode: "DC-B1-031", disease: "Algal_Leaf_Spot", confidence: 94.2, source: "DurianCare Mobile" },
  { id: "AI-2404", detectedAt: "05/06/2026 10:05", zone: "Vườn Dona A2", treeCode: "DC-A2-066", disease: "Leaf_Blight", confidence: 91.8, source: "DurianCare Mobile" },
  { id: "AI-2403", detectedAt: "04/06/2026 17:30", zone: "Vườn Ri6 B2", treeCode: "DC-B2-019", disease: "Phomopsis_Leaf_Spot", confidence: 89.7, source: "DurianCare Mobile" },
  { id: "AI-2402", detectedAt: "04/06/2026 08:12", zone: "Vườn Ri6 B1", treeCode: "DC-B1-074", disease: "Allocaridara_Attacked", confidence: 96.4, source: "DurianCare Mobile" },
];

export const diseaseDistribution = [
  { name: "Healthy_Leaf", label: "Lá khỏe", value: 58, color: "#2E5A44" },
  { name: "Algal_Leaf_Spot", label: "Đốm tảo", value: 16, color: "#E0B83F" },
  { name: "Leaf_Blight", label: "Cháy lá", value: 11, color: "#D9794C" },
  { name: "Phomopsis_Leaf_Spot", label: "Phomopsis", value: 9, color: "#78966A" },
  { name: "Allocaridara_Attacked", label: "Rầy xanh", value: 6, color: "#85583B" },
];

export const authorizationRequests = [
  {
    id: "REQ-014",
    engineer: "ThS. Trần Hoàng Nam",
    specialty: "Bệnh học thực vật",
    experience: "8 năm",
    certificate: "Kỹ sư nông nghiệp hạng II",
    targetZone: "Vườn Ri6 B1",
    requestedAt: "05/06/2026",
    avatar: "TN",
  },
  {
    id: "REQ-013",
    engineer: "KS. Phạm Ngọc Lan",
    specialty: "Dinh dưỡng cây trồng",
    experience: "6 năm",
    certificate: "GlobalG.A.P. Farm Assurer",
    targetZone: "Vườn Dona A2",
    requestedAt: "04/06/2026",
    avatar: "PL",
  },
];

export const activeEngineers = [
  { id: "ENG-008", name: "KS. Nguyễn Thành Công", zone: "Vườn Dona A1", permissions: ["treatment"], since: "18/03/2026" },
  { id: "ENG-011", name: "ThS. Võ Minh An", zone: "Vườn Ri6 B2", permissions: ["treatment", "irrigation"], since: "02/04/2026" },
];

export const treatmentProtocols = [
  { id: "PT-001", name: "Kiểm soát đốm tảo sinh học", disease: "Algal_Leaf_Spot", duration: "14 ngày", activeFarms: 18, status: "Đang áp dụng" },
  { id: "PT-002", name: "Xử lý cháy lá mùa mưa", disease: "Leaf_Blight", duration: "21 ngày", activeFarms: 12, status: "Đang áp dụng" },
  { id: "PT-003", name: "Phác đồ phục hồi Phomopsis", disease: "Phomopsis_Leaf_Spot", duration: "28 ngày", activeFarms: 9, status: "Đang rà soát" },
  { id: "PT-004", name: "IPM kiểm soát rầy xanh", disease: "Allocaridara_Attacked", duration: "10 ngày", activeFarms: 15, status: "Đang áp dụng" },
];

export const engineerApplications = [
  { id: "APP-082", name: "Nguyễn Hải Yến", degree: "Thạc sĩ Bảo vệ thực vật", experience: "7 năm", submittedAt: "05/06/2026", status: "Chờ phê duyệt" },
  { id: "APP-081", name: "Lâm Quốc Bảo", degree: "Kỹ sư Nông học", experience: "5 năm", submittedAt: "04/06/2026", status: "Chờ phê duyệt" },
  { id: "APP-079", name: "Trần Thiên Phúc", degree: "Thạc sĩ Khoa học cây trồng", experience: "9 năm", submittedAt: "02/06/2026", status: "Đã xác minh" },
];

export const systemFarms = [
  { name: "Trang trại Minh Phát", location: "Cai Lậy, Tiền Giang", zones: 4, health: 92, alerts: 3 },
  { name: "Nông trại Sáu Ri", location: "Cái Mơn, Bến Tre", zones: 7, health: 88, alerts: 6 },
  { name: "Durian Hills", location: "Bảo Lộc, Lâm Đồng", zones: 5, health: 95, alerts: 2 },
  { name: "Hợp tác xã Tân Phú", location: "Cẩm Mỹ, Đồng Nai", zones: 9, health: 86, alerts: 8 },
];

export const cropLots = [
  {
    id: "DC-2026-DONA-018",
    variety: "Dona",
    farm: "Trang trại Minh Phát",
    zone: "Vườn Dona A1",
    plantedAt: "12/08/2025",
    harvestAt: "18/06/2026",
    trees: 42,
    status: "Sẵn sàng xuất xưởng",
  },
  {
    id: "DC-2026-RI6-012",
    variety: "Ri6",
    farm: "Trang trại Minh Phát",
    zone: "Vườn Ri6 B2",
    plantedAt: "25/08/2025",
    harvestAt: "22/06/2026",
    trees: 36,
    status: "Đang hoàn thiện hồ sơ",
  },
];

export const treatmentLog = [
  { date: "18/03/2026", type: "Bón phân", detail: "Phân hữu cơ vi sinh 3-2-2", dosage: "2.5 kg/cây", operator: "Tổ canh tác 01" },
  { date: "02/04/2026", type: "Phun sinh học", detail: "Bacillus subtilis kiểm soát nấm", dosage: "1.2 lít/ha", operator: "KS. Nguyễn Thành Công" },
  { date: "21/04/2026", type: "Bón phân", detail: "Kali sunphat giai đoạn nuôi trái", dosage: "0.8 kg/cây", operator: "Tổ canh tác 01" },
  { date: "12/05/2026", type: "Phun sinh học", detail: "Dầu neem phòng côn trùng chích hút", dosage: "0.7 lít/ha", operator: "KS. Nguyễn Thành Công" },
  { date: "28/05/2026", type: "Dinh dưỡng lá", detail: "Canxi Bo hữu cơ", dosage: "0.5 lít/ha", operator: "Tổ canh tác 02" },
];

export const cropHealthHistory = [
  { date: "15/03/2026", status: "Healthy_Leaf", confidence: 98.2, note: "Tán lá phát triển đồng đều" },
  { date: "09/04/2026", status: "Algal_Leaf_Spot", confidence: 90.4, note: "Phát hiện sớm tại 2 cây, đã xử lý" },
  { date: "27/04/2026", status: "Healthy_Leaf", confidence: 97.1, note: "Phục hồi tốt sau phác đồ" },
  { date: "20/05/2026", status: "Healthy_Leaf", confidence: 98.8, note: "Không ghi nhận dấu hiệu tái nhiễm" },
  { date: "05/06/2026", status: "Healthy_Leaf", confidence: 99.1, note: "Đủ điều kiện trước thu hoạch" },
];

export const dashboardStats = {
  owner: [
    { label: "Tổng cây quản lý", value: "440", note: "4 phân khu canh tác", icon: "Trees" },
    { label: "Trạm IoT hoạt động", value: "12/12", note: "Kết nối ổn định", icon: "Radio" },
    { label: "Độ ẩm đất trung bình", value: "79%", note: "Trong ngưỡng tối ưu", icon: "Droplets" },
    { label: "Cảnh báo cần xử lý", value: "03", note: "2 mức trung bình", icon: "ShieldAlert" },
  ],
  admin: [
    { label: "Trang trại trên hệ thống", value: "48", note: "+4 trong tháng này", icon: "Warehouse" },
    { label: "Kỹ sư đã xác minh", value: "126", note: "2 hồ sơ đang chờ", icon: "BadgeCheck" },
    { label: "Ca AI trong 30 ngày", value: "2.840", note: "92.4% độ tin cậy TB", icon: "ScanSearch" },
    { label: "Cảnh báo toàn hệ thống", value: "19", note: "3 mức ưu tiên cao", icon: "ShieldAlert" },
  ],
};

export const userProfiles = {
  OWNER: {
    name: "Nguyễn Văn Minh",
    initials: "NM",
    role: "Chủ trang trại",
    email: "owner@duriancare.vn",
    phone: "0908 246 810",
    location: "Cai Lậy, Tiền Giang",
    organization: "Trang trại Minh Phát",
    joinedAt: "Tháng 08/2025",
    bio: "Chủ trang trại chuyên canh sầu riêng Dona và Ri6, áp dụng quy trình số hóa toàn bộ hoạt động canh tác.",
    credential: "Mã cơ sở trồng: TG-CL-0182",
    metrics: [
      { label: "Phân khu quản lý", value: "04" },
      { label: "Tổng cây", value: "440" },
      { label: "Kỹ sư ủy quyền", value: "02" },
    ],
  },
  ADMIN: {
    name: "Lê Thanh Thảo",
    initials: "LT",
    role: "Quản trị viên hệ thống",
    email: "admin@duriancare.vn",
    phone: "0912 668 204",
    location: "Thành phố Hồ Chí Minh",
    organization: "DurianCare Operations",
    joinedAt: "Tháng 01/2025",
    bio: "Phụ trách vận hành hệ sinh thái, kiểm duyệt hồ sơ kỹ sư và chuẩn hóa danh mục phác đồ điều trị.",
    credential: "System Administrator • Level 3",
    metrics: [
      { label: "Trang trại giám sát", value: "48" },
      { label: "Kỹ sư xác minh", value: "126" },
      { label: "Phác đồ nền tảng", value: "18" },
    ],
  },
  ENGINEER: {
    name: "Trần Hoàng Nam",
    initials: "TN",
    role: "Kỹ sư nông nghiệp",
    email: "engineer@duriancare.vn",
    phone: "0986 315 742",
    location: "Cái Mơn, Bến Tre",
    organization: "Mạng lưới chuyên gia DurianCare",
    joinedAt: "Tháng 03/2025",
    bio: "Thạc sĩ bệnh học thực vật với 8 năm kinh nghiệm chẩn đoán và xây dựng phác đồ cho cây sầu riêng.",
    credential: "Kỹ sư nông nghiệp hạng II",
    metrics: [
      { label: "Trang trại hợp tác", value: "12" },
      { label: "Ca tư vấn", value: "284" },
      { label: "Phác đồ đã lập", value: "76" },
    ],
  },
};
