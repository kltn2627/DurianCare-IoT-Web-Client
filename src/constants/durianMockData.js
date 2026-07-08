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
  { id: "APP-082", userId: "c9a7c3b8-1d6f-45a9-8c34-7f2e6d3e1001", name: "Nguyễn Hải Yến", degree: "Thạc sĩ Bảo vệ thực vật", experience: "7 năm", submittedAt: "05/06/2026", status: "Chờ phê duyệt" },
  { id: "APP-081", userId: "4b21950d-0f2b-4e0a-8a6f-9c6c4f29b002", name: "Lâm Quốc Bảo", degree: "Kỹ sư Nông học", experience: "5 năm", submittedAt: "04/06/2026", status: "Chờ phê duyệt" },
  { id: "APP-079", userId: "1b5f2a03-73ed-4e5f-9c32-1a8cdd42c003", name: "Trần Thiên Phúc", degree: "Thạc sĩ Khoa học cây trồng", experience: "9 năm", submittedAt: "02/06/2026", status: "Đã xác minh" },
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

export const cultivationTasks = [
  {
    id: "TASK-260610-01",
    title: "Tưới nhỏ giọt phục hồi ẩm tầng rễ",
    type: "IRRIGATION",
    zoneId: "B1",
    zoneName: "Vườn Ri6 B1",
    crop: "Vụ Ri6 2026",
    scheduledDate: "2026-06-10",
    startTime: "05:30",
    durationMinutes: 45,
    assignee: "Tổ canh tác 02",
    status: "COMPLETED",
    materialName: "Nước tưới",
    materialQuantity: 18,
    materialUnit: "m³",
    materialUnitCost: 4200,
    notes: "Tưới theo ngưỡng độ ẩm đất dưới 72%.",
    confirmedByIot: true,
    iotEvidence: {
      sensor: "SM-B1-03 + FM-B1-01",
      metric: "Độ ẩm đất",
      before: "69%",
      after: "81%",
      delta: "+12%",
      receivedAt: "06:21 • 10/06/2026",
    },
  },
  {
    id: "TASK-260610-02",
    title: "Bón Kali nuôi múi giai đoạn 85 ngày",
    type: "FERTILIZATION",
    zoneId: "A1",
    zoneName: "Vườn Dona A1",
    crop: "Vụ Dona 2026",
    scheduledDate: "2026-06-10",
    startTime: "07:15",
    durationMinutes: 90,
    assignee: "Nguyễn Văn Minh",
    status: "COMPLETED",
    materialName: "Kali Sunphat SOP",
    materialQuantity: 42,
    materialUnit: "kg",
    materialUnitCost: 18500,
    notes: "Rải theo vành tán, chia đều 1 kg cho 3 cây.",
    confirmedByIot: true,
    iotEvidence: {
      sensor: "EC-A1-02",
      metric: "EC dung dịch đất",
      before: "0.82 mS/cm",
      after: "1.17 mS/cm",
      delta: "+0.35 mS/cm",
      receivedAt: "09:04 • 10/06/2026",
    },
  },
  {
    id: "TASK-260611-01",
    title: "Khảo sát đốm tảo sau mưa",
    type: "SCOUTING",
    zoneId: "B1",
    zoneName: "Vườn Ri6 B1",
    crop: "Vụ Ri6 2026",
    scheduledDate: "2026-06-11",
    startTime: "06:30",
    durationMinutes: 60,
    assignee: "KS. Nguyễn Thành Công",
    status: "PLANNED",
    materialName: "Bẫy dính + túi mẫu",
    materialQuantity: 12,
    materialUnit: "bộ",
    materialUnitCost: 9500,
    notes: "Chụp tối thiểu 20 mẫu lá và gắn mã gốc cây.",
    confirmedByIot: false,
    iotEvidence: null,
  },
  {
    id: "TASK-260612-01",
    title: "Phun Bacillus subtilis kiểm soát nấm",
    type: "TREATMENT",
    zoneId: "A2",
    zoneName: "Vườn Dona A2",
    crop: "Vụ Dona 2026",
    scheduledDate: "2026-06-12",
    startTime: "16:00",
    durationMinutes: 120,
    assignee: "Tổ canh tác 01",
    status: "PLANNED",
    materialName: "Bacillus subtilis",
    materialQuantity: 6,
    materialUnit: "lít",
    materialUnitCost: 146000,
    notes: "Chỉ thực hiện khi tốc độ gió dưới 8 km/h.",
    confirmedByIot: false,
    iotEvidence: null,
  },
  {
    id: "TASK-260613-01",
    title: "Tỉa cành vượt và vệ sinh tán",
    type: "PRUNING",
    zoneId: "B2",
    zoneName: "Vườn Ri6 B2",
    crop: "Vụ Ri6 2026",
    scheduledDate: "2026-06-13",
    startTime: "06:00",
    durationMinutes: 180,
    assignee: "Tổ canh tác 03",
    status: "PLANNED",
    materialName: "Keo liền sẹo",
    materialQuantity: 4,
    materialUnit: "hộp",
    materialUnitCost: 78000,
    notes: "Khử trùng dụng cụ sau mỗi hàng cây.",
    confirmedByIot: false,
    iotEvidence: null,
  },
  {
    id: "TASK-260614-01",
    title: "Hiệu chuẩn cảm biến độ ẩm đất",
    type: "MAINTENANCE",
    zoneId: "A1",
    zoneName: "Vườn Dona A1",
    crop: "Hạ tầng IoT",
    scheduledDate: "2026-06-14",
    startTime: "08:30",
    durationMinutes: 75,
    assignee: "Kỹ thuật DurianCare",
    status: "PLANNED",
    materialName: "Dung dịch hiệu chuẩn",
    materialQuantity: 2,
    materialUnit: "chai",
    materialUnitCost: 125000,
    notes: "Đối chiếu sai số với mẫu đất chuẩn tại phòng kỹ thuật.",
    confirmedByIot: false,
    iotEvidence: null,
  },
];

export const cultivationTaskTypes = [
  { value: "IRRIGATION", label: "Tưới nước" },
  { value: "FERTILIZATION", label: "Bón phân" },
  { value: "TREATMENT", label: "Phun thuốc / sinh học" },
  { value: "SCOUTING", label: "Khảo sát sâu bệnh" },
  { value: "PRUNING", label: "Tỉa cành" },
  { value: "MAINTENANCE", label: "Bảo trì IoT" },
];

export const knowledgeArticles = [
  {
    id: "KB-026",
    title: "Kỹ thuật xử lý ra hoa sầu riêng nghịch vụ",
    slug: "xu-ly-ra-hoa-sau-rieng-nghich-vu",
    category: "Kỹ thuật canh tác",
    author: "ThS. Trần Hoàng Nam",
    publishedAt: "08/06/2026",
    updatedAt: "09/06/2026",
    views: 1842,
    status: "PUBLISHED",
    featured: true,
    coverTone: "gold",
    coverImage: "/mock/knowledge-flowering.svg",
    readingTime: "8 phút đọc",
    tags: ["Nghịch vụ", "Dona", "Quản lý nước"],
    excerpt:
      "Quy trình quản lý nước, xiết đọt và cân đối Kali giúp Dona phân hóa mầm hoa đồng đều.",
    content:
      "Xử lý nghịch vụ cần bắt đầu từ sức khỏe bộ rễ và độ thuần thục của lá. Trước khi xiết nước, vườn phải có hệ thống thoát nước chủ động và chỉ số ẩm đất được theo dõi liên tục. Sau giai đoạn tạo khô hạn có kiểm soát, nhà vườn phục hồi ẩm từng bước, kết hợp dinh dưỡng Kali và Canxi Bo theo kết quả phân tích đất.",
  },
  {
    id: "KB-025",
    title: "Cách phòng trừ nấm Phytophthora gây thối rễ Ri6",
    slug: "phong-tru-nam-phytophthora-thoi-re-ri6",
    category: "Sâu bệnh",
    author: "KS. Nguyễn Thành Công",
    publishedAt: "06/06/2026",
    updatedAt: "06/06/2026",
    views: 1296,
    status: "PUBLISHED",
    featured: false,
    coverTone: "rust",
    coverImage: "/mock/knowledge-disease.svg",
    readingTime: "6 phút đọc",
    tags: ["Phytophthora", "Ri6", "Bộ rễ"],
    excerpt:
      "Nhận biết sớm vùng rễ bị úng và xây dựng quy trình phục hồi bằng vi sinh đối kháng.",
    content:
      "Phytophthora phát triển mạnh khi đất bí, độ ẩm kéo dài và cổ rễ bị tổn thương. Cần mở rãnh thoát nước, loại bỏ mô bệnh và sử dụng chế phẩm sinh học đúng mật độ. Không bón phân hóa học nồng độ cao khi rễ đang suy yếu.",
  },
  {
    id: "KB-024",
    title: "Cân đối NPK giai đoạn nuôi múi Dona 80-100 ngày",
    slug: "can-doi-npk-nuoi-mui-dona",
    category: "Dinh dưỡng",
    author: "KS. Phạm Ngọc Lan",
    publishedAt: "03/06/2026",
    updatedAt: "05/06/2026",
    views: 968,
    status: "PUBLISHED",
    featured: false,
    coverTone: "green",
    coverImage: "/mock/knowledge-nutrition.svg",
    readingTime: "7 phút đọc",
    tags: ["NPK", "Nuôi trái", "Dona"],
    excerpt:
      "Điều chỉnh đạm, Kali và trung vi lượng theo tải trái và EC dung dịch đất.",
    content:
      "Giai đoạn nuôi múi cần hạn chế dư đạm để tránh sượng cơm và đọt non cạnh tranh dinh dưỡng. Liều Kali phải dựa trên tải trái, độ dẫn điện của đất và khả năng giữ ẩm từng phân khu.",
  },
  {
    id: "KB-023",
    title: "Tạo tán thông thoáng sau thu hoạch cho vườn Ri6",
    slug: "tao-tan-sau-thu-hoach-ri6",
    category: "Kỹ thuật cắt tỉa",
    author: "ThS. Võ Minh An",
    publishedAt: "30/05/2026",
    updatedAt: "30/05/2026",
    views: 742,
    status: "REVIEW",
    featured: false,
    coverTone: "olive",
    coverImage: "/mock/knowledge-pruning.svg",
    readingTime: "5 phút đọc",
    tags: ["Cắt tỉa", "Sau thu hoạch", "Ri6"],
    excerpt:
      "Nguyên tắc chọn cành cấp một, xử lý cành vượt và sát khuẩn vết cắt.",
    content:
      "Sau thu hoạch, ưu tiên loại bỏ cành sâu bệnh, cành mọc vào trong tán và cành vượt. Không cắt quá 25% sinh khối tán trong một lần để tránh sốc cây.",
  },
  {
    id: "KB-022",
    title: "Nhận diện rầy xanh trên đọt non qua ảnh AI",
    slug: "nhan-dien-ray-xanh-dot-non-ai",
    category: "Sâu bệnh",
    author: "Ban kỹ thuật DurianCare",
    publishedAt: "28/05/2026",
    updatedAt: "01/06/2026",
    views: 2104,
    status: "DRAFT",
    featured: false,
    coverTone: "slate",
    coverImage: "/mock/ri6-leaf-spot.svg",
    readingTime: "4 phút đọc",
    tags: ["AI", "Rầy xanh", "Đọt non"],
    excerpt:
      "Hướng dẫn chụp mẫu lá đúng ánh sáng và phân biệt vết chích hút với cháy mép lá.",
    content:
      "Ảnh đầu vào nên chụp vuông góc mặt lá, tránh bóng gắt và đặt vùng tổn thương ở trung tâm. Kết quả AI cần được đối chiếu với mật độ côn trùng thực tế.",
  },
];

export const knowledgeCategories = [
  "Tất cả",
  "Dinh dưỡng",
  "Sâu bệnh",
  "Kỹ thuật canh tác",
  "Kỹ thuật bón phân nghịch vụ",
  "Kỹ thuật cắt tỉa",
];

export const knowledgeArticleSections = {
  "xu-ly-ra-hoa-sau-rieng-nghich-vu": [
    {
      heading: "Điều kiện tiền đề trước khi xiết nước",
      body: "Chỉ bắt đầu khi bộ lá đã chuyển lụa hoàn toàn, rễ cám khỏe và vườn có khả năng thoát nước chủ động. Chủ vườn cần ghi nhận độ ẩm đất ít nhất ba ngày liên tiếp để tránh tạo khô hạn đột ngột.",
    },
    {
      heading: "Theo dõi phân khu bằng cảm biến",
      body: "Duy trì việc đọc độ ẩm ở hai tầng rễ và so sánh chênh lệch giữa đầu, giữa và cuối tuyến tưới. Khi độ ẩm giảm đều, cây không héo lá vào buổi trưa và EC còn trong ngưỡng an toàn mới chuyển sang bước kích thích phân hóa mầm hoa.",
    },
    {
      heading: "Phục hồi ẩm và cân đối dinh dưỡng",
      body: "Phục hồi nước theo nhiều nhịp nhỏ thay vì tưới bão hòa một lần. Kali, Canxi và Bo phải dựa trên tải trái dự kiến, kết quả phân tích đất và lịch sử bón trước đó; tuyệt đối không phối trộn theo kinh nghiệm khi chưa kiểm tra độ tương thích.",
    },
  ],
  "phong-tru-nam-phytophthora-thoi-re-ri6": [
    {
      heading: "Nhận biết sớm vùng rễ suy yếu",
      body: "Quan sát lá mất độ bóng, vàng từ chóp và hiện tượng chảy nhựa quanh cổ rễ. Đối chiếu với dữ liệu ẩm đất sau mưa để khoanh vùng những vị trí bị úng kéo dài.",
    },
    {
      heading: "Xử lý nguồn nước và mô bệnh",
      body: "Mở rãnh thoát nước, dọn vật liệu hữu cơ đang phân hủy sát gốc và loại bỏ mô bệnh bằng dụng cụ đã khử trùng. Không bón phân hóa học nồng độ cao trong thời gian rễ đang phục hồi.",
    },
    {
      heading: "Tái lập hệ vi sinh có lợi",
      body: "Sử dụng chế phẩm đối kháng theo nhãn đăng ký, giữ đất đủ ẩm nhưng không bão hòa và đánh giá lại tán lá sau từng chu kỳ bảy ngày trước khi quyết định bước tiếp theo.",
    },
  ],
  "can-doi-npk-nuoi-mui-dona": [
    {
      heading: "Đọc tải trái trước khi lên công thức",
      body: "Ghi nhận số trái thực tế trên từng cây, đường kính trung bình và sức lá. Các cây mang tải cao cần được tách thành nhóm theo dõi riêng thay vì áp một liều cho toàn phân khu.",
    },
    {
      heading: "Kiểm soát đạm và EC đất",
      body: "Dư đạm dễ làm phát đọt cạnh tranh với trái và tăng nguy cơ sượng cơm. Theo dõi EC trước và sau bón để điều chỉnh lượng phân ở lần kế tiếp, đặc biệt trong giai đoạn mưa kéo dài.",
    },
    {
      heading: "Chia nhỏ lần bón",
      body: "Chia lượng dinh dưỡng thành nhiều lần, bón quanh vành tán khi đất đủ ẩm. Sau mỗi lần bón cần lưu chi phí vật tư, lượng thực dùng và xác nhận thay đổi chỉ số từ trạm IoT.",
    },
  ],
  "tao-tan-sau-thu-hoach-ri6": [
    {
      heading: "Thứ tự cành cần loại bỏ",
      body: "Ưu tiên cành sâu bệnh, cành mọc vào trong tán, cành vượt và cành đã suy kiệt sau mang trái. Đánh dấu trước khi cắt để giữ lại bộ khung cân đối.",
    },
    {
      heading: "Giới hạn sinh khối mỗi lần cắt",
      body: "Không loại bỏ quá 25% sinh khối tán trong một lần. Vết cắt lớn phải gọn, nghiêng thoát nước và được bảo vệ bằng vật liệu phù hợp.",
    },
    {
      heading: "Nhật ký vệ sinh dụng cụ",
      body: "Khử trùng kéo và cưa khi chuyển giữa các hàng cây, thu gom cành bệnh ra khỏi vườn và cập nhật người thực hiện vào lịch canh tác VietGAP.",
    },
  ],
  "nhan-dien-ray-xanh-dot-non-ai": [
    {
      heading: "Chuẩn hóa ảnh chụp",
      body: "Đặt lá trên nền trung tính, chụp vuông góc cả hai mặt và tránh bóng nắng gắt. Vùng tổn thương nên nằm ở trung tâm ảnh nhưng vẫn giữ được đường viền lá.",
    },
    {
      heading: "Đối chiếu ngoài thực địa",
      body: "Kết quả AI chỉ là tín hiệu sàng lọc. Chủ vườn cần kiểm tra mật độ côn trùng ở mặt dưới lá, đọt non lân cận và bẫy dính trước khi can thiệp.",
    },
    {
      heading: "Khi nào cần gọi kỹ sư",
      body: "Tạo yêu cầu cứu trợ khi tỷ lệ đọt bị hại tăng nhanh, kết quả AI thiếu ổn định hoặc cây đang ở giai đoạn ra hoa, nuôi trái nhạy cảm.",
    },
  ],
};

export const farmerZones = [
  {
    id: "A1",
    name: "Vườn Dona A1",
    crop: "Dona nghịch vụ 2026",
    snapshot: "Ẩm đất 78% • Không khí 86% • 29.6°C",
  },
  {
    id: "A2",
    name: "Vườn Dona A2",
    crop: "Dona phục hồi sau thu hoạch",
    snapshot: "Ẩm đất 74% • Không khí 83% • 30.1°C",
  },
  {
    id: "B1",
    name: "Vườn Ri6 B1",
    crop: "Ri6 nuôi trái 96 ngày",
    snapshot: "Ẩm đất 84% • Không khí 91% • 29.2°C",
  },
  {
    id: "B2",
    name: "Vườn Ri6 B2",
    crop: "Ri6 kiến thiết cơ bản",
    snapshot: "Ẩm đất 76% • Không khí 81% • 30.4°C",
  },
];

export const farmerAiMessages = [
  {
    id: "AI-MSG-01",
    sender: "ASSISTANT",
    content:
      "Chào anh Minh. Tôi có thể hỗ trợ đọc nhanh chỉ số IoT, phân tích ảnh lá và gợi ý các bước kiểm tra ban đầu. Khuyến nghị quan trọng vẫn cần kỹ sư xác nhận trước khi xử lý thuốc.",
    sentAt: "08:30",
    type: "TEXT",
    image: null,
  },
  {
    id: "AI-MSG-02",
    sender: "OWNER",
    content:
      "Độ ẩm đất khu Ri6 B1 đang 84% sau mưa, lá non có vài đốm nâu. Tôi nên kiểm tra gì trước?",
    sentAt: "08:34",
    type: "TEXT",
    image: null,
  },
  {
    id: "AI-MSG-03",
    sender: "ASSISTANT",
    content:
      "Hãy kiểm tra khả năng thoát nước quanh cổ rễ, chụp rõ hai mặt lá và tạm ngưng tưới phun lên tán. Nếu đốm lan nhanh trong 24 giờ, anh nên chuyển ảnh sang phòng Kỹ sư để được xác nhận.",
    sentAt: "08:34",
    type: "TEXT",
    image: null,
  },
];

export const dispatchEngineers = [
  {
    id: "ENG-01",
    name: "ThS. Trần Hoàng Nam",
    specialty: "Bệnh học thực vật",
    activeCases: 4,
    online: true,
  },
  {
    id: "ENG-02",
    name: "KS. Nguyễn Thành Công",
    specialty: "Dinh dưỡng & quản lý nước",
    activeCases: 3,
    online: true,
  },
  {
    id: "ENG-03",
    name: "KS. Phạm Ngọc Lan",
    specialty: "Canh tác VietGAP",
    activeCases: 6,
    online: false,
  },
];

export const expertConversations = [
  {
    id: "CHAT-014",
    ownerName: "Nguyễn Văn Minh",
    initials: "NM",
    farm: "Trang trại Minh Phát",
    zone: "Vườn Ri6 B1",
    location: "Cai Lậy, Tiền Giang",
    status: "WAITING",
    activityLabel: "Chờ phản hồi",
    unreadCount: 3,
    lastMessage: "Lá non có đốm nâu lan rất nhanh sau hai ngày mưa.",
    lastMessageAt: "09:42",
    online: true,
    cropContext: "Ri6 • 96 cây • Giai đoạn nuôi trái",
    sensorContext: "Ẩm đất 84% • Không khí 91% • 29.2°C",
    messages: [
      {
        id: "MSG-1401",
        sender: "OWNER",
        content:
          "Chào kỹ sư, lá non ở khu B1 xuất hiện đốm nâu và viền vàng sau đợt mưa.",
        sentAt: "09:34",
        type: "TEXT",
        image: null,
      },
      {
        id: "MSG-1402",
        sender: "OWNER",
        content: "Tôi gửi ảnh mặt trên và mặt dưới của lá vừa hái.",
        sentAt: "09:36",
        type: "IMAGE",
        image: "/mock/ri6-leaf-spot.svg",
      },
      {
        id: "MSG-1403",
        sender: "EXPERT",
        content:
          "Tôi đã xem ảnh. Khả năng cao là đốm lá Phomopsis ở giai đoạn sớm. Anh tạm ngưng tưới phun lên tán và kiểm tra thoát nước quanh gốc.",
        sentAt: "09:39",
        type: "TEXT",
        image: null,
      },
      {
        id: "MSG-1404",
        sender: "OWNER",
        content:
          "Độ ẩm đất đang 84%, tôi có cần xả bớt nước và tỉa lá bệnh ngay không?",
        sentAt: "09:42",
        type: "TEXT",
        image: null,
      },
    ],
  },
  {
    id: "CHAT-013",
    ownerName: "Lê Quốc Dũng",
    initials: "LD",
    farm: "Nông trại Sáu Ri",
    zone: "Khu Dona C2",
    location: "Cái Mơn, Bến Tre",
    status: "IN_PROGRESS",
    activityLabel: "Đang tưới/bón phân",
    unreadCount: 1,
    lastMessage: "EC sau khi bón Kali tăng lên 1.31 mS/cm.",
    lastMessageAt: "09:18",
    online: true,
    cropContext: "Dona • 72 cây • Giai đoạn 92 ngày",
    sensorContext: "EC 1.31 mS/cm • Ẩm đất 78% • 30.1°C",
    messages: [
      {
        id: "MSG-1301",
        sender: "OWNER",
        content:
          "Tôi vừa bón Kali SOP theo lịch, hệ thống báo EC tăng khá nhanh.",
        sentAt: "09:10",
        type: "TEXT",
        image: null,
      },
      {
        id: "MSG-1302",
        sender: "EXPERT",
        content:
          "Anh giữ nguyên lượng tưới nhỏ giọt hiện tại và không bổ sung thêm phân trong 48 giờ. Tôi sẽ theo dõi đường EC cùng anh.",
        sentAt: "09:14",
        type: "TEXT",
        image: null,
      },
      {
        id: "MSG-1303",
        sender: "OWNER",
        content: "EC sau khi bón Kali tăng lên 1.31 mS/cm.",
        sentAt: "09:18",
        type: "TEXT",
        image: null,
      },
    ],
  },
  {
    id: "CHAT-012",
    ownerName: "Trần Thị Hạnh",
    initials: "TH",
    farm: "Hợp tác xã Tân Phú",
    zone: "Vườn Ri6 D4",
    location: "Cẩm Mỹ, Đồng Nai",
    status: "WAITING",
    activityLabel: "Chờ phản hồi",
    unreadCount: 2,
    lastMessage: "Trái 70 ngày bị méo nhẹ, cuống vẫn xanh.",
    lastMessageAt: "08:56",
    online: false,
    cropContext: "Ri6 • 118 cây • Giai đoạn 70 ngày",
    sensorContext: "Ẩm đất 73% • Không khí 82% • 31.4°C",
    messages: [
      {
        id: "MSG-1201",
        sender: "OWNER",
        content:
          "Một số trái 70 ngày bị méo nhẹ nhưng cuống vẫn xanh. Tôi có nên tăng Canxi Bo không?",
        sentAt: "08:54",
        type: "TEXT",
        image: null,
      },
      {
        id: "MSG-1202",
        sender: "OWNER",
        content: "Tỷ lệ khoảng 6 trái trên 40 cây đang mang trái.",
        sentAt: "08:56",
        type: "TEXT",
        image: null,
      },
    ],
  },
  {
    id: "CHAT-011",
    ownerName: "Phạm Hoàng Sơn",
    initials: "PS",
    farm: "Durian Hills",
    zone: "Khu Dona Đồi 2",
    location: "Bảo Lộc, Lâm Đồng",
    status: "RESOLVED",
    activityLabel: "Đã ổn định",
    unreadCount: 0,
    lastMessage: "Cây đã phục hồi, cảm ơn kỹ sư.",
    lastMessageAt: "Hôm qua",
    online: false,
    cropContext: "Dona • 54 cây • Phục hồi sau thối rễ",
    sensorContext: "Ẩm đất 71% • Không khí 76% • 27.8°C",
    messages: [
      {
        id: "MSG-1101",
        sender: "EXPERT",
        content:
          "Duy trì rãnh thoát nước và tưới chế phẩm Trichoderma theo liều đã gửi.",
        sentAt: "Hôm qua, 15:20",
        type: "TEXT",
        image: null,
      },
      {
        id: "MSG-1102",
        sender: "OWNER",
        content: "Cây đã phục hồi, cảm ơn kỹ sư.",
        sentAt: "Hôm qua, 17:05",
        type: "TEXT",
        image: null,
      },
    ],
  },
];

export const chatDispatchQueue = expertConversations.map((conversation, index) => ({
  ...conversation,
  priority: index === 0 ? "HIGH" : index === 2 ? "MEDIUM" : "NORMAL",
  assignedEngineer:
    conversation.status === "WAITING"
      ? null
      : index === 1
        ? "ThS. Trần Hoàng Nam"
        : "KS. Nguyễn Thành Công",
  submittedAt:
    index === 0
      ? "11/06/2026 • 09:34"
      : index === 1
        ? "11/06/2026 • 09:10"
        : "10/06/2026 • 16:20",
}));
