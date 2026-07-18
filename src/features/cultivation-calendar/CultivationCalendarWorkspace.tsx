"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Beaker,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Eye,
  FlaskConical,
  History,
  Leaf,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  UserCheck,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cultivationClient, CultivationApiError } from "@/lib/cultivation/client";
import type {
  ActivityStatus,
  ActivityType,
  AgriculturalInput,
  BiologicalLevel,
  ComplianceAssessment,
  CultivationActivity,
  CultivationDashboardData,
  CultivationPlan,
  HarvestBatch,
  LabSample,
  ResidueStandard,
} from "@/lib/cultivation/types";
import {
  activityStatusLabels,
  activityTypeLabels,
  badgeClass,
  biologicalLevelLabels,
  formatDate,
  formatDateTime,
  labResultLabels,
  riskLevelLabels,
} from "./labels";
import { hasCultivationPermission } from "./permissions";

type ViewKey =
  | "today"
  | "calendar"
  | "activities"
  | "history"
  | "safety"
  | "plans"
  | "inputs"
  | "approvals"
  | "residue"
  | "lab";

type WorkspaceProps = {
  initialView?: ViewKey | "dashboard" | "compliance";
};

type ContextSelection = {
  farmId: string;
  plotId: string;
  seasonId: string;
};

type Option = {
  id: string;
  label: string;
  hint?: string;
};

type ActivityWithPlanning = CultivationActivity & {
  plannedInputIds?: string[];
  agriculturalInputIds?: string[];
  inputIds?: string[];
  plannedInputs?: AgriculturalInput[];
};

const mainViews: Array<{ key: ViewKey; label: string; icon: typeof CalendarDays }> = [
  { key: "today", label: "Hôm nay", icon: CalendarDays },
  { key: "calendar", label: "Lịch chăm sóc", icon: CalendarDays },
  { key: "activities", label: "Công việc", icon: Sprout },
  { key: "history", label: "Nhật ký", icon: History },
  { key: "safety", label: "An toàn thu hoạch", icon: ShieldCheck },
];

const advancedViews: Array<{ key: ViewKey; label: string; icon: typeof CalendarDays; permission?: string }> = [
  { key: "plans", label: "Kế hoạch mùa vụ", icon: ClipboardCheck, permission: "CULTIVATION_PLAN_MANAGE" },
  { key: "approvals", label: "Phê duyệt", icon: ShieldAlert, permission: "CHEMICAL_APPLICATION_APPROVE" },
  { key: "inputs", label: "Vật tư", icon: Leaf, permission: "RESIDUE_STANDARD_MANAGE" },
  { key: "residue", label: "Giới hạn dư lượng", icon: Beaker, permission: "RESIDUE_STANDARD_MANAGE" },
  { key: "lab", label: "Kiểm nghiệm", icon: FlaskConical, permission: "LAB_RESULT_MANAGE" },
];
type AdvancedViewItem = (typeof advancedViews)[number];

const activityTypes = Object.keys(activityTypeLabels) as ActivityType[];
const chemicalLevels: BiologicalLevel[] = ["CHEMICAL", "RESTRICTED_CHEMICAL", "PROHIBITED"];
const markets = ["VN", "EU", "CN", "JP", "KR"];

const inputClass =
  "h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-[15px] font-semibold text-neutral-950 outline-none transition focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414] disabled:bg-neutral-100 disabled:text-neutral-500";

function normalizeInitialView(initialView: WorkspaceProps["initialView"]): ViewKey {
  if (initialView === "dashboard") return "today";
  if (initialView === "compliance") return "safety";
  return initialView ?? "today";
}

function isToday(value: string) {
  return toDateKey(value) === toLocalDateKey(new Date());
}

function isOverdue(activity: CultivationActivity) {
  if (isClosedActivity(activity)) return false;
  const target = new Date(activity.scheduledStartAt);
  return !Number.isNaN(target.getTime()) && target.getTime() < Date.now();
}

function getEffectiveActivityStatus(activity: CultivationActivity): ActivityStatus {
  return isOverdue(activity) ? "OVERDUE" : activity.status;
}

function isActiveActivity(activity: CultivationActivity) {
  return !["COMPLETED", "CANCELLED", "SKIPPED"].includes(activity.status);
}

function isClosedActivity(activity: CultivationActivity) {
  return ["COMPLETED", "CANCELLED", "SKIPPED"].includes(activity.status);
}

function toInstant(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function seasonLabel(plan: CultivationPlan) {
  const year = plan.startDate ? new Date(plan.startDate).getFullYear() : "";
  return year ? `Vụ mùa ${year}` : "Vụ mùa đang theo dõi";
}

function createLabelMap(ids: string[], prefix: string) {
  return new Map(ids.map((id, index) => [id, `${prefix} ${index + 1}`]));
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function uniqueActivitiesById(items: CultivationActivity[]) {
  return Array.from(new Map(items.map((activity) => [activity.id, activity])).values());
}

function getPlannedInputIds(activity: CultivationActivity) {
  const planned = activity as ActivityWithPlanning;
  return unique([...(planned.plannedInputIds ?? []), ...(planned.agriculturalInputIds ?? []), ...(planned.inputIds ?? [])]);
}

function getPlannedInputNames(activity: CultivationActivity, inputs: AgriculturalInput[]) {
  const planned = activity as ActivityWithPlanning;
  const fromObjects = planned.plannedInputs?.map((input) => input.productName).filter(Boolean) ?? [];
  const fromIds = getPlannedInputIds(activity)
    .map((id) => inputs.find((input) => input.id === id)?.productName)
    .filter(Boolean) as string[];
  return unique([...fromObjects, ...fromIds]);
}

const procedureGuides: Record<ActivityType, { materials: string[]; steps: string[]; skill: string }> = {
  IRRIGATION: {
    materials: ["Nước tưới sạch", "Bộ kiểm tra ẩm đất", "Hệ thống tưới/béc tưới"],
    steps: ["Kiểm tra độ ẩm tầng rễ trước khi tưới.", "Tưới chậm quanh vùng tán, tránh đọng nước ở gốc.", "Ghi nhận khu vực thiếu nước hoặc rò rỉ đường ống."],
    skill: "Kỹ năng tưới theo nhu cầu cây: quan sát ẩm đất, chia lượng nước theo tuổi cây và thoát nước sau tưới.",
  },
  FERTILIZATION: {
    materials: ["Phân hữu cơ hoai mục", "Phân NPK/canxi-magie theo khuyến cáo", "Cuốc nhỏ hoặc dụng cụ rải phân"],
    steps: ["Rải phân theo mép tán, không gom sát gốc.", "Lấp nhẹ hoặc phủ hữu cơ để hạn chế bay hơi.", "Tưới đủ ẩm sau khi bón và ghi lượng đã dùng."],
    skill: "Quy trình bón phân chuẩn: đúng loại, đúng liều, đúng vị trí mép tán và có tưới giữ ẩm sau bón.",
  },
  FERTIGATION: {
    materials: ["Dung dịch phân hòa tan", "Bồn pha", "Bộ lọc hệ thống tưới"],
    steps: ["Kiểm tra lọc và áp lực tưới trước khi châm phân.", "Pha đúng nồng độ, khuấy đều trước khi đưa vào hệ thống.", "Xả nước sạch cuối chu kỳ để tránh nghẹt ống."],
    skill: "Kỹ năng châm phân qua tưới: kiểm soát nồng độ, áp lực và vệ sinh hệ thống sau khi hoàn tất.",
  },
  BIOLOGICAL_TREATMENT: {
    materials: ["Chế phẩm sinh học phù hợp", "Bình phun sạch", "Nước sạch không lẫn hóa chất"],
    steps: ["Pha chế phẩm theo nhãn, tránh nắng gắt.", "Phun phủ đều mặt lá/thân/vùng cần xử lý.", "Theo dõi sau 3-5 ngày và ghi nhận hiệu quả."],
    skill: "Quy trình dùng chế phẩm sinh học: bảo vệ vi sinh vật có lợi bằng cách pha đúng, phun mát trời và không trộn tùy tiện.",
  },
  CHEMICAL_TREATMENT: {
    materials: ["Thuốc BVTV được phép sử dụng", "Đồ bảo hộ", "Bình phun có béc phù hợp"],
    steps: ["Đọc nhãn thuốc, kiểm tra thời gian cách ly và thị trường mục tiêu.", "Mang đủ bảo hộ, pha đúng liều, không phun ngược gió.", "Ghi tên thuốc, liều lượng, lô thuốc và thời điểm phun."],
    skill: "An toàn phun thuốc chuẩn: đúng thuốc, đúng liều, đủ bảo hộ, tuân thủ cách ly và ghi nhật ký truy xuất.",
  },
  PEST_MONITORING: {
    materials: ["Sổ/điện thoại ghi nhận", "Kính lúp", "Bẫy/phiếu khảo sát"],
    steps: ["Đi theo tuyến cố định trong vườn.", "Kiểm tra mặt dưới lá, chồi non, trái và thân.", "Chụp ảnh, ghi tỷ lệ cây bị hại và khoanh vùng xử lý."],
    skill: "Kỹ năng khảo sát sâu hại: quan sát có mẫu, ghi vị trí rõ ràng và chỉ xử lý khi vượt ngưỡng.",
  },
  DISEASE_MONITORING: {
    materials: ["Điện thoại chụp ảnh", "Sổ ghi bệnh", "Túi lấy mẫu nếu cần"],
    steps: ["Quan sát lá, thân, rễ nổi và trái theo từng khu.", "Phân biệt dấu hiệu bệnh mới và vết cũ.", "Cách ly mẫu nghi ngờ và báo kỹ sư nếu lan nhanh."],
    skill: "Kỹ năng nhận diện bệnh: ghi triệu chứng, điều kiện thời tiết và tốc độ lây lan trước khi quyết định xử lý.",
  },
  PRUNING: {
    materials: ["Kéo/cưa cắt cành", "Dung dịch khử trùng dụng cụ", "Keo liền sẹo nếu cần"],
    steps: ["Khử trùng dụng cụ trước khi cắt.", "Cắt cành sâu bệnh, cành khuất tán, cành giao nhau.", "Thu gom cành bệnh ra khỏi vườn sau khi cắt."],
    skill: "Quy trình tỉa cành chuẩn: tán thông thoáng, vết cắt gọn và vệ sinh dụng cụ để hạn chế lây bệnh.",
  },
  ORCHARD_SANITATION: {
    materials: ["Bao thu gom", "Dụng cụ vệ sinh vườn", "Vôi/men xử lý hữu cơ nếu có"],
    steps: ["Thu gom lá, trái rụng và tàn dư bệnh.", "Dọn cỏ quanh gốc vừa đủ, giữ phủ hữu cơ có kiểm soát.", "Đưa rác bệnh ra khỏi khu sản xuất."],
    skill: "Vệ sinh vườn theo GAP: giảm nguồn bệnh, giữ vườn thông thoáng và quản lý tàn dư đúng cách.",
  },
  WEED_CONTROL: {
    materials: ["Máy cắt cỏ/dụng cụ làm cỏ", "Vật liệu phủ gốc", "Đồ bảo hộ"],
    steps: ["Cắt cỏ thấp vừa phải, tránh làm trầy gốc.", "Giữ vùng gốc thông thoáng nhưng không để đất trống quá mức.", "Không dùng thuốc cỏ gần rễ non nếu không có hướng dẫn."],
    skill: "Kỹ năng quản lý cỏ: kiểm soát cạnh tranh dinh dưỡng nhưng vẫn giữ phủ đất chống xói mòn.",
  },
  SOIL_IMPROVEMENT: {
    materials: ["Phân hữu cơ", "Vôi/dolomite theo kết quả đất", "Chế phẩm cải tạo đất"],
    steps: ["Kiểm tra pH hoặc dấu hiệu chai đất.", "Bón vật liệu cải tạo theo vùng rễ hoạt động.", "Tưới ẩm và theo dõi phản ứng cây sau xử lý."],
    skill: "Quy trình cải tạo đất: dựa trên pH, hữu cơ và thoát nước, không bón vôi sát thời điểm bón phân hóa học.",
  },
  POLLINATION: {
    materials: ["Cọ thụ phấn", "Túi/nhãn đánh dấu hoa", "Đèn đội đầu nếu làm chiều tối"],
    steps: ["Chọn hoa khỏe, đúng thời điểm nở.", "Thụ phấn nhẹ, tránh làm rụng hoa.", "Đánh dấu chùm đã thụ phấn để theo dõi đậu trái."],
    skill: "Kỹ năng thụ phấn sầu riêng: chọn thời điểm hoa nhận phấn tốt và thao tác nhẹ để tăng tỷ lệ đậu.",
  },
  FRUIT_BAGGING: {
    materials: ["Túi bao trái", "Dây buộc mềm", "Kéo tỉa trái lỗi"],
    steps: ["Chọn trái khỏe, không sâu bệnh trước khi bao.", "Bao thoáng, không siết cuống.", "Kiểm tra lại sau mưa hoặc gió mạnh."],
    skill: "Quy trình bao trái: chọn đúng trái, bao đúng độ thoáng và kiểm tra định kỳ để giảm sâu bệnh.",
  },
  SOIL_SAMPLING: {
    materials: ["Khoan/xẻng lấy mẫu", "Túi mẫu sạch", "Nhãn mẫu"],
    steps: ["Lấy mẫu nhiều điểm theo đường chéo khu vườn.", "Trộn đều mẫu đại diện, loại bỏ rác hữu cơ lớn.", "Ghi mã khu, ngày lấy và gửi phòng kiểm nghiệm."],
    skill: "Kỹ năng lấy mẫu đất: mẫu đại diện quyết định độ tin cậy của khuyến cáo phân bón.",
  },
  WATER_SAMPLING: {
    materials: ["Chai mẫu sạch", "Nhãn mẫu", "Thùng giữ mát nếu cần"],
    steps: ["Xả nước vài phút trước khi lấy mẫu.", "Không chạm tay vào miệng chai/nắp.", "Gửi mẫu sớm và ghi nguồn nước rõ ràng."],
    skill: "Kỹ năng lấy mẫu nước: tránh nhiễm chéo và ghi đúng nguồn để đánh giá rủi ro tưới.",
  },
  LEAF_SAMPLING: {
    materials: ["Kéo sạch", "Túi giấy/túi mẫu", "Nhãn mẫu"],
    steps: ["Chọn lá đúng tầng tán theo hướng dẫn.", "Không lấy lá quá non, quá già hoặc lá bệnh nặng.", "Ghi giống, tuổi cây, khu vực và ngày lấy mẫu."],
    skill: "Kỹ năng lấy mẫu lá: chọn đúng lá đại diện để đọc tình trạng dinh dưỡng chính xác.",
  },
  FRUIT_SAMPLING: {
    materials: ["Dao/kéo sạch", "Túi mẫu", "Nhãn truy xuất"],
    steps: ["Chọn trái đại diện theo lô/khu.", "Tránh làm nhiễm bẩn mẫu trong quá trình cắt.", "Ghi mã lô, ngày lấy và người lấy mẫu."],
    skill: "Kỹ năng lấy mẫu trái: đảm bảo mẫu đại diện và giữ chuỗi truy xuất cho kiểm nghiệm dư lượng.",
  },
  HARVEST: {
    materials: ["Dao/kéo thu hoạch", "Bao tay", "Sọt/thùng lót mềm"],
    steps: ["Kiểm tra độ già, mã lô và điều kiện cách ly.", "Cắt cuống đúng kỹ thuật, tránh rơi va đập.", "Phân loại sơ bộ và ghi sản lượng theo khu."],
    skill: "Quy trình thu hoạch chuẩn: xác nhận an toàn cách ly, thao tác nhẹ và ghi lô để truy xuất.",
  },
  OTHER: {
    materials: ["Dụng cụ phù hợp công việc", "Sổ/điện thoại ghi nhật ký", "Đồ bảo hộ nếu cần"],
    steps: ["Đọc mô tả công việc và chuẩn bị dụng cụ.", "Thực hiện theo hướng dẫn kỹ thuật của quản lý/kỹ sư.", "Ghi kết quả, ảnh minh chứng và vấn đề phát sinh."],
    skill: "Kỹ năng làm việc theo nhật ký: chuẩn bị, thực hiện, ghi nhận và báo cáo bất thường kịp thời.",
  },
};

function Pill({ children, kind }: { children: React.ReactNode; kind: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${badgeClass(kind as never)}`}>
      {children}
    </span>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-neutral-700">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs font-medium text-neutral-500">{hint}</span> : null}
    </label>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
      <span className="block text-xs font-bold uppercase tracking-[0.08em] text-neutral-500">{label}</span>
      <b className="mt-1 block text-lg text-neutral-950">{value}</b>
    </div>
  );
}

function EmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
  icon: Icon = Leaf,
}: {
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  icon?: typeof Leaf;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/75 p-5 text-center">
      <Icon className="mx-auto text-neutral-300" size={24} />
      <b className="mt-3 block text-sm text-neutral-800">{title}</b>
      {description ? <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-neutral-500">{description}</p> : null}
      {primaryAction || secondaryAction ? <div className="mt-4 flex flex-wrap justify-center gap-2">{primaryAction}{secondaryAction}</div> : null}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>
          <b className="block text-sm text-red-800">Không thể tải dữ liệu</b>
          <span className="mt-1 block text-xs font-medium text-red-700">{message}</span>
        </span>
        <button type="button" onClick={onRetry} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-red-700 ring-1 ring-red-200">
          <RefreshCw size={14} />
          Thử lại
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <span>
          <h2 className="text-base font-bold text-neutral-900">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p> : null}
        </span>
        {action}
      </div>
      {children}
    </section>
  );
}

function Drawer({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="h-full w-full overflow-y-auto bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
          <button type="button" onClick={onClose} className="inline-flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CultivationCalendarWorkspace({ initialView = "today" }: WorkspaceProps) {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<ViewKey>(normalizeInitialView(initialView));
  const [data, setData] = useState<CultivationDashboardData>({
    plans: [],
    activities: [],
    inputs: [],
    residueStandards: [],
    labSamples: [],
    harvestBatches: [],
    exportReleases: [],
  });
  const [careHistory, setCareHistory] = useState<CultivationActivity[]>([]);
  const [compliance, setCompliance] = useState<ComplianceAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [calendarMode, setCalendarMode] = useState<"month" | "week" | "day" | "list">("week");
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [selectedMarket, setSelectedMarket] = useState("EU");
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");
  const [context, setContext] = useState<ContextSelection>({ farmId: "", plotId: "", seasonId: "" });

  const canView = hasCultivationPermission(user?.role, "CULTIVATION_PLAN_VIEW");
  const canManagePlan = hasCultivationPermission(user?.role, "CULTIVATION_PLAN_MANAGE");
  const canExecute = hasCultivationPermission(user?.role, "CULTIVATION_ACTIVITY_EXECUTE");
  const canApproveChemical = hasCultivationPermission(user?.role, "CHEMICAL_APPLICATION_APPROVE");
  const canManageResidue = hasCultivationPermission(user?.role, "RESIDUE_STANDARD_MANAGE");
  const canManageLab = hasCultivationPermission(user?.role, "LAB_RESULT_MANAGE");

  const actorId = user?.userId ?? "";

  const contextOptions = useMemo(() => buildContextOptions(data), [data]);
  const farmMap = useMemo(() => new Map(contextOptions.farms.map((item) => [item.id, item.label])), [contextOptions.farms]);
  const plotMap = useMemo(() => new Map(contextOptions.plots.map((item) => [item.id, item.label])), [contextOptions.plots]);
  const seasonMap = useMemo(() => new Map(contextOptions.seasons.map((item) => [item.id, item.label])), [contextOptions.seasons]);

  const selectedPlans = useMemo(
    () =>
      data.plans.filter(
        (plan) =>
          (!context.farmId || plan.farmId === context.farmId) &&
          (!context.plotId || plan.plotId === context.plotId) &&
          (!context.seasonId || plan.cultivationSeasonId === context.seasonId),
      ),
    [context, data.plans],
  );
  const selectedActivities = useMemo(
    () =>
      data.activities.filter(
        (activity) =>
          (!context.farmId || activity.farmId === context.farmId) &&
          (!context.plotId || activity.plotId === context.plotId) &&
          (!context.seasonId || activity.cultivationSeasonId === context.seasonId),
      ),
    [context, data.activities],
  );
  const selectedBatches = useMemo(
    () =>
      data.harvestBatches.filter(
        (batch) =>
          (!context.farmId || batch.farmId === context.farmId) &&
          (!context.plotId || batch.plotId === context.plotId) &&
          (!context.seasonId || batch.cultivationSeasonId === context.seasonId),
      ),
    [context, data.harvestBatches],
  );
  const selectedSamples = useMemo(
    () => data.labSamples.filter((sample) => !context.seasonId || sample.cultivationSeasonId === context.seasonId),
    [context.seasonId, data.labSamples],
  );
  const metrics = useMemo(() => {
    const today = selectedActivities.filter((activity) => isToday(activity.scheduledStartAt));
    const overdue = selectedActivities.filter(
      (activity) => getEffectiveActivityStatus(activity) === "OVERDUE",
    );
    const pending = selectedActivities.filter((activity) => activity.status === "PENDING_APPROVAL");
    const inProgress = selectedActivities.filter((activity) => activity.status === "IN_PROGRESS");
    const completed = selectedActivities.filter((activity) => activity.status === "COMPLETED");
    const chemical = selectedActivities.filter((activity) => activity.activityType === "CHEMICAL_TREATMENT");
    const pendingLab = selectedSamples.filter((sample) => sample.status !== "RESULT_RECORDED");
    return { today, overdue, pending, inProgress, completed, chemical, pendingLab };
  }, [selectedActivities, selectedSamples]);
  const historyActivities = useMemo(
    () =>
      (careHistory.length ? careHistory : selectedActivities)
        .filter(isClosedActivity)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [careHistory, selectedActivities],
  );

  const visibleAdvancedViews = advancedViews.filter((item) => !item.permission || hasCultivationPermission(user?.role, item.permission as never));

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await cultivationClient.dashboard();
      setData(next);
      setLastSyncedAt(new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
      const nextOptions = buildContextOptions(next);
      setContext((current) => reconcileContext(current, nextOptions));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải dữ liệu lịch canh tác.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && canView) void refresh();
  }, [authLoading, canView]);

  useEffect(() => {
    if (!context.seasonId) {
      setCareHistory([]);
      return;
    }
    cultivationClient
      .careHistory(context.seasonId)
      .then((history) => setCareHistory(history.activities))
      .catch(() => setCareHistory([]));
  }, [context.seasonId]);

  const mutate = async (action: () => Promise<unknown>, success: string, after?: () => void) => {
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      after?.();
      await refresh();
    } catch (caught) {
      const message =
        caught instanceof CultivationApiError || caught instanceof Error
          ? caught.message
          : "Không thể thực hiện thao tác.";
      setError(message);
    }
  };

  const handleActivityStatusChange = (id: string, action: "start" | "complete" | "skip" | "cancel") => {
    const actionMap = {
      start: () => cultivationClient.startActivity(id),
      complete: () =>
        cultivationClient.completeActivity(id, {
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          executedBy: actorId,
          actualTreeCount: 0,
          actualArea: 0,
          weatherSnapshot: {},
          evidenceFiles: [],
          inputUsages: [],
        }),
      skip: () => cultivationClient.skipActivity(id),
      cancel: () => cultivationClient.cancelActivity(id),
    };
    const successMap = {
      start: "Đã chuyển công việc sang đang làm.",
      complete: "Đã cập nhật công việc hoàn thành.",
      skip: "Đã hoãn công việc.",
      cancel: "Đã hủy công việc.",
    };
    void mutate(actionMap[action], successMap[action]);
  };

  if (authLoading) return <LoadingPanel />;

  if (!canView) {
    return (
      <Section title="Không có quyền truy cập" description="Tài khoản hiện tại chưa có quyền xem module lịch canh tác.">
        <Pill kind="BLOCKED">403</Pill>
      </Section>
    );
  }

  return (
    <div className="space-y-4">
      <Hero
        context={context}
        farmLabel={farmMap.get(context.farmId)}
        plotLabel={plotMap.get(context.plotId)}
        seasonLabel={seasonMap.get(context.seasonId)}
        loading={loading}
        lastSyncedAt={lastSyncedAt}
        onRefresh={refresh}
      />

      <ContextBar
        context={context}
        options={contextOptions}
        onChange={(next) => {
          setContext(next);
          setCompliance(null);
          setSelectedActivityId("");
        }}
      />

      <Navigation
        view={view}
        onViewChange={setView}
        advancedViews={visibleAdvancedViews}
      />

      {error ? <ErrorState message={error} onRetry={refresh} /> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div> : null}
      {loading ? <LoadingPanel /> : null}

      {!loading && view === "today" ? (
        <TodayTasksView
          metrics={metrics}
          inputs={data.inputs}
          contextReady={Boolean(context.seasonId)}
          canExecute={canExecute}
          plotLabel={(id) => plotMap.get(id) ?? "Khu canh tác"}
          onCreate={() => setView("activities")}
          onStatusChange={handleActivityStatusChange}
        />
      ) : null}
      {!loading && view === "calendar" ? (
        <CalendarWeekView
          activities={selectedActivities}
          mode={calendarMode}
          onModeChange={setCalendarMode}
          selectedActivityId={selectedActivityId}
          onSelectActivity={setSelectedActivityId}
          plotLabel={(id) => plotMap.get(id) ?? "Khu canh tác"}
          actorLabel={user?.profile.fullName ?? "Người thực hiện"}
          canExecute={canExecute}
          onCreate={() => setView("activities")}
          onStatusChange={(id, action) => {
            const actionMap = {
              start: () => cultivationClient.startActivity(id),
              complete: () =>
                cultivationClient.completeActivity(id, {
                  startedAt: new Date().toISOString(),
                  completedAt: new Date().toISOString(),
                  executedBy: actorId,
                  actualTreeCount: 0,
                  actualArea: 0,
                  weatherSnapshot: {},
                  evidenceFiles: [],
                  inputUsages: [],
                }),
              skip: () => cultivationClient.skipActivity(id),
              cancel: () => cultivationClient.cancelActivity(id),
            };
            const successMap = {
              start: "Đã chuyển công việc sang đang làm.",
              complete: "Đã cập nhật công việc hoàn thành.",
              skip: "Đã hoãn công việc.",
              cancel: "Đã hủy công việc.",
            };
            void mutate(actionMap[action], successMap[action]);
          }}
        />
      ) : null}
      {!loading && view === "plans" ? (
        <PlanView
          plans={selectedPlans}
          context={context}
          options={contextOptions}
          canManage={canManagePlan}
          actorId={actorId}
          plotLabel={(id) => plotMap.get(id) ?? "Khu canh tác"}
          onCreate={(body, done) => mutate(() => cultivationClient.createPlan(body), "Đã tạo kế hoạch mùa vụ.", done)}
        />
      ) : null}
      {!loading && view === "activities" ? (
        <ActivityView
          activities={selectedActivities}
          plans={selectedPlans}
          inputs={data.inputs}
          canExecute={canExecute}
          actorId={actorId}
          actorName={user?.profile.fullName ?? "Tài khoản hiện tại"}
          plotLabel={(id) => plotMap.get(id) ?? "Khu canh tác"}
          onCreate={(body, done) => mutate(() => cultivationClient.createActivity(body), "Đã tạo công việc chăm sóc.", done)}
          onComplete={(id, body) => mutate(() => cultivationClient.completeActivity(id, body), "Đã ghi nhật ký thực hiện.")}
        />
      ) : null}
      {!loading && view === "approvals" ? (
        <ApprovalView
          activities={selectedActivities.filter((item) => item.status === "PENDING_APPROVAL")}
          canApprove={canApproveChemical}
          actorId={actorId}
          plotLabel={(id) => plotMap.get(id) ?? "Khu canh tác"}
          onApprove={(id) => mutate(() => cultivationClient.approveActivity(id, actorId), "Đã phê duyệt công việc.")}
          onReject={(id, reason) => mutate(() => cultivationClient.rejectActivity(id, actorId, reason), "Đã từ chối công việc.")}
        />
      ) : null}
      {!loading && view === "history" ? (
        <HistoryView activities={historyActivities} plotLabel={(id) => plotMap.get(id) ?? "Khu canh tác"} />
      ) : null}
      {!loading && view === "inputs" ? (
        <InputView
          inputs={data.inputs}
          canManage={canManageResidue}
          onCreate={(body, done) => mutate(() => cultivationClient.createAgriculturalInput(body), "Đã thêm vật tư nông nghiệp.", done)}
        />
      ) : null}
      {!loading && view === "residue" ? (
        <ResidueView
          standards={data.residueStandards}
          canManage={canManageResidue}
          onCreate={(body, done) => mutate(() => cultivationClient.createResidueStandard(body), "Đã tạo giới hạn dư lượng.", done)}
        />
      ) : null}
      {!loading && view === "lab" ? (
        <LabView
          samples={selectedSamples}
          batches={selectedBatches}
          context={context}
          canManage={canManageLab}
          actorId={actorId}
          seasonLabel={seasonMap.get(context.seasonId) ?? "Vụ mùa"}
          onCreateSample={(body, done) => mutate(() => cultivationClient.createLabSample(body), "Đã tạo đề nghị lấy mẫu.", done)}
        />
      ) : null}
      {!loading && view === "safety" ? (
        <SafetyView
          seasonId={context.seasonId}
          market={selectedMarket}
          batches={selectedBatches}
          assessment={compliance}
          onMarketChange={setSelectedMarket}
          onAssess={(harvestBatchId) =>
            mutate(async () => {
              const result = await cultivationClient.assessCompliance(context.seasonId, selectedMarket, harvestBatchId);
              setCompliance(result);
            }, "Đã đánh giá an toàn thu hoạch.")
          }
        />
      ) : null}

    </div>
  );
}

function buildContextOptions(data: CultivationDashboardData) {
  const farms = unique([
    ...data.plans.map((item) => item.farmId),
    ...data.activities.map((item) => item.farmId),
    ...data.harvestBatches.map((item) => item.farmId),
  ]);
  const plots = unique([
    ...data.plans.map((item) => item.plotId),
    ...data.activities.map((item) => item.plotId),
    ...data.harvestBatches.map((item) => item.plotId),
  ]);
  const seasons = unique([
    ...data.plans.map((item) => item.cultivationSeasonId),
    ...data.activities.map((item) => item.cultivationSeasonId),
    ...data.harvestBatches.map((item) => item.cultivationSeasonId),
    ...data.labSamples.map((item) => item.cultivationSeasonId),
  ]);
  const farmLabels = createLabelMap(farms, "Trang trại");
  const plotLabels = createLabelMap(plots, "Khu canh tác");
  const seasonLabels = new Map<string, string>();
  data.plans.forEach((plan) => {
    if (!seasonLabels.has(plan.cultivationSeasonId)) seasonLabels.set(plan.cultivationSeasonId, seasonLabel(plan));
  });
  seasons.forEach((season, index) => {
    if (!seasonLabels.has(season)) seasonLabels.set(season, `Vụ mùa ${index + 1}`);
  });

  return {
    farms: farms.map((id) => ({ id, label: farmLabels.get(id) ?? "Trang trại" })),
    plots: plots.map((id) => ({ id, label: plotLabels.get(id) ?? "Khu canh tác" })),
    seasons: seasons.map((id) => ({ id, label: seasonLabels.get(id) ?? "Vụ mùa" })),
  };
}

function reconcileContext(current: ContextSelection, options: ReturnType<typeof buildContextOptions>): ContextSelection {
  const farmId = options.farms.some((item) => item.id === current.farmId) ? current.farmId : options.farms[0]?.id ?? "";
  const plotId = options.plots.some((item) => item.id === current.plotId) ? current.plotId : options.plots[0]?.id ?? "";
  const seasonId = options.seasons.some((item) => item.id === current.seasonId) ? current.seasonId : options.seasons[0]?.id ?? "";
  return { farmId, plotId, seasonId };
}

function Hero({
  context,
  farmLabel,
  plotLabel,
  seasonLabel,
  loading,
  lastSyncedAt,
  onRefresh,
}: {
  context: ContextSelection;
  farmLabel?: string;
  plotLabel?: string;
  seasonLabel?: string;
  loading: boolean;
  lastSyncedAt: string;
  onRefresh: () => void;
}) {
  const contextText = [farmLabel, plotLabel, seasonLabel].filter(Boolean).join(" · ");
  return (
    <section className="grid-pattern overflow-hidden rounded-2xl bg-[#294f3b] px-4 py-3 text-white sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#EED56D]">
            <Leaf size={14} />
            Lịch chăm sóc
          </span>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Lịch chăm sóc vụ mùa</h1>
          <p className="mt-1 max-w-2xl text-[13px] font-medium leading-5 text-[#d0ddd4]">Lên lịch, ghi nhận chăm sóc và theo dõi điều kiện thu hoạch.</p>
        </div>
        <div className="flex flex-col gap-2 text-left lg:text-right">
          <span className="text-[13px] font-bold text-[#edf7ef]">{contextText || "Chưa có dữ liệu ngữ cảnh từ backend"}</span>
          <span className="text-xs font-medium text-[#c2d4c8]">{lastSyncedAt ? `Đồng bộ lúc ${lastSyncedAt}` : context.seasonId ? "Sẵn sàng đồng bộ" : "Chọn ngữ cảnh khi có dữ liệu"}</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-white/10 px-3 text-[13px] font-bold text-white ring-1 ring-white/20 transition hover:bg-white/15 disabled:opacity-60 lg:self-end"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Làm mới
          </button>
        </div>
      </div>
    </section>
  );
}

function ContextBar({
  context,
  options,
  onChange,
}: {
  context: ContextSelection;
  options: ReturnType<typeof buildContextOptions>;
  onChange: (context: ContextSelection) => void;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white px-3 py-2.5">
      <div className="grid gap-2.5 md:grid-cols-3">
        <ContextSelect
          label="Trang trại"
          value={context.farmId}
          options={options.farms}
          empty="Chưa có trang trại trong dữ liệu canh tác."
          onChange={(farmId) => onChange({ farmId, plotId: "", seasonId: "" })}
        />
        <ContextSelect
          label="Khu canh tác"
          value={context.plotId}
          options={options.plots}
          empty="Chưa có khu canh tác phù hợp."
          disabled={!context.farmId}
          onChange={(plotId) => onChange({ ...context, plotId, seasonId: "" })}
        />
        <ContextSelect
          label="Mùa vụ"
          value={context.seasonId}
          options={options.seasons}
          empty="Chưa có mùa vụ phù hợp."
          disabled={!context.plotId}
          onChange={(seasonId) => onChange({ ...context, seasonId })}
        />
      </div>
    </section>
  );
}

function ContextSelect({
  label,
  value,
  options,
  empty,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  empty: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} hint={!options.length ? empty : undefined}>
      <select className={inputClass} value={value} disabled={disabled || !options.length} onChange={(event) => onChange(event.target.value)}>
        <option value="">{disabled ? "Chọn mục phía trước" : "Chọn theo tên"}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Navigation({
  view,
  onViewChange,
  advancedViews,
}: {
  view: ViewKey;
  onViewChange: (view: ViewKey) => void;
  advancedViews: AdvancedViewItem[];
}) {
  const isAdvanced = advancedViews.some((item) => item.key === view);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:flex">
        {mainViews.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onViewChange(item.key)}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition ${
                view === item.key ? "bg-[#2E5A44] text-white" : "bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </div>
      {advancedViews.length ? (
        <label className="relative block lg:w-56">
          <span className="sr-only">Quản lý nâng cao</span>
          <select
            value={isAdvanced ? view : ""}
            onChange={(event) => event.target.value && onViewChange(event.target.value as ViewKey)}
            className="h-10 w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 pr-9 text-xs font-bold text-neutral-700 outline-none focus:border-[#2E5A44]"
          >
            <option value="">Quản lý nâng cao</option>
            {advancedViews.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 text-neutral-500" size={14} />
        </label>
      ) : null}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="panel p-5 text-center">
      <Loader2 className="mx-auto animate-spin text-[#2E5A44]" size={26} />
      <b className="mt-3 block text-sm text-neutral-700">Đang tải dữ liệu canh tác</b>
    </div>
  );
}

// Kept temporarily while the today tab uses the richer TodayTasksView.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TodayView({
  metrics,
  contextReady,
  onCreate,
}: {
  metrics: {
    today: CultivationActivity[];
    overdue: CultivationActivity[];
    pending: CultivationActivity[];
    inProgress: CultivationActivity[];
    completed: CultivationActivity[];
    chemical: CultivationActivity[];
    pendingLab: LabSample[];
  };
  contextReady: boolean;
  onCreate: () => void;
}) {
  const priorityActivities = uniqueActivitiesById([...metrics.overdue, ...metrics.today, ...metrics.inProgress]).slice(0, 8);
  return (
    <div className="grid gap-4">
      <Section
        title="Việc cần làm"
        description="Ưu tiên các việc hôm nay, việc quá hạn và yêu cầu đang chờ xử lý."
        action={
          <button type="button" onClick={onCreate} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2E5A44] px-3 text-xs font-bold text-white">
            <Plus size={14} />
            Tạo công việc
          </button>
        }
      >
        {priorityActivities.length ? (
          <div className="grid gap-3">
            {priorityActivities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title={contextReady ? "Không có việc cần làm trong ngữ cảnh này." : "Chưa có mùa vụ để hiển thị công việc."}
            description="Khi backend có kế hoạch hoặc công việc phù hợp, danh sách hôm nay sẽ xuất hiện tại đây."
            primaryAction={
              contextReady ? (
                <button type="button" onClick={onCreate} className="rounded-xl bg-[#2E5A44] px-3 py-2 text-xs font-bold text-white">
                  Lên lịch công việc
                </button>
              ) : null
            }
          />
        )}
      </Section>
    </div>
  );
}

function TodayTasksView({
  metrics,
  inputs,
  contextReady,
  canExecute,
  plotLabel,
  onCreate,
  onStatusChange,
}: {
  metrics: {
    today: CultivationActivity[];
    overdue: CultivationActivity[];
    pending: CultivationActivity[];
    inProgress: CultivationActivity[];
    completed: CultivationActivity[];
    chemical: CultivationActivity[];
    pendingLab: LabSample[];
  };
  inputs: AgriculturalInput[];
  contextReady: boolean;
  canExecute: boolean;
  plotLabel: (id: string) => string;
  onCreate: () => void;
  onStatusChange: (id: string, action: "complete") => void;
}) {
  const todayActivities = uniqueActivitiesById(metrics.today).sort((left, right) => left.scheduledStartAt.localeCompare(right.scheduledStartAt));

  return (
    <div className="grid gap-4">

      <Section
        title="Công việc hôm nay"
        description="Chỉ hiển thị các việc có lịch trong ngày hôm nay. Mỗi việc có vật tư cần chuẩn bị, quy trình tham khảo và nút cập nhật hoàn thành."
        action={
          <button type="button" onClick={onCreate} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2E5A44] px-3 text-xs font-bold text-white">
            <Plus size={14} />
            Tạo công việc
          </button>
        }
      >
        {todayActivities.length ? (
          <div className="grid gap-3">
            {todayActivities.map((activity) => (
              <TodayActivityCard
                key={activity.id}
                activity={activity}
                inputs={inputs}
                canExecute={canExecute}
                plotLabel={plotLabel(activity.plotId)}
                onComplete={() => onStatusChange(activity.id, "complete")}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title={contextReady ? "Hôm nay chưa có công việc trong khu/mùa vụ này." : "Chưa có mùa vụ để hiển thị công việc hôm nay."}
            description="Các việc quá hạn hoặc sắp tới vẫn nằm ở tab Lịch chăm sóc/Công việc; tab này chỉ giữ đúng lịch của ngày hôm nay."
            primaryAction={
              contextReady ? (
                <button type="button" onClick={onCreate} className="rounded-xl bg-[#2E5A44] px-3 py-2 text-xs font-bold text-white">
                  Lên lịch công việc
                </button>
              ) : null
            }
          />
        )}
      </Section>
    </div>
  );
}

function TodayActivityCard({
  activity,
  inputs,
  canExecute,
  plotLabel,
  onComplete,
}: {
  activity: CultivationActivity;
  inputs: AgriculturalInput[];
  canExecute: boolean;
  plotLabel: string;
  onComplete: () => void;
}) {
  const guide = procedureGuides[activity.activityType] ?? procedureGuides.OTHER;
  const plannedInputNames = getPlannedInputNames(activity, inputs);
  const materialNames = plannedInputNames.length ? plannedInputNames : guide.materials;
  const effectiveStatus = getEffectiveActivityStatus(activity);
  const completed = activity.status === "COMPLETED";
  const disabled = !canExecute || completed || ["CANCELLED", "SKIPPED", "PENDING_APPROVAL"].includes(activity.status);

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#eef6ef] px-2.5 py-1 text-xs font-extrabold text-[#2E5A44]">
              <Clock size={13} />
              {formatTime(activity.scheduledStartAt)}
            </span>
            <Pill kind={effectiveStatus}>{activityStatusLabels[effectiveStatus]}</Pill>
          </div>
          <h3 className="mt-3 text-base font-extrabold leading-6 text-neutral-950">{activity.title}</h3>
          <p className="mt-1 text-xs font-semibold text-neutral-500">
            {activityTypeLabels[activity.activityType]} · {plotLabel}
          </p>
          {activity.description ? <p className="mt-2 text-[13px] font-medium leading-5 text-neutral-600">{activity.description}</p> : null}
        </div>

        <button
          type="button"
          onClick={onComplete}
          disabled={disabled}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400"
        >
          <CheckCircle2 size={16} />
          {completed ? "Đã hoàn thành" : "Cập nhật hoàn thành"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
          <b className="text-xs text-neutral-800">Phân thuốc, vật tư cần chuẩn bị</b>
          <div className="mt-2 flex flex-wrap gap-2">
            {materialNames.map((name) => (
              <span key={name} className="rounded-full border border-[#d8e4da] bg-white px-2.5 py-1 text-xs font-bold text-[#2E5A44]">
                {name}
              </span>
            ))}
          </div>
          {!plannedInputNames.length ? <p className="mt-2 text-xs font-medium text-neutral-500">Gợi ý theo loại công việc vì lịch chưa gắn vật tư cụ thể.</p> : null}
        </div>

        <div className="rounded-xl border border-neutral-100 bg-[#fbfcfa] p-3">
          <b className="text-xs text-neutral-800">Quy trình chuẩn tham khảo</b>
          <ol className="mt-2 grid list-decimal gap-1.5 pl-4 text-xs font-medium leading-5 text-neutral-600">
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-3 rounded-lg bg-[#eef6ef] px-3 py-2 text-xs font-bold leading-5 text-[#2E5A44]">{guide.skill}</p>
        </div>
      </div>
    </article>
  );
}

function CalendarWeekView({
  activities,
  selectedActivityId,
  onSelectActivity,
  plotLabel,
  actorLabel,
  canExecute,
  onCreate,
  onStatusChange,
}: {
  activities: CultivationActivity[];
  mode: "month" | "week" | "day" | "list";
  onModeChange: (mode: "month" | "week" | "day" | "list") => void;
  selectedActivityId: string;
  onSelectActivity: (id: string) => void;
  plotLabel: (id: string) => string;
  actorLabel: string;
  canExecute: boolean;
  onCreate: () => void;
  onStatusChange: (id: string, action: "start" | "complete" | "skip" | "cancel") => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = getCurrentWeekDays(weekOffset);
  const weekRangeLabel = getWeekRangeLabel(weekDays);
  const activitiesByDate = new Map<string, CultivationActivity[]>();
  activities.forEach((activity) => {
    const key = toDateKey(activity.scheduledStartAt);
    activitiesByDate.set(key, [...(activitiesByDate.get(key) ?? []), activity]);
  });
  const weekActivities = weekDays.flatMap((day) => activitiesByDate.get(day.key) ?? []);
  const summaryActivities = [...(weekActivities.length ? weekActivities : activities)].sort((left, right) => right.scheduledStartAt.localeCompare(left.scheduledStartAt));

  return (
    <section className="panel p-3 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-neutral-950">Lịch chăm sóc trong tuần</h2>
          <p className="mt-1 text-[13px] font-medium leading-5 text-neutral-600">
            Theo dõi theo thứ, ngày và số ngày còn lại để kiểm soát việc chăm sóc đúng hạn.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="grid h-11 grid-cols-[40px_128px_40px] items-center rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setWeekOffset((current) => current - 1)}
              className="grid size-9 place-items-center rounded-lg text-[#2E5A44] transition hover:bg-[#eef6ef]"
              aria-label="Xem tuần trước"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="whitespace-nowrap px-2 text-center text-sm font-extrabold text-neutral-800">{weekRangeLabel}</span>
            <button
              type="button"
              onClick={() => setWeekOffset((current) => current + 1)}
              className="grid size-9 place-items-center rounded-lg text-[#2E5A44] transition hover:bg-[#eef6ef]"
              aria-label="Xem tuần sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-[15px] font-extrabold text-white shadow-sm transition hover:bg-[#244a37]"
          >
            <Plus size={18} />
            Thêm công việc
          </button>
        </div>
      </div>

      {activities.length ? (
        <>
          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <div className="grid min-w-[980px] grid-cols-7 gap-3">
              {weekDays.map((day) => {
                const dayActivities = (activitiesByDate.get(day.key) ?? []).sort((left, right) => left.scheduledStartAt.localeCompare(right.scheduledStartAt));
                return (
                  <div key={day.key} className={`min-h-[280px] rounded-2xl border p-3 ${day.isToday ? "border-[#2E5A44] bg-[#f2f8f3]" : "border-neutral-200 bg-white"}`}>
                    <div className="border-b border-neutral-100 pb-3 text-center">
                      <b className="block text-sm capitalize text-neutral-950">{day.weekday}</b>
                      <span className="mt-1 block text-xs font-bold text-neutral-500">{day.dateLabel}</span>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {dayActivities.length ? (
                        dayActivities.map((activity) => {
                          const effectiveStatus = getEffectiveActivityStatus(activity);
                          const closed = isClosedActivity(activity);
                          const dueTone = closed
                            ? getClosedTimelineToneClass(activity.status)
                            : getDueToneClass(activity.scheduledStartAt);
                          const timelineLabel = closed
                            ? activityStatusLabels[effectiveStatus]
                            : getDaysUntilText(activity.scheduledStartAt);

                          return (
                            <button
                              type="button"
                              key={activity.id}
                              onClick={() => onSelectActivity(activity.id)}
                              className={`rounded-xl border p-3 text-left transition ${
                                selectedActivityId === activity.id ? "border-[#2E5A44] bg-white shadow-sm" : "border-neutral-200 bg-neutral-50 hover:bg-white"
                              }`}
                            >
                              <span className="text-xs font-extrabold text-[#2E5A44]">{formatTime(activity.scheduledStartAt)}</span>
                              <b className="mt-2 block text-[13px] leading-5 text-neutral-950">{activity.title}</b>
                              <span className="mt-2 block text-xs font-bold text-neutral-500">{activityTypeLabels[activity.activityType]}</span>
                              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-neutral-500">
                                <MapPin size={13} />
                                {plotLabel(activity.plotId)}
                              </span>
                              <span className={`mt-2 block rounded-lg px-2 py-1 text-center text-xs font-extrabold ${dueTone}`}>{timelineLabel}</span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-neutral-200 px-3 text-center text-xs font-semibold text-neutral-400">
                          Không có việc
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <span>
                <h3 className="text-sm font-extrabold text-neutral-950">Tổng hợp công việc</h3>
                <p className="mt-1 text-xs font-medium text-neutral-500">{summaryActivities.length} công việc trong tuần đang chọn, sắp xếp mới nhất lên đầu.</p>
              </span>
              <span className="text-xs font-bold text-neutral-500">Người thực hiện: {actorLabel}</span>
            </div>
            <ActivitySummaryList
              activities={summaryActivities}
              canExecute={canExecute}
              selectedActivityId={selectedActivityId}
              onSelectActivity={onSelectActivity}
              onStatusChange={onStatusChange}
              plotLabel={plotLabel}
            />
          </div>
        </>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="Chưa có công việc trong lịch chăm sóc."
          description="Lên lịch một công việc mới hoặc tạo từ kế hoạch mùa vụ khi backend đã có dữ liệu ngữ cảnh."
          primaryAction={<button type="button" onClick={onCreate} className="rounded-xl bg-[#2E5A44] px-3 py-2 text-xs font-bold text-white">Lên lịch công việc</button>}
        />
      )}
    </section>
  );
}

function ActivitySummaryList({
  activities,
  canExecute,
  selectedActivityId,
  onSelectActivity,
  onStatusChange,
  plotLabel,
}: {
  activities: CultivationActivity[];
  canExecute: boolean;
  selectedActivityId: string;
  onSelectActivity: (id: string) => void;
  onStatusChange: (id: string, action: "start" | "complete" | "skip" | "cancel") => void;
  plotLabel: (id: string) => string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <b className="text-[13px] font-extrabold text-[#2E5A44]">Lịch sử công việc</b>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-neutral-500">{activities.length}</span>
      </div>
      {activities.length ? (
        <div className="grid gap-2">
          {activities.map((activity) => {
            const effectiveStatus = getEffectiveActivityStatus(activity);
            const closed = isClosedActivity(activity);
            const dueTone = closed
              ? getClosedTimelineToneClass(activity.status)
              : getDueToneClass(activity.scheduledStartAt);
            const timelineLabel = closed
              ? activityStatusLabels[effectiveStatus]
              : getDaysUntilText(activity.scheduledStartAt);
            const actions = getActivityStatusActions(activity);
            const disabled = !canExecute || actions.length === 0;

            return (
              <div
                key={activity.id}
                className={`grid gap-3 rounded-xl border bg-white p-3 transition md:grid-cols-[190px_minmax(0,1fr)_170px_140px_212px] md:items-center ${
                  selectedActivityId === activity.id ? "border-[#2E5A44] shadow-sm" : "border-neutral-200"
                }`}
              >
                <button type="button" onClick={() => onSelectActivity(activity.id)} className="inline-flex items-center gap-2 text-left text-xs font-extrabold text-[#2E5A44]">
                  <Clock size={15} />
                  {formatDateTime(activity.scheduledStartAt)}
                </button>
                <button type="button" onClick={() => onSelectActivity(activity.id)} className="text-left">
                  <b className="block text-sm text-neutral-950">{activity.title}</b>
                  <span className="mt-1 block text-xs font-bold text-neutral-500">{activityStatusLabels[effectiveStatus]}</span>
                </button>
                <span className="text-xs font-bold text-neutral-600">{plotLabel(activity.plotId)}</span>
                <span className={`rounded-lg px-2 py-1 text-center text-xs font-extrabold ${dueTone}`}>{timelineLabel}</span>
                <select
                  aria-label="Cập nhật trạng thái công việc"
                  className="h-9 w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-3 pr-9 text-xs font-bold text-neutral-700 outline-none transition focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414] disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
                  value=""
                  disabled={disabled}
                  onChange={(event) => {
                    const action = event.target.value as "start" | "complete" | "skip" | "cancel";
                    if (action) onStatusChange(activity.id, action);
                  }}
                >
                  <option value="">{canExecute ? "Cập nhật trạng thái" : "Không có quyền"}</option>
                  {actions.map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-3 py-4 text-center text-xs font-semibold text-neutral-400">Không có công việc trong tuần này.</div>
      )}
    </div>
  );
}

function getActivityStatusActions(activity: CultivationActivity) {
  if (["COMPLETED", "CANCELLED", "SKIPPED", "PENDING_APPROVAL"].includes(activity.status)) return [];
  const actions: Array<{ value: "start" | "complete" | "skip" | "cancel"; label: string }> = [];
  if (activity.status !== "IN_PROGRESS") {
    actions.push({ value: "start", label: "Chuyển sang �ang l�m" });
  }
  actions.push({ value: "complete", label: "Ho�n th�nh" });
  actions.push({ value: "skip", label: "Hoãn" });
  actions.push({ value: "cancel", label: "Hủy" });
  return actions;
}
function toDateKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : toLocalDateKey(date);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

type WeekDayItem = ReturnType<typeof getCurrentWeekDays>[number];

function getCurrentWeekDays(weekOffset = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  monday.setDate(monday.getDate() + weekOffset * 7);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      key: toLocalDateKey(date),
      weekday: new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(date),
      dateLabel: new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date),
      isToday: date.getTime() === today.getTime(),
      relativeLabel: getDaysUntilText(date.toISOString()),
    };
  });
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekRangeLabel(days: WeekDayItem[]) {
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last) return "Tuần đang chọn";
  return `${first.dateLabel} - ${last.dateLabel}`;
}

function getDaysUntilText(value: string) {
  const days = getDaysUntil(value);
  const target = new Date(value);
  const now = new Date();
  if (Number.isNaN(target.getTime())) return "ChÆ°a cĂ³ thá»i gian";

  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) {
    const overdueMinutes = Math.ceil((now.getTime() - target.getTime()) / 60_000);
    if (overdueMinutes <= 0) return "Hôm nay";
    if (overdueMinutes < 60) return `Quá hạn ${overdueMinutes} phút`;
    return `Quá hạn ${Math.ceil(overdueMinutes / 60)} giờ`;
  }
  if (days === 1) return "Còn 1 ngày";
  return `Còn ${days} ngày`;
}

function getDaysUntil(value: string) {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.round(
    (startOfLocalDay(target).getTime() - startOfLocalDay(new Date()).getTime()) /
      86_400_000,
  );
}

function getDueToneClass(value: string) {
  const days = getDaysUntil(value);
  const target = new Date(value);
  if (days < 0) return "bg-red-50 text-red-700 ring-1 ring-red-100";
  if (days === 0 && target.getTime() < Date.now()) return "bg-red-50 text-red-700 ring-1 ring-red-100";
  if (days > 0 && days <= 2) return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  return "bg-[#e9f2ea] text-[#39704f] ring-1 ring-[#d8e7dc]";
}

function getClosedTimelineToneClass(status: ActivityStatus) {
  if (status === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  return "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200";
}

function startOfLocalDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function CalendarView({
  activities,
  mode,
  onModeChange,
  selectedActivityId,
  onSelectActivity,
  plotLabel,
  actorLabel,
  onCreate,
}: {
  activities: CultivationActivity[];
  mode: "month" | "week" | "day" | "list";
  onModeChange: (mode: "month" | "week" | "day" | "list") => void;
  selectedActivityId: string;
  onSelectActivity: (id: string) => void;
  plotLabel: (id: string) => string;
  actorLabel: string;
  onCreate: () => void;
}) {
  return (
    <section className="panel p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-neutral-950">Lịch chăm sóc</h2>
          <p className="mt-1 text-[13px] font-medium leading-5 text-neutral-600">Xem nhanh theo tuần, ngày, tháng hoặc danh sách.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-neutral-100 p-1">
            {(["week", "day", "month", "list"] as const).map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => onModeChange(item)}
                className={`min-h-10 rounded-lg px-2 text-[13px] font-extrabold transition sm:px-3 sm:text-sm ${
                  mode === item ? "bg-[#2E5A44] text-white shadow-sm" : "text-neutral-700 hover:bg-white"
                }`}
              >
                {item === "month" ? "Tháng" : item === "week" ? "Tuần" : item === "day" ? "Ngày" : "Danh sách"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-[15px] font-extrabold text-white shadow-sm transition hover:bg-[#244a37]"
          >
            <Plus size={18} />
            Thêm công việc
          </button>
        </div>
      </div>
      {activities.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activities.map((activity) => {
            const effectiveStatus = getEffectiveActivityStatus(activity);
            return (
            <article
              key={activity.id}
              className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${
                selectedActivityId === activity.id ? "border-[#2E5A44] bg-[#f1f7f2]" : "border-neutral-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <Pill kind={effectiveStatus}>{activityStatusLabels[effectiveStatus]}</Pill>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-extrabold text-neutral-700">{activityTypeLabels[activity.activityType]}</span>
              </div>
              <button type="button" onClick={() => onSelectActivity(activity.id)} className="mt-3 block w-full text-left">
                <b className="block text-lg font-extrabold leading-6 text-neutral-950">{activity.title}</b>
              </button>
              <div className="mt-3 grid gap-2 text-sm font-semibold text-neutral-700">
                <span className="flex items-center gap-2">
                  <Clock size={17} className="shrink-0 text-[#2E5A44]" />
                  {formatDateTime(activity.scheduledStartAt)}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin size={17} className="shrink-0 text-[#2E5A44]" />
                  {plotLabel(activity.plotId)}
                </span>
                <span className="flex items-center gap-2">
                  <UserCheck size={17} className="shrink-0 text-[#2E5A44]" />
                  {actorLabel}
                </span>
              </div>
              {activity.activityType === "CHEMICAL_TREATMENT" || isOverdue(activity) || activity.approvalRequired ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-bold leading-5 text-amber-900">
                  <span className="flex items-start gap-2">
                    <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                    {isOverdue(activity)
                      ? "Công việc đã quá lịch, cần kiểm tra và cập nhật sớm."
                      : activity.approvalRequired
                        ? "Cần phê duyệt trước khi thực hiện."
                        : "Công việc hóa chất cần chú ý thời gian cách ly."}
                  </span>
                </div>
              ) : null}
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => onSelectActivity(activity.id)}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#2E5A44] px-3 text-[13px] font-extrabold text-white"
                >
                  <CheckCircle2 size={16} />
                  Hoàn thành
                </button>
                <button
                  type="button"
                  onClick={() => onSelectActivity(activity.id)}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 text-[13px] font-extrabold text-neutral-800"
                >
                  <CalendarDays size={16} />
                  Dời lịch
                </button>
                <button
                  type="button"
                  onClick={() => onSelectActivity(activity.id)}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 text-[13px] font-extrabold text-neutral-800"
                >
                  <Eye size={16} />
                  Chi tiết
                </button>
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="Chưa có công việc trong tuần này."
          description="Lên lịch một công việc mới hoặc tạo từ kế hoạch mùa vụ khi backend đã có dữ liệu ngữ cảnh."
          primaryAction={<button type="button" onClick={onCreate} className="rounded-xl bg-[#2E5A44] px-3 py-2 text-xs font-bold text-white">Lên lịch công việc</button>}
        />
      )}
    </section>
  );
}

void CalendarView;

function PlanView({
  plans,
  context,
  options,
  canManage,
  actorId,
  plotLabel,
  onCreate,
}: {
  plans: CultivationPlan[];
  context: ContextSelection;
  options: ReturnType<typeof buildContextOptions>;
  canManage: boolean;
  actorId: string;
  plotLabel: (id: string) => string;
  onCreate: (body: Partial<CultivationPlan>, done: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", startDate: "", expectedHarvestDate: "", targetMarketCodes: ["VN"] });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCreate(
      {
        farmId: context.farmId,
        plotId: context.plotId,
        cultivationSeasonId: context.seasonId,
        name: form.name,
        startDate: form.startDate,
        expectedHarvestDate: form.expectedHarvestDate || null,
        targetMarketCodes: form.targetMarketCodes,
        createdBy: actorId,
      },
      () => setOpen(false),
    );
  };
  return (
    <>
      <Section
        title="Kế hoạch mùa vụ"
        description="Danh sách kế hoạch theo ngữ cảnh đang chọn."
        action={
          canManage ? (
            <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2E5A44] px-3 text-xs font-bold text-white">
              <Plus size={14} />
              Tạo kế hoạch
            </button>
          ) : null
        }
      >
        <DataTable
          headers={["Tên kế hoạch", "Khu vực", "Thời gian", "Thị trường", "Trạng thái"]}
          rows={plans.map((plan) => [
            plan.name,
            plotLabel(plan.plotId),
            `${formatDate(plan.startDate)} - ${formatDate(plan.expectedHarvestDate)}`,
            plan.targetMarketCodes.join(", "),
            plan.status === "ACTIVE" ? "Đang thực hiện" : plan.status,
          ])}
          empty="Chưa có kế hoạch mùa vụ trong ngữ cảnh này."
        />
      </Section>
      <Drawer title="Tạo kế hoạch mùa vụ" open={open} onClose={() => setOpen(false)}>
        {!context.farmId || !context.plotId || !context.seasonId ? (
          <EmptyState title="Chưa đủ ngữ cảnh" description="Cần có trang trại, khu canh tác và mùa vụ từ backend trước khi tạo kế hoạch." />
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <div className="rounded-2xl bg-neutral-50 p-3 text-xs font-semibold text-neutral-600">
              {options.farms.find((item) => item.id === context.farmId)?.label} · {options.plots.find((item) => item.id === context.plotId)?.label} · {options.seasons.find((item) => item.id === context.seasonId)?.label}
            </div>
            <Field label="Tên kế hoạch"><input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ngày bắt đầu"><input required type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
              <Field label="Ngày thu hoạch dự kiến"><input type="date" className={inputClass} value={form.expectedHarvestDate} onChange={(e) => setForm({ ...form, expectedHarvestDate: e.target.value })} /></Field>
            </div>
            <ChipSelect label="Thị trường mục tiêu" values={markets} selected={form.targetMarketCodes} onChange={(targetMarketCodes) => setForm({ ...form, targetMarketCodes })} />
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-xs font-bold text-white">
              <Plus size={15} />
              Tạo kế hoạch
            </button>
          </form>
        )}
      </Drawer>
    </>
  );
}

function ActivityView({
  activities,
  plans,
  inputs,
  canExecute,
  actorId,
  actorName,
  plotLabel,
  onCreate,
  onComplete,
}: {
  activities: CultivationActivity[];
  plans: CultivationPlan[];
  inputs: AgriculturalInput[];
  canExecute: boolean;
  actorId: string;
  actorName: string;
  plotLabel: (id: string) => string;
  onCreate: (body: Record<string, unknown>, done: () => void) => void;
  onComplete: (id: string, body: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ActivityStatus | "ALL" | "ACTIVE">("ACTIVE");
  const [form, setForm] = useState({
    cultivationPlanId: plans[0]?.id ?? "",
    activityType: "IRRIGATION" as ActivityType,
    title: "",
    description: "",
    scheduledStartAt: "",
    scheduledEndAt: "",
    selectedInputIds: [] as string[],
    targetPestOrDisease: "",
    biologicalControlReason: "",
  });
  const isChemical = form.activityType === "CHEMICAL_TREATMENT";
  const activeCount = activities.filter(isActiveActivity).length;
  const closedCount = activities.length - activeCount;
  const filtered = activities.filter((activity) => {
    const effectiveStatus = getEffectiveActivityStatus(activity);
    const matchesStatus =
      status === "ALL" ||
      (status === "ACTIVE" ? isActiveActivity(activity) : effectiveStatus === status);
    const matchesQuery = !query || activity.title.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"));
    return matchesStatus && matchesQuery;
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const selectedPlan = plans.find((plan) => plan.id === form.cultivationPlanId);
    if (!selectedPlan) return;
    onCreate(
      {
        cultivationPlanId: selectedPlan.id,
        cultivationSeasonId: selectedPlan.cultivationSeasonId,
        farmId: selectedPlan.farmId,
        plotId: selectedPlan.plotId,
        activityType: form.activityType,
        title: form.title,
        description: form.description || null,
        scheduledStartAt: toInstant(form.scheduledStartAt),
        scheduledEndAt: toInstant(form.scheduledEndAt) ?? null,
        assignedUserIds: actorId ? [actorId] : [],
        approvalRequired: isChemical,
        approvalUserId: isChemical ? actorId : undefined,
        targetPestOrDisease: isChemical ? form.targetPestOrDisease : undefined,
        biologicalControlReason: isChemical ? form.biologicalControlReason : undefined,
        plannedInputIds: form.selectedInputIds,
      },
      () => setOpen(false),
    );
  };

  return (
    <>
      <Section
        title="Công việc cần xử lý"
        description="Quản lý các việc đang mở, tạo lịch mới và cập nhật kết quả. Việc đã kết thúc được chuyển sang tab Nhật ký."
        action={
          canExecute ? (
            <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2E5A44] px-3 text-xs font-bold text-white">
              <Plus size={14} />
              Tạo công việc
            </button>
          ) : null
        }
      >
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative block">
            <span className="sr-only">Tìm công việc</span>
            <Search className="pointer-events-none absolute left-3 top-3 text-neutral-400" size={14} />
            <input className={`${inputClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên công việc" />
          </label>
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as ActivityStatus | "ALL")}>
            <option value="ACTIVE">Đang mở ({activeCount})</option>
            <option value="ALL">Tất cả ({activities.length})</option>
            {(["SCHEDULED", "IN_PROGRESS", "PENDING_APPROVAL", "OVERDUE", "COMPLETED", "SKIPPED", "CANCELLED"] as ActivityStatus[]).map((item) => (
              <option key={item} value={item}>{activityStatusLabels[item]}</option>
            ))}
          </select>
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <MiniMetric label="Đang mở" value={activeCount} />
          <MiniMetric label="Đã ghi nhật ký" value={closedCount} />
          <MiniMetric label="Đang hiển thị" value={filtered.length} />
        </div>
        <DataTable
          headers={["Tên", "Loại", "Trạng thái", "Khu vực", "Lịch", "Thực hiện"]}
          rows={filtered.map((activity) => [
            activity.title,
            activityTypeLabels[activity.activityType],
            <Pill key={`${activity.id}-status`} kind={getEffectiveActivityStatus(activity)}>
              {activityStatusLabels[getEffectiveActivityStatus(activity)]}
            </Pill>,
            plotLabel(activity.plotId),
            formatDateTime(activity.scheduledStartAt),
            canExecute && !["COMPLETED", "CANCELLED", "SKIPPED"].includes(activity.status) ? (
              <button
                type="button"
                onClick={() =>
                  onComplete(activity.id, {
                    startedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    executedBy: actorId,
                    actualTreeCount: 0,
                    actualArea: 0,
                    weatherSnapshot: {},
                    evidenceFiles: [],
                    inputUsages: [],
                  })
                }
                className="rounded-lg bg-[#2E5A44] px-2 py-1 text-xs font-bold text-white"
              >
                Ghi hoàn thành
              </button>
            ) : "—",
          ])}
          empty="Chưa có công việc phù hợp."
        />
      </Section>
      <Drawer title="Tạo công việc chăm sóc" open={open} onClose={() => setOpen(false)}>
        {!plans.length ? (
          <EmptyState title="Chưa có kế hoạch mùa vụ" description="Cần có kế hoạch trong ngữ cảnh hiện tại trước khi tạo công việc." />
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <Field label="Kế hoạch mùa vụ">
              <select required className={inputClass} value={form.cultivationPlanId} onChange={(e) => setForm({ ...form, cultivationPlanId: e.target.value })}>
                <option value="">Chọn kế hoạch</option>
                {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            </Field>
            <Field label="Loại công việc">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {activityTypes.slice(0, 12).map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setForm({ ...form, activityType: type })}
                    className={`rounded-xl border p-3 text-left text-xs font-bold ${form.activityType === type ? "border-[#2E5A44] bg-[#eef6ef] text-[#2E5A44]" : "border-neutral-200 bg-white text-neutral-700"}`}
                  >
                    {activityTypeLabels[type]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Tên công việc"><input required className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bắt đầu"><input required type="datetime-local" className={inputClass} value={form.scheduledStartAt} onChange={(e) => setForm({ ...form, scheduledStartAt: e.target.value })} /></Field>
              <Field label="Hoàn thành trước"><input type="datetime-local" className={inputClass} value={form.scheduledEndAt} onChange={(e) => setForm({ ...form, scheduledEndAt: e.target.value })} /></Field>
            </div>
            <Field label="Người thực hiện" hint="Lấy từ tài khoản đang đăng nhập, không nhập ID thủ công.">
              <input className={inputClass} value={actorName} disabled readOnly />
            </Field>
            <InputMultiSelect inputs={inputs} selected={form.selectedInputIds} onChange={(selectedInputIds) => setForm({ ...form, selectedInputIds })} />
            {isChemical ? (
              <div className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <b className="text-sm text-amber-900">Quy trình hóa chất cần phê duyệt</b>
                <Field label="Vấn đề cần xử lý"><input required className={inputClass} value={form.targetPestOrDisease} onChange={(e) => setForm({ ...form, targetPestOrDisease: e.target.value })} /></Field>
                <Field label="Biện pháp sinh học đã thử"><textarea required className={`${inputClass} h-20 py-2`} value={form.biologicalControlReason} onChange={(e) => setForm({ ...form, biologicalControlReason: e.target.value })} /></Field>
              </div>
            ) : null}
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-xs font-bold text-white">
              <Plus size={15} />
              Tạo công việc
            </button>
          </form>
        )}
      </Drawer>
    </>
  );
}

function ApprovalView({
  activities,
  canApprove,
  onApprove,
  onReject,
  plotLabel,
}: {
  activities: CultivationActivity[];
  canApprove: boolean;
  actorId: string;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  plotLabel: (id: string) => string;
}) {
  if (!canApprove) {
    return (
      <Section title="Phê duyệt">
        <EmptyState icon={ShieldAlert} title="Bạn không có quyền phê duyệt yêu cầu hóa chất." />
      </Section>
    );
  }
  return (
    <Section title="Yêu cầu phê duyệt hóa chất">
      {activities.length ? (
        <div className="grid gap-3">
          {activities.map((activity) => (
            <article key={activity.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <Pill kind={activity.status}>{activityStatusLabels[activity.status]}</Pill>
              <b className="mt-3 block text-sm">{activity.title}</b>
              <p className="mt-1 text-xs text-amber-800">{plotLabel(activity.plotId)} · {formatDateTime(activity.scheduledStartAt)}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => onApprove(activity.id)} className="rounded-xl bg-[#2E5A44] px-3 py-2 text-xs font-bold text-white">Phê duyệt</button>
                <button type="button" onClick={() => onReject(activity.id, "Cần bổ sung thông tin IPM")} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-700 ring-1 ring-red-200">Từ chối</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Không có yêu cầu chờ duyệt" description="Các công việc hóa chất cần phê duyệt sẽ xuất hiện tại đây." />
      )}
    </Section>
  );
}

function HistoryView({ activities, plotLabel }: { activities: CultivationActivity[]; plotLabel: (id: string) => string }) {
  const completedCount = activities.filter((activity) => activity.status === "COMPLETED").length;
  const skippedCount = activities.filter((activity) => activity.status === "SKIPPED").length;
  const cancelledCount = activities.filter((activity) => activity.status === "CANCELLED").length;

  return (
    <Section title="Nhật ký chăm sóc" description="Chỉ lưu các công việc đã có kết quả: hoàn thành, hoãn hoặc hủy. Các việc đang mở được xử lý ở tab Công việc.">
      {activities.length ? (
        <div className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <MiniMetric label="Hoàn thành" value={completedCount} />
            <MiniMetric label="Hoãn" value={skippedCount} />
            <MiniMetric label="Hủy" value={cancelledCount} />
          </div>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="grid grid-cols-[28px_1fr] gap-3">
                <span className="mt-1 size-3 rounded-full bg-[#2E5A44] ring-4 ring-[#e9f0ea]" />
                <div className="border-b border-neutral-100 pb-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <span>
                      <b className="text-sm text-neutral-950">{activity.title}</b>
                      <p className="mt-1 text-xs text-neutral-500">
                        Ghi nhận lúc {formatDateTime(activity.updatedAt)} · {plotLabel(activity.plotId)} · {activityTypeLabels[activity.activityType]}
                      </p>
                    </span>
                    <Pill kind={activity.status}>{activityStatusLabels[activity.status]}</Pill>
                  </div>
                  {activity.description ? <p className="mt-2 text-xs leading-5 text-neutral-600">{activity.description}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title="Chưa có nhật ký chăm sóc." description="Khi công việc được hoàn thành, hoãn hoặc hủy, bản ghi kết quả sẽ xuất hiện tại đây." />
      )}
    </Section>
  );
}

function InputView({ inputs, canManage, onCreate }: { inputs: AgriculturalInput[]; canManage: boolean; onCreate: (body: Record<string, unknown>, done: () => void) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<BiologicalLevel>("BIOLOGICAL");
  return (
    <>
      <Section
        title="Vật tư nông nghiệp"
        description="Danh mục vật tư chuẩn từ backend. Chủ vườn chỉ xem và chọn khi lập công việc."
        action={
          canManage ? (
            <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2E5A44] px-3 text-xs font-bold text-white">
              <Plus size={14} />
              Thêm vật tư
            </button>
          ) : null
        }
      >
        <DataTable
          headers={["Sản phẩm", "Mức độ sản phẩm", "PHI", "Trạng thái"]}
          rows={inputs.map((input) => [input.productName, biologicalLevelLabels[input.biologicalLevel], `${input.preHarvestIntervalDays ?? 0} ngày`, input.status])}
          empty="Chưa có vật tư nông nghiệp."
        />
      </Section>
      <Drawer title="Thêm vật tư nông nghiệp" open={open} onClose={() => setOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCreate(
              {
                code: `INPUT-${Date.now()}`,
                productName: name,
                category: chemicalLevels.includes(level) ? "CHEMICAL_PESTICIDE" : "BIOLOGICAL_CONTROL",
                biologicalLevel: level,
                status: "VERIFIED",
                activeIngredients: [],
                beneficialOrganisms: [],
                targetPests: [],
                applicableCrops: ["DURIAN"],
                allowedMarketCodes: [],
                prohibitedMarketCodes: [],
                certificateDocumentUrls: [],
              },
              () => setOpen(false),
            );
          }}
          className="grid gap-3"
        >
          <Field label="Tên sản phẩm"><input required className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Mức độ sản phẩm">
            <select className={inputClass} value={level} onChange={(event) => setLevel(event.target.value as BiologicalLevel)}>
              {Object.keys(biologicalLevelLabels).map((item) => <option key={item} value={item}>{biologicalLevelLabels[item as BiologicalLevel]}</option>)}
            </select>
          </Field>
          <button className="rounded-xl bg-[#2E5A44] px-4 py-2 text-xs font-bold text-white">Thêm vật tư</button>
        </form>
      </Drawer>
    </>
  );
}

function ResidueView({ standards, canManage, onCreate }: { standards: ResidueStandard[]; canManage: boolean; onCreate: (body: Record<string, unknown>, done: () => void) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    marketCode: "EU",
    commodityCode: "DURIAN",
    commodityName: "Sầu riêng",
    activeIngredientCode: "",
    activeIngredientName: "",
    mrlValue: "",
    unit: "mg/kg",
    effectiveFrom: new Date().toISOString().slice(0, 10),
  });
  return (
    <>
      <Section
        title="Giới hạn dư lượng"
        description="Tra cứu giới hạn áp dụng theo thị trường và hoạt chất."
        action={canManage ? <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2E5A44] px-3 text-xs font-bold text-white"><Plus size={14} />Tạo giới hạn</button> : null}
      >
        <DataTable
          headers={["Thị trường", "Nông sản", "Hoạt chất", "Giới hạn", "Nguồn", "Xác minh"]}
          rows={standards.map((item) => [item.marketCode, item.commodityName, item.activeIngredientName, `${item.mrlValue} ${item.unit}`, item.sourceType, item.verified ? "Đã xác minh" : "Chưa xác minh"])}
          empty="Chưa có giới hạn dư lượng."
        />
      </Section>
      <Drawer title="Tạo giới hạn dư lượng" open={open} onClose={() => setOpen(false)}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onCreate({ ...form, mrlValue: Number(form.mrlValue), sourceType: "CUSTOMER_SPECIFICATION", verified: false, active: true }, () => setOpen(false));
          }}
          className="grid gap-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Thị trường"><select required className={inputClass} value={form.marketCode} onChange={(e) => setForm({ ...form, marketCode: e.target.value })}>{markets.map((market) => <option key={market} value={market}>{market}</option>)}</select></Field>
            <Field label="Mã nông sản"><input required className={inputClass} value={form.commodityCode} onChange={(e) => setForm({ ...form, commodityCode: e.target.value })} /></Field>
          </div>
          <Field label="Tên nông sản"><input required className={inputClass} value={form.commodityName} onChange={(e) => setForm({ ...form, commodityName: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã hoạt chất"><input required className={inputClass} value={form.activeIngredientCode} onChange={(e) => setForm({ ...form, activeIngredientCode: e.target.value })} /></Field>
            <Field label="Tên hoạt chất"><input required className={inputClass} value={form.activeIngredientName} onChange={(e) => setForm({ ...form, activeIngredientName: e.target.value })} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Giới hạn"><input required min="0" step="0.0001" type="number" className={inputClass} value={form.mrlValue} onChange={(e) => setForm({ ...form, mrlValue: e.target.value })} /></Field>
            <Field label="Đơn vị"><input required className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
            <Field label="Hiệu lực từ"><input required type="date" className={inputClass} value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} /></Field>
          </div>
          <button className="rounded-xl bg-[#2E5A44] px-4 py-2 text-xs font-bold text-white">Tạo giới hạn</button>
        </form>
      </Drawer>
    </>
  );
}

function LabView({
  samples,
  batches,
  context,
  canManage,
  actorId,
  seasonLabel,
  onCreateSample,
}: {
  samples: LabSample[];
  batches: HarvestBatch[];
  context: ContextSelection;
  canManage: boolean;
  actorId: string;
  seasonLabel: string;
  onCreateSample: (body: Record<string, unknown>, done: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ harvestBatchId: "", sampleCode: "", sampleType: "FRUIT", sampledAt: "", laboratoryName: "" });
  return (
    <>
      <Section
        title="Kiểm nghiệm dư lượng"
        description="Đề nghị lấy mẫu, theo dõi mẫu và xem trạng thái kết quả."
        action={canManage ? <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2E5A44] px-3 text-xs font-bold text-white"><Plus size={14} />Đề nghị lấy mẫu</button> : null}
      >
        <DataTable
          headers={["Mã yêu cầu", "Mùa vụ", "Ngày dự kiến", "Phòng kiểm nghiệm", "Trạng thái"]}
          rows={samples.map((sample) => [sample.sampleCode, seasonLabel, formatDateTime(sample.sampledAt), sample.laboratoryName, sample.status])}
          empty="Chưa có mẫu kiểm nghiệm."
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(labResultLabels) as Array<keyof typeof labResultLabels>).map((status) => <Pill key={status} kind={status}>{labResultLabels[status]}</Pill>)}
        </div>
      </Section>
      <Drawer title="Đề nghị lấy mẫu" open={open} onClose={() => setOpen(false)}>
        {!context.seasonId ? (
          <EmptyState title="Chưa chọn mùa vụ" description="Chọn mùa vụ ở thanh ngữ cảnh trước khi đề nghị lấy mẫu." />
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onCreateSample(
                {
                  cultivationSeasonId: context.seasonId,
                  harvestBatchId: form.harvestBatchId || undefined,
                  sampleCode: form.sampleCode,
                  sampleType: form.sampleType,
                  sampledAt: toInstant(form.sampledAt) ?? new Date().toISOString(),
                  sampledBy: actorId,
                  laboratoryName: form.laboratoryName,
                  status: "COLLECTED",
                  attachments: [],
                },
                () => setOpen(false),
              );
            }}
            className="grid gap-3"
          >
            <div className="rounded-2xl bg-neutral-50 p-3 text-xs font-semibold text-neutral-600">{seasonLabel}</div>
            <Field label="Lô thu hoạch liên quan">
              <select className={inputClass} value={form.harvestBatchId} onChange={(e) => setForm({ ...form, harvestBatchId: e.target.value })}>
                <option value="">Chưa gắn lô thu hoạch</option>
                {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchCode}</option>)}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mã yêu cầu"><input required className={inputClass} value={form.sampleCode} onChange={(e) => setForm({ ...form, sampleCode: e.target.value })} /></Field>
              <Field label="Loại mẫu"><select required className={inputClass} value={form.sampleType} onChange={(e) => setForm({ ...form, sampleType: e.target.value })}><option value="FRUIT">Trái</option><option value="LEAF">Lá</option><option value="SOIL">Đất</option><option value="WATER">Nước</option></select></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Thời điểm lấy mẫu"><input required type="datetime-local" className={inputClass} value={form.sampledAt} onChange={(e) => setForm({ ...form, sampledAt: e.target.value })} /></Field>
              <Field label="Phòng kiểm nghiệm"><input required className={inputClass} value={form.laboratoryName} onChange={(e) => setForm({ ...form, laboratoryName: e.target.value })} /></Field>
            </div>
            <button className="rounded-xl bg-[#2E5A44] px-4 py-2 text-xs font-bold text-white">Gửi đề nghị</button>
          </form>
        )}
      </Drawer>
    </>
  );
}

function SafetyView({
  seasonId,
  market,
  batches,
  assessment,
  onMarketChange,
  onAssess,
}: {
  seasonId: string;
  market: string;
  batches: HarvestBatch[];
  assessment: ComplianceAssessment | null;
  onMarketChange: (value: string) => void;
  onAssess: (harvestBatchId?: string) => void;
}) {
  const [batchId, setBatchId] = useState("");
  return (
    <Section title="An toàn thu hoạch" description="Đánh giá điều kiện thu hoạch theo mùa vụ đang chọn, không yêu cầu nhập mã kỹ thuật.">
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Thị trường">
          <select className={inputClass} value={market} onChange={(e) => onMarketChange(e.target.value)}>
            {markets.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Lô thu hoạch">
          <select className={inputClass} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">Đánh giá theo mùa vụ</option>
            {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchCode}</option>)}
          </select>
        </Field>
        <button type="button" onClick={() => onAssess(batchId || undefined)} disabled={!seasonId || !market} className="self-end rounded-xl bg-[#2E5A44] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Đánh giá</button>
      </div>
      {assessment ? (
        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <article className="rounded-2xl border border-neutral-200 bg-white p-4"><span className="text-xs text-neutral-500">Thu hoạch</span><b className="mt-2 block">{assessment.eligibleForHarvest ? "Đủ điều kiện" : "Cần bổ sung"}</b><p className="mt-1 text-xs text-neutral-500">Ngày cách ly: {formatDate(assessment.earliestSafeHarvestDate)}</p></article>
            <article className="rounded-2xl border border-neutral-200 bg-white p-4"><span className="text-xs text-neutral-500">Xuất xưởng</span><b className="mt-2 block">{assessment.eligibleForExportRelease ? "Đủ điều kiện" : "Chưa đủ"}</b><p className="mt-1 text-xs text-neutral-500">Kiểm nghiệm: {assessment.requiresLabTest ? "Cần kết quả" : "Không bắt buộc"}</p></article>
            <article className="rounded-2xl border border-neutral-200 bg-white p-4"><span className="text-xs text-neutral-500">Mức độ rủi ro</span><b className="mt-2 block">{riskLevelLabels[assessment.riskLevel]}</b><p className="mt-1 text-xs text-neutral-500">Điểm rủi ro chỉ dành cho tham khảo: {assessment.riskScore}</p></article>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ReasonList title="Lý do chưa đủ điều kiện" items={assessment.blockingReasons} kind="BLOCKED" />
            <ReasonList title="Cảnh báo cần chú ý" items={assessment.warnings} kind="HIGH" />
          </div>
        </div>
      ) : (
        <EmptyState icon={ShieldCheck} title="Chưa có đánh giá an toàn thu hoạch." description="Chọn thị trường và bấm đánh giá để lấy kết quả từ backend." />
      )}
    </Section>
  );
}

function ActivityRow({ activity }: { activity: CultivationActivity }) {
  const effectiveStatus = getEffectiveActivityStatus(activity);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <span>
        <b className="text-sm text-neutral-900">{activity.title}</b>
        <span className="mt-1 block text-xs text-neutral-500">{formatDateTime(activity.scheduledStartAt)} · {activityTypeLabels[activity.activityType]}</span>
      </span>
      <Pill kind={effectiveStatus}>{activityStatusLabels[effectiveStatus]}</Pill>
    </div>
  );
}

function ReasonList({ title, items, kind }: { title: string; items: string[]; kind: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <b className="text-sm">{title}</b>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? items.map((item) => <Pill key={item} kind={kind}>{item}</Pill>) : <span className="text-xs text-neutral-500">Không có</span>}
      </div>
    </div>
  );
}

function DataTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <EmptyState title={empty} description="Dữ liệu sẽ xuất hiện sau khi backend có bản ghi phù hợp." />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 scrollbar-thin">
      <table className="min-w-full divide-y divide-neutral-200 text-left text-xs">
        <thead className="bg-neutral-50 text-neutral-500">
          <tr>{headers.map((header) => <th key={header} className="px-3 py-3 font-bold">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 bg-white">
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-neutral-50">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-3 font-semibold text-neutral-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChipSelect({
  label,
  values,
  selected,
  onChange,
}: {
  label: string;
  values: string[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const active = selected.includes(value);
          return (
            <button
              type="button"
              key={value}
              onClick={() => onChange(active ? selected.filter((item) => item !== value) : [...selected, value])}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${active ? "border-[#2E5A44] bg-[#eef6ef] text-[#2E5A44]" : "border-neutral-200 bg-white text-neutral-600"}`}
            >
              {value}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function InputMultiSelect({
  inputs,
  selected,
  onChange,
}: {
  inputs: AgriculturalInput[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = inputs.filter((input) => input.productName.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))).slice(0, 8);
  return (
    <Field label="Vật tư sử dụng">
      <input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm vật tư..." />
      <div className="mt-2 flex flex-wrap gap-2">
        {selected.map((id) => {
          const input = inputs.find((item) => item.id === id);
          if (!input) return null;
          return (
            <button key={id} type="button" onClick={() => onChange(selected.filter((item) => item !== id))} className="rounded-full bg-[#eef6ef] px-3 py-1.5 text-xs font-bold text-[#2E5A44]">
              {input.productName} ×
            </button>
          );
        })}
      </div>
      {query ? (
        <div className="mt-2 grid gap-2">
          {filtered.map((input) => (
            <button
              type="button"
              key={input.id}
              onClick={() => !selected.includes(input.id) && onChange([...selected, input.id])}
              className="rounded-xl border border-neutral-200 bg-white p-2 text-left text-xs font-semibold text-neutral-700"
            >
              {input.productName} · {biologicalLevelLabels[input.biologicalLevel]}
            </button>
          ))}
          {!filtered.length ? <span className="text-xs text-neutral-500">Không tìm thấy vật tư phù hợp từ backend.</span> : null}
        </div>
      ) : null}
    </Field>
  );
}
