import type {
  AgriculturalInput,
  CareHistoryResponse,
  CultivationActivity,
  CultivationDashboardData,
  CultivationPlan,
  CultivationZone,
  CultivationZoneRequest,
  FarmOption,
} from "./types";

const FARM_STORAGE_KEY = "duriancare.mock.farms";
const ZONE_STORAGE_KEY = "duriancare.mock.cultivation-zones";
const PLAN_STORAGE_KEY = "duriancare.mock.cultivation-plans";
const ACTIVITY_STORAGE_KEY = "duriancare.mock.cultivation-activities";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const defaultFarms: FarmOption[] = [
  {
    id: "mock-farm-main",
    code: "FARM-001",
    name: "Vườn sầu riêng chính",
    location: "Đắk Lắk",
  },
];

const defaultZones: CultivationZone[] = [
  {
    id: "mock-zone-east",
    code: "ZONE-001",
    farmId: "mock-farm-main",
    name: "Khu Đông RI6",
    areaValue: 1.8,
    areaUnit: "HECTARE",
    cropType: "DURIAN",
    variety: "RI6",
    plantingDate: "2020-06-10",
    initialTreeCount: 170,
    currentTreeCount: 164,
    previousHarvestCount: 2,
    growthStage: "PRODUCTIVE",
    seedSource: "Vườn ươm địa phương",
    plantingDistance: "8m x 8m",
    soilType: "Đất đỏ bazan",
    waterSource: "Ao trữ nước",
    irrigationMethod: "DRIP",
    drainageStatus: "Thoát nước tốt",
    status: "ACTIVE",
    locationDescription: "Phía Đông trang trại, gần tuyến tưới số 2.",
    imageUrls: [],
    notes: "Khu đang cho trái ổn định, cần theo dõi nấm lá vào đầu mùa mưa.",
    harvestHistories: [
      {
        id: "mock-harvest-2025",
        seasonName: "Vụ chính 2025",
        harvestYear: 2025,
        harvestedAt: "2025-07-18",
        yieldValue: 18.4,
        yieldUnit: "tấn",
        qualityNote: "Tỷ lệ trái loại 1 cao",
        notes: "Thu hoạch trong 3 đợt.",
      },
      {
        id: "mock-harvest-2024",
        seasonName: "Vụ chính 2024",
        harvestYear: 2024,
        harvestedAt: "2024-07-22",
        yieldValue: 14.8,
        yieldUnit: "tấn",
        qualityNote: "Sản lượng trung bình",
        notes: "Ảnh hưởng mưa cuối vụ.",
      },
    ],
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T08:00:00.000Z",
  },
];

const defaultPlans: CultivationPlan[] = [
  {
    id: "mock-plan-2026",
    farmId: "mock-farm-main",
    plotId: "mock-zone-east",
    cultivationSeasonId: "mock-season-2026",
    templateId: null,
    name: "Kế hoạch chăm sóc vụ 2026",
    startDate: "2026-07-01",
    expectedHarvestDate: "2026-09-20",
    targetMarketCodes: ["VN"],
    status: "ACTIVE",
    createdBy: "mock-owner",
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T08:00:00.000Z",
  },
];

const defaultActivities: CultivationActivity[] = [
  {
    id: "mock-activity-001",
    cultivationPlanId: "mock-plan-2026",
    cultivationSeasonId: "mock-season-2026",
    farmId: "mock-farm-main",
    plotId: "mock-zone-east",
    treeIds: [],
    activityType: "IRRIGATION",
    title: "Kiểm tra tưới và độ ẩm đất",
    description: "Ưu tiên các hàng gần tuyến tưới số 2.",
    scheduledStartAt: "2026-07-16T07:30:00.000Z",
    scheduledEndAt: "2026-07-16T09:00:00.000Z",
    recurrenceRule: null,
    priority: "HIGH",
    status: "SCHEDULED",
    assignedUserIds: ["mock-owner"],
    approvalRequired: false,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    version: 1,
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-10T08:00:00.000Z",
  },
  {
    id: "mock-activity-002",
    cultivationPlanId: "mock-plan-2026",
    cultivationSeasonId: "mock-season-2026",
    farmId: "mock-farm-main",
    plotId: "mock-zone-east",
    treeIds: [],
    activityType: "FERTILIZATION",
    title: "Bón phân hữu cơ bổ sung",
    description: "Rải theo mép tán, tưới nhẹ sau khi bón.",
    scheduledStartAt: "2026-07-18T01:00:00.000Z",
    scheduledEndAt: "2026-07-18T03:00:00.000Z",
    recurrenceRule: null,
    priority: "MEDIUM",
    status: "SCHEDULED",
    assignedUserIds: ["mock-owner"],
    approvalRequired: false,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    version: 1,
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-10T08:00:00.000Z",
  },
  {
    id: "mock-activity-003",
    cultivationPlanId: "mock-plan-2026",
    cultivationSeasonId: "mock-season-2026",
    farmId: "mock-farm-main",
    plotId: "mock-zone-east",
    treeIds: [],
    activityType: "PEST_MONITORING",
    title: "Khảo sát rệp sáp và bệnh lá",
    description: "Ghi lại tỷ lệ cây có dấu hiệu bất thường.",
    scheduledStartAt: "2026-07-20T08:30:00.000Z",
    scheduledEndAt: "2026-07-20T10:00:00.000Z",
    recurrenceRule: null,
    priority: "MEDIUM",
    status: "SCHEDULED",
    assignedUserIds: ["mock-owner"],
    approvalRequired: false,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    version: 1,
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-10T08:00:00.000Z",
  },
];

function getFarms() {
  const farms = readJson<FarmOption[]>(FARM_STORAGE_KEY, defaultFarms);
  if (!canUseStorage() || farms.length) return farms;
  writeJson(FARM_STORAGE_KEY, defaultFarms);
  return defaultFarms;
}

function getZones() {
  const zones = readJson<CultivationZone[]>(ZONE_STORAGE_KEY, defaultZones);
  if (!canUseStorage() || zones.length) return zones;
  writeJson(ZONE_STORAGE_KEY, defaultZones);
  return defaultZones;
}

function saveZones(zones: CultivationZone[]) {
  writeJson(ZONE_STORAGE_KEY, zones);
}

function getPlans() {
  const plans = readJson<CultivationPlan[]>(PLAN_STORAGE_KEY, defaultPlans);
  if (!canUseStorage() || plans.length) return plans;
  writeJson(PLAN_STORAGE_KEY, defaultPlans);
  return defaultPlans;
}

function savePlans(plans: CultivationPlan[]) {
  writeJson(PLAN_STORAGE_KEY, plans);
}

function getActivities() {
  const activities = readJson<CultivationActivity[]>(ACTIVITY_STORAGE_KEY, defaultActivities);
  if (!canUseStorage() || activities.length) return activities;
  writeJson(ACTIVITY_STORAGE_KEY, defaultActivities);
  return defaultActivities;
}

function saveActivities(activities: CultivationActivity[]) {
  writeJson(ACTIVITY_STORAGE_KEY, activities);
}

function emptyDashboard(): Omit<CultivationDashboardData, "plans" | "activities"> {
  return {
    inputs: [] as AgriculturalInput[],
    residueStandards: [],
    labSamples: [],
    harvestBatches: [],
    exportReleases: [],
  };
}

export const cultivationMockClient = {
  listFarms: async () => getFarms(),
  listCultivationZones: async (query?: { farmId?: string; status?: string; search?: string }) => {
    const keyword = query?.search?.trim().toLowerCase();
    return getZones().filter((zone) => {
      const matchesFarm = !query?.farmId || zone.farmId === query.farmId;
      const matchesStatus = !query?.status || zone.status === query.status;
      const matchesSearch =
        !keyword ||
        [zone.name, zone.variety, zone.notes, zone.locationDescription]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      return matchesFarm && matchesStatus && matchesSearch;
    });
  },
  createCultivationZone: async (body: CultivationZoneRequest) => {
    const zones = getZones();
    const created: CultivationZone = {
      ...body,
      id: createId("mock-zone"),
      code: `ZONE-${String(zones.length + 1).padStart(3, "0")}`,
      harvestHistories: body.harvestHistories ?? [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    saveZones([created, ...zones]);
    return created;
  },
  getCultivationZone: async (id: string) => {
    const zone = getZones().find((item) => item.id === id);
    if (!zone) throw new Error("Không tìm thấy khu canh tác trong dữ liệu mock.");
    return zone;
  },
  updateCultivationZone: async (id: string, body: CultivationZoneRequest) => {
    const zones = getZones();
    const current = zones.find((item) => item.id === id);
    if (!current) throw new Error("Không tìm thấy khu canh tác trong dữ liệu mock.");
    const updated: CultivationZone = {
      ...current,
      ...body,
      harvestHistories: body.harvestHistories ?? [],
      updatedAt: nowIso(),
    };
    saveZones(zones.map((item) => (item.id === id ? updated : item)));
    return updated;
  },
  deleteCultivationZone: async (id: string) => {
    const zones = getZones();
    saveZones(zones.filter((item) => item.id !== id));
  },
  listPlans: async (query?: { farmId?: string; plotId?: string; cultivationSeasonId?: string }) =>
    getPlans().filter(
      (plan) =>
        (!query?.farmId || plan.farmId === query.farmId) &&
        (!query?.plotId || plan.plotId === query.plotId) &&
        (!query?.cultivationSeasonId || plan.cultivationSeasonId === query.cultivationSeasonId),
    ),
  createPlan: async (body: Partial<CultivationPlan>) => {
    const plans = getPlans();
    const created: CultivationPlan = {
      id: createId("mock-plan"),
      farmId: body.farmId ?? "mock-farm-main",
      plotId: body.plotId ?? "mock-zone-east",
      cultivationSeasonId: body.cultivationSeasonId ?? createId("mock-season"),
      templateId: body.templateId ?? null,
      name: body.name ?? "Kế hoạch chăm sóc mới",
      startDate: body.startDate ?? new Date().toISOString().slice(0, 10),
      expectedHarvestDate: body.expectedHarvestDate ?? null,
      targetMarketCodes: body.targetMarketCodes ?? ["VN"],
      status: body.status ?? "ACTIVE",
      createdBy: body.createdBy ?? "mock-owner",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    savePlans([created, ...plans]);
    return created;
  },
  listActivities: async (query?: { cultivationSeasonId?: string; activityType?: string; status?: string }) =>
    getActivities().filter(
      (activity) =>
        (!query?.cultivationSeasonId || activity.cultivationSeasonId === query.cultivationSeasonId) &&
        (!query?.activityType || activity.activityType === query.activityType) &&
        (!query?.status || activity.status === query.status),
    ),
  createActivity: async (body: Record<string, unknown>) => {
    const activities = getActivities();
    const created: CultivationActivity = {
      id: createId("mock-activity"),
      cultivationPlanId: String(body.cultivationPlanId ?? "mock-plan-2026"),
      cultivationSeasonId: String(body.cultivationSeasonId ?? "mock-season-2026"),
      farmId: String(body.farmId ?? "mock-farm-main"),
      plotId: String(body.plotId ?? "mock-zone-east"),
      treeIds: [],
      activityType: String(body.activityType ?? "IRRIGATION") as CultivationActivity["activityType"],
      title: String(body.title ?? "Công việc chăm sóc"),
      description: body.description == null ? null : String(body.description),
      scheduledStartAt: String(body.scheduledStartAt ?? nowIso()),
      scheduledEndAt: body.scheduledEndAt == null ? null : String(body.scheduledEndAt),
      recurrenceRule: null,
      priority: "MEDIUM",
      status: body.approvalRequired ? "PENDING_APPROVAL" : "SCHEDULED",
      assignedUserIds: Array.isArray(body.assignedUserIds) ? body.assignedUserIds.map(String) : [],
      approvalRequired: Boolean(body.approvalRequired),
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    saveActivities([created, ...activities]);
    return created;
  },
  updateActivityStatus: async (id: string, status: CultivationActivity["status"]) => {
    const activities = getActivities();
    const updated = activities.map((activity) => (activity.id === id ? { ...activity, status, updatedAt: nowIso() } : activity));
    saveActivities(updated);
    const activity = updated.find((item) => item.id === id);
    if (!activity) throw new Error("Không tìm thấy công việc chăm sóc trong dữ liệu mock.");
    return activity;
  },
  completeActivity: async (id: string) => {
    const activity = await cultivationMockClient.updateActivityStatus(id, "COMPLETED");
    return { activity, execution: { id: createId("mock-execution"), completedAt: nowIso() }, inputUsages: [] };
  },
  careHistory: async (seasonId: string): Promise<CareHistoryResponse> => ({
    activities: getActivities().filter((activity) => activity.cultivationSeasonId === seasonId && activity.status === "COMPLETED"),
    executions: [],
    inputUsages: [],
  }),
  dashboard: async (): Promise<CultivationDashboardData> => ({
    plans: getPlans(),
    activities: getActivities(),
    ...emptyDashboard(),
  }),
};
