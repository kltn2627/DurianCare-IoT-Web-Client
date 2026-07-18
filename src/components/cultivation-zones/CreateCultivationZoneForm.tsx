"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  MapPinned,
  Plus,
  Ruler,
  Sprout,
  Trash2,
  Trees,
  X,
} from "lucide-react";
import { cultivationClient, CultivationApiError } from "@/lib/cultivation/client";
import type {
  CultivationZone,
  CultivationZoneAreaUnit,
  CultivationZoneCropType,
  CultivationZoneGrowthStage,
  CultivationZoneIrrigationMethod,
  CultivationZoneRequest,
  CultivationZoneStatus,
  FarmOption,
  HarvestSeasonHistory,
} from "@/lib/cultivation/types";
import { friendlyApiMessage } from "@/lib/feedback";

type HarvestFormState = {
  id: string;
  seasonName: string;
  harvestYear: string;
  harvestedAt: string;
  yieldValue: string;
  yieldUnit: string;
  qualityNote: string;
  notes: string;
};

type FormState = {
  farmId: string;
  name: string;
  areaValue: string;
  areaUnit: CultivationZoneAreaUnit;
  cropType: CultivationZoneCropType;
  variety: string;
  plantingDate: string;
  initialTreeCount: string;
  currentTreeCount: string;
  growthStage: "" | CultivationZoneGrowthStage;
  seedSource: string;
  plantingDistance: string;
  soilType: string;
  waterSource: string;
  irrigationMethod: "" | CultivationZoneIrrigationMethod;
  drainageStatus: string;
  status: CultivationZoneStatus;
  locationDescription: string;
  imageUrls: string;
  notes: string;
  harvestHistories: HarvestFormState[];
};

type FormErrors = Partial<Record<keyof FormState, string>> & {
  harvestHistories?: string;
};

const defaultForm: FormState = {
  farmId: "",
  name: "",
  areaValue: "",
  areaUnit: "HECTARE",
  cropType: "DURIAN",
  variety: "RI6",
  plantingDate: "",
  initialTreeCount: "",
  currentTreeCount: "",
  growthStage: "",
  seedSource: "",
  plantingDistance: "",
  soilType: "",
  waterSource: "",
  irrigationMethod: "",
  drainageStatus: "",
  status: "ACTIVE",
  locationDescription: "",
  imageUrls: "",
  notes: "",
  harvestHistories: [],
};

const cropOptions = [{ value: "DURIAN", label: "Sầu riêng" }];
const varietyOptions = ["RI6", "Monthong", "Dona", "Musang King", "Khác"];
const growthStageOptions: Array<{ value: CultivationZoneGrowthStage; label: string }> = [
  { value: "SEEDLING", label: "Cây con" },
  { value: "VEGETATIVE", label: "Sinh trưởng thân lá" },
  { value: "FLOWERING", label: "Ra hoa" },
  { value: "FRUITING", label: "Nuôi trái" },
  { value: "PRODUCTIVE", label: "Đang cho thu hoạch" },
  { value: "RENOVATION", label: "Cải tạo" },
];
const irrigationOptions: Array<{ value: CultivationZoneIrrigationMethod; label: string }> = [
  { value: "DRIP", label: "Tưới nhỏ giọt" },
  { value: "SPRINKLER", label: "Tưới phun" },
  { value: "FLOOD", label: "Tưới tràn" },
  { value: "MANUAL", label: "Tưới thủ công" },
  { value: "OTHER", label: "Phương pháp khác" },
];
const statusOptions: Array<{ value: CultivationZoneStatus; label: string }> = [
  { value: "PREPARING", label: "Đang chuẩn bị" },
  { value: "ACTIVE", label: "Đang canh tác" },
  { value: "PAUSED", label: "Tạm ngưng" },
  { value: "RENOVATING", label: "Đang cải tạo" },
  { value: "CLOSED", label: "Đã kết thúc" },
];

const inputClass =
  "h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414]";
const textareaClass =
  "min-h-24 w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414]";

function toNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function toInteger(value: string) {
  if (value.trim() === "") return null;
  if (!/^\d+$/.test(value.trim())) return Number.NaN;
  return Number(value);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function newHarvestRow(): HarvestFormState {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    seasonName: "",
    harvestYear: "",
    harvestedAt: "",
    yieldValue: "",
    yieldUnit: "tấn",
    qualityNote: "",
    notes: "",
  };
}

function treeAgeText(plantingDate: string) {
  if (!plantingDate) return "Chọn ngày trồng để hệ thống tự tính tuổi cây.";
  const planted = new Date(`${plantingDate}T00:00:00`);
  if (Number.isNaN(planted.getTime())) return "Ngày trồng chưa hợp lệ.";
  const now = new Date();
  let months = (now.getFullYear() - planted.getFullYear()) * 12 + now.getMonth() - planted.getMonth();
  if (now.getDate() < planted.getDate()) months -= 1;
  if (months < 0) return "Ngày trồng đang ở tương lai.";
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  if (years <= 0) return `${Math.max(restMonths, 0)} tháng tuổi`;
  return restMonths ? `${years} năm ${restMonths} tháng tuổi` : `${years} năm tuổi`;
}

function formFromZone(zone: CultivationZone): FormState {
  return {
    farmId: zone.farmId,
    name: zone.name,
    areaValue: String(zone.areaValue),
    areaUnit: zone.areaUnit,
    cropType: zone.cropType,
    variety: zone.variety,
    plantingDate: zone.plantingDate,
    initialTreeCount: zone.initialTreeCount == null ? "" : String(zone.initialTreeCount),
    currentTreeCount: String(zone.currentTreeCount),
    growthStage: zone.growthStage ?? "",
    seedSource: zone.seedSource ?? "",
    plantingDistance: zone.plantingDistance ?? "",
    soilType: zone.soilType ?? "",
    waterSource: zone.waterSource ?? "",
    irrigationMethod: zone.irrigationMethod ?? "",
    drainageStatus: zone.drainageStatus ?? "",
    status: zone.status,
    locationDescription: zone.locationDescription ?? "",
    imageUrls: zone.imageUrls?.join("\n") ?? "",
    notes: zone.notes,
    harvestHistories: (zone.harvestHistories ?? []).map((item) => ({
      id: item.id ?? `history-${item.harvestYear}-${item.seasonName}`,
      seasonName: item.seasonName,
      harvestYear: String(item.harvestYear),
      harvestedAt: item.harvestedAt ?? "",
      yieldValue: item.yieldValue == null ? "" : String(item.yieldValue),
      yieldUnit: item.yieldUnit ?? "tấn",
      qualityNote: item.qualityNote ?? "",
      notes: item.notes ?? "",
    })),
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const area = toNumber(form.areaValue);
  const initialTrees = toInteger(form.initialTreeCount);
  const currentTrees = toInteger(form.currentTreeCount);
  const currentYear = new Date().getFullYear();

  if (!form.farmId) errors.farmId = "Vui lòng chọn trang trại quản lý.";
  if (!form.name.trim()) errors.name = "Vui lòng nhập tên khu canh tác.";
  if (area == null || Number.isNaN(area) || area <= 0) errors.areaValue = "Diện tích phải lớn hơn 0.";
  if (!form.variety.trim()) errors.variety = "Vui lòng chọn hoặc nhập giống sầu riêng.";
  if (!form.plantingDate) {
    errors.plantingDate = "Vui lòng chọn ngày trồng.";
  } else if (form.plantingDate > todayIso()) {
    errors.plantingDate = "Ngày trồng không được lớn hơn ngày hiện tại.";
  }
  if (currentTrees == null || Number.isNaN(currentTrees)) {
    errors.currentTreeCount = "Số cây hiện tại phải là số nguyên không âm.";
  }
  if (initialTrees != null && Number.isNaN(initialTrees)) {
    errors.initialTreeCount = "Số cây ban đầu phải là số nguyên không âm.";
  }
  if (
    initialTrees != null &&
    !Number.isNaN(initialTrees) &&
    currentTrees != null &&
    !Number.isNaN(currentTrees) &&
    currentTrees > initialTrees
  ) {
    errors.currentTreeCount = "Số cây hiện tại không được lớn hơn số cây ban đầu.";
  }
  if (!form.notes.trim()) errors.notes = "Vui lòng nhập ghi chú quản lý.";

  const invalidHarvest = form.harvestHistories.some((item) => {
    const year = toInteger(item.harvestYear);
    const yieldValue = toNumber(item.yieldValue);
    return (
      !item.seasonName.trim() ||
      year == null ||
      Number.isNaN(year) ||
      year < 1990 ||
      year > currentYear ||
      (!!item.harvestedAt && item.harvestedAt > todayIso()) ||
      (!!item.yieldValue.trim() && (yieldValue == null || Number.isNaN(yieldValue) || yieldValue < 0))
    );
  });
  if (invalidHarvest) {
    errors.harvestHistories = "Mỗi mùa vụ cần có tên, năm thu hoạch hợp lệ; ngày/sản lượng không được vượt quy tắc.";
  }

  return errors;
}

function helperText(error: string | undefined, description: string) {
  return <p className={`mt-1.5 text-xs leading-5 ${error ? "text-red-600" : "text-neutral-500"}`}>{error || description}</p>;
}

function Field({
  label,
  required,
  error,
  description,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-neutral-700">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </span>
      {children}
      {helperText(error, description)}
    </label>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sprout;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
          <Icon size={18} />
        </span>
        <h2 className="text-sm font-extrabold text-neutral-900">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function CreateCultivationZoneForm({ zoneId }: { zoneId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(zoneId);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingZone, setLoadingZone] = useState(Boolean(zoneId));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [farmError, setFarmError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    cultivationClient
      .listFarms()
      .then((items) => {
        if (!active) return;
        setFarms(items);
        setFarmError(null);
        setForm((current) => ({ ...current, farmId: current.farmId || (items.length === 1 ? items[0].id : "") }));
      })
      .catch((caught) => {
        if (!active) return;
        const status = caught instanceof CultivationApiError ? caught.status : undefined;
        const message = caught instanceof Error ? caught.message : undefined;
        setFarms([]);
        setFarmError(friendlyApiMessage({ status, message }, "general", "Không thể tải danh sách trang trại. Vui lòng thử lại."));
      })
      .finally(() => {
        if (active) setLoadingFarms(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!zoneId) return;
    let active = true;
    setLoadingZone(true);
    cultivationClient
      .getCultivationZone(zoneId)
      .then((zone) => {
        if (!active) return;
        setForm(formFromZone(zone));
      })
      .catch((caught) => {
        if (!active) return;
        const status = caught instanceof CultivationApiError ? caught.status : undefined;
        const message = caught instanceof Error ? caught.message : undefined;
        setApiError(friendlyApiMessage({ status, message }, "general", "Không thể tải khu canh tác để chỉnh sửa."));
      })
      .finally(() => {
        if (active) setLoadingZone(false);
      });
    return () => {
      active = false;
    };
  }, [zoneId]);

  const age = useMemo(() => treeAgeText(form.plantingDate), [form.plantingDate]);

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setApiError(null);
    setNotice(null);
  };

  const updateHarvest = (id: string, patch: Partial<HarvestFormState>) => {
    setForm((current) => ({
      ...current,
      harvestHistories: current.harvestHistories.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
    setErrors((current) => ({ ...current, harvestHistories: undefined }));
  };

  const buildRequest = (): CultivationZoneRequest => {
    const harvestHistories: HarvestSeasonHistory[] = form.harvestHistories.map((item) => ({
      id: item.id.startsWith("draft-") ? undefined : item.id,
      seasonName: item.seasonName.trim(),
      harvestYear: Number(item.harvestYear),
      harvestedAt: item.harvestedAt || null,
      yieldValue: item.yieldValue.trim() ? Number(item.yieldValue) : null,
      yieldUnit: item.yieldUnit.trim() || null,
      qualityNote: item.qualityNote.trim() || null,
      notes: item.notes.trim() || null,
    }));

    return {
      farmId: form.farmId,
      name: form.name.trim(),
      areaValue: Number(form.areaValue),
      areaUnit: form.areaUnit,
      cropType: form.cropType,
      variety: form.variety.trim(),
      plantingDate: form.plantingDate,
      initialTreeCount: form.initialTreeCount.trim() ? Number(form.initialTreeCount) : null,
      currentTreeCount: Number(form.currentTreeCount),
      previousHarvestCount: harvestHistories.length,
      growthStage: form.growthStage || null,
      seedSource: form.seedSource.trim() || null,
      plantingDistance: form.plantingDistance.trim() || null,
      soilType: form.soilType.trim() || null,
      waterSource: form.waterSource.trim() || null,
      irrigationMethod: form.irrigationMethod || null,
      drainageStatus: form.drainageStatus.trim() || null,
      status: form.status,
      locationDescription: form.locationDescription.trim() || null,
      imageUrls: form.imageUrls
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
      notes: form.notes.trim(),
      harvestHistories,
    };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setApiError(null);
    setNotice(null);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const saved = isEdit && zoneId
        ? await cultivationClient.updateCultivationZone(zoneId, buildRequest())
        : await cultivationClient.createCultivationZone(buildRequest());
      setNotice(isEdit ? "Đã cập nhật khu canh tác thành công." : "Đã tạo khu canh tác thành công.");
      router.push(`/dashboard/client/cultivation-zones/${encodeURIComponent(saved.id)}`);
      router.refresh();
    } catch (caught) {
      const status = caught instanceof CultivationApiError ? caught.status : undefined;
      const message = caught instanceof Error ? caught.message : undefined;
      setApiError(
        friendlyApiMessage(
          { status, message },
          "general",
          isEdit
            ? "Không thể cập nhật khu canh tác. Vui lòng kiểm tra dữ liệu và thử lại."
            : "Không thể tạo khu canh tác. Vui lòng kiểm tra dữ liệu và thử lại.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="panel p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]">
              <Trees size={21} />
            </span>
            <div>
              <p className="text-xs font-extrabold tracking-[1px] text-[#6f7d73]">KHU CANH TÁC</p>
              <h1 className="mt-1 text-xl font-extrabold text-neutral-900 sm:text-2xl">
                {isEdit ? "Sửa khu canh tác" : "Tạo khu canh tác"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                Quản lý tên khu, diện tích, giống sầu riêng, số lượng cây, năm trồng, trạng thái, ghi chú và lịch sử mùa vụ đã thu hoạch.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={zoneId ? `/dashboard/client/cultivation-zones/${encodeURIComponent(zoneId)}` : "/dashboard/client/cultivation-zones"}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-700"
            >
              <X size={16} />
              Hủy
            </Link>
            <button
              type="submit"
              disabled={submitting || loadingFarms || loadingZone || farms.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sprout size={16} />}
              {isEdit ? "Lưu thay đổi" : "Tạo khu canh tác"}
            </button>
          </div>
        </div>
      </div>

      {loadingZone ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-bold text-neutral-600">
          <span className="inline-flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Đang tải dữ liệu...</span>
        </div>
      ) : null}
      {apiError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{apiError}</div> : null}
      {farmError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{farmError}</div> : null}
      {!loadingFarms && !farmError && farms.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Tài khoản hiện chưa có trang trại để gắn khu canh tác.
        </div>
      ) : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div> : null}

      <Section icon={MapPinned} title="Thông tin cơ bản">
        <Field label="Trang trại sở hữu" required error={errors.farmId} description="Chỉ chọn trang trại bạn có quyền quản lý.">
          <select
            className={inputClass}
            value={form.farmId}
            disabled={loadingFarms || !!farmError || farms.length === 0}
            onChange={(event) => update("farmId", event.target.value)}
          >
            <option value="">{loadingFarms ? "Đang tải trang trại..." : "Chọn trang trại"}</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name || farm.code || "Trang trại chưa đặt tên"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tên khu canh tác" required error={errors.name} description="Ví dụ: Khu sầu riêng phía Đông.">
          <input className={inputClass} value={form.name} onChange={(event) => update("name", event.target.value)} />
        </Field>
        <Field label="Diện tích" required error={errors.areaValue} description="Nhập số lớn hơn 0, không cần quy đổi thủ công.">
          <div className="grid grid-cols-[1fr_112px] gap-2">
            <input className={inputClass} inputMode="decimal" value={form.areaValue} onChange={(event) => update("areaValue", event.target.value)} />
            <select className={inputClass} value={form.areaUnit} onChange={(event) => update("areaUnit", event.target.value as CultivationZoneAreaUnit)}>
              <option value="SQUARE_METER">m2</option>
              <option value="HECTARE">ha</option>
            </select>
          </div>
        </Field>
        <Field label="Trạng thái" required error={errors.status} description="Trạng thái sử dụng hiện tại của khu canh tác.">
          <select className={inputClass} value={form.status} onChange={(event) => update("status", event.target.value as CultivationZoneStatus)}>
            {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </Field>
      </Section>

      <Section icon={Sprout} title="Thông tin cây trồng">
        <Field label="Loại cây trồng" required error={errors.cropType} description="Mặc định DurianCare quản lý cây sầu riêng.">
          <select className={inputClass} value={form.cropType} onChange={(event) => update("cropType", event.target.value as CultivationZoneCropType)}>
            {cropOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </Field>
        <Field label="Giống sầu riêng" required error={errors.variety} description="Chọn giống phổ biến hoặc chọn Khác nếu cần.">
          <select className={inputClass} value={form.variety} onChange={(event) => update("variety", event.target.value)}>
            {varietyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Ngày trồng" required error={errors.plantingDate} description="Năm trồng và tuổi cây được suy ra từ ngày trồng.">
          <input className={inputClass} type="date" max={todayIso()} value={form.plantingDate} onChange={(event) => update("plantingDate", event.target.value)} />
        </Field>
        <div className="rounded-xl border border-[#dfe9df] bg-[#f6faf6] p-4">
          <span className="flex items-center gap-2 text-xs font-bold text-[#2E5A44]">
            <CalendarDays size={15} />
            Tuổi cây tạm tính
          </span>
          <strong className="mt-2 block text-sm text-neutral-900">{age}</strong>
        </div>
        <Field label="Số cây ban đầu" error={errors.initialTreeCount} description="Có thể để trống nếu chưa có số liệu ban đầu.">
          <input className={inputClass} inputMode="numeric" value={form.initialTreeCount} onChange={(event) => update("initialTreeCount", event.target.value)} />
        </Field>
        <Field label="Số cây hiện tại" required error={errors.currentTreeCount} description="Số nguyên không âm, không lớn hơn số cây ban đầu nếu có nhập.">
          <input className={inputClass} inputMode="numeric" value={form.currentTreeCount} onChange={(event) => update("currentTreeCount", event.target.value)} />
        </Field>
      </Section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
              <Ruler size={18} />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-neutral-900">Lịch sử mùa vụ đã thu hoạch</h2>
              <p className="mt-1 text-xs text-neutral-500">Lưu các vụ trước đó để đối chiếu năng suất và chất lượng theo từng khu.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => update("harvestHistories", [...form.harvestHistories, newHarvestRow()])}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-700"
          >
            <Plus size={15} />
            Thêm mùa vụ
          </button>
        </div>
        {errors.harvestHistories ? (
          <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            <AlertTriangle size={15} className="shrink-0" />
            {errors.harvestHistories}
          </div>
        ) : null}
        <div className="mt-4 space-y-3">
          {form.harvestHistories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm font-semibold text-neutral-500">
              Chưa có mùa vụ đã thu hoạch trước đó.
            </div>
          ) : null}
          {form.harvestHistories.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <b className="text-sm text-neutral-900">Mùa vụ {index + 1}</b>
                <button
                  type="button"
                  onClick={() => update("harvestHistories", form.harvestHistories.filter((history) => history.id !== item.id))}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700"
                  aria-label="Xóa mùa vụ"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <input className={inputClass} placeholder="Tên mùa vụ" value={item.seasonName} onChange={(event) => updateHarvest(item.id, { seasonName: event.target.value })} />
                <input className={inputClass} placeholder="Năm thu hoạch" inputMode="numeric" value={item.harvestYear} onChange={(event) => updateHarvest(item.id, { harvestYear: event.target.value })} />
                <input className={inputClass} type="date" max={todayIso()} value={item.harvestedAt} onChange={(event) => updateHarvest(item.id, { harvestedAt: event.target.value })} />
                <div className="grid grid-cols-[1fr_84px] gap-2">
                  <input className={inputClass} placeholder="Sản lượng" inputMode="decimal" value={item.yieldValue} onChange={(event) => updateHarvest(item.id, { yieldValue: event.target.value })} />
                  <input className={inputClass} value={item.yieldUnit} onChange={(event) => updateHarvest(item.id, { yieldUnit: event.target.value })} />
                </div>
                <input className={`${inputClass} md:col-span-2`} placeholder="Ghi chú chất lượng" value={item.qualityNote} onChange={(event) => updateHarvest(item.id, { qualityNote: event.target.value })} />
                <input className={`${inputClass} md:col-span-2`} placeholder="Ghi chú mùa vụ" value={item.notes} onChange={(event) => updateHarvest(item.id, { notes: event.target.value })} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <Section icon={Ruler} title="Ghi chú quản lý">
        <div className="sm:col-span-2">
          <Field label="Ghi chú" required error={errors.notes} description="Ghi thông tin cần lưu ý khi quản lý khu canh tác.">
            <textarea className={textareaClass} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </Field>
        </div>
      </Section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        <button type="button" onClick={() => setAdvancedOpen((current) => !current)} className="flex w-full items-center justify-between gap-4 text-left">
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
              <ImagePlus size={18} />
            </span>
            <span>
              <b className="block text-sm text-neutral-900">Thông tin nâng cao</b>
              <small className="mt-1 block text-xs text-neutral-500">Mở khi cần bổ sung nguồn giống, đất, nước tưới, vị trí và hình ảnh.</small>
            </span>
          </span>
          {advancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {advancedOpen ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Giai đoạn sinh trưởng" error={errors.growthStage} description="Dùng để cảnh báo và gợi ý lịch canh tác phù hợp.">
              <select className={inputClass} value={form.growthStage} onChange={(event) => update("growthStage", event.target.value as FormState["growthStage"])}>
                <option value="">Chưa chọn</option>
                {growthStageOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Khoảng cách trồng" error={errors.plantingDistance} description="Ví dụ: 8m x 8m.">
              <input className={inputClass} value={form.plantingDistance} onChange={(event) => update("plantingDistance", event.target.value)} />
            </Field>
            <Field label="Nguồn cung cấp giống" error={errors.seedSource} description="Tên vườn ươm hoặc đơn vị cung cấp.">
              <input className={inputClass} value={form.seedSource} onChange={(event) => update("seedSource", event.target.value)} />
            </Field>
            <Field label="Loại đất" error={errors.soilType} description="Ví dụ: đất đỏ bazan, đất phù sa.">
              <input className={inputClass} value={form.soilType} onChange={(event) => update("soilType", event.target.value)} />
            </Field>
            <Field label="Nguồn nước tưới" error={errors.waterSource} description="Ví dụ: giếng khoan, ao trữ, sông.">
              <input className={inputClass} value={form.waterSource} onChange={(event) => update("waterSource", event.target.value)} />
            </Field>
            <Field label="Phương pháp tưới" error={errors.irrigationMethod} description="Chọn cách tưới đang áp dụng.">
              <select className={inputClass} value={form.irrigationMethod} onChange={(event) => update("irrigationMethod", event.target.value as FormState["irrigationMethod"])}>
                <option value="">Chưa chọn</option>
                {irrigationOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Tình trạng thoát nước" error={errors.drainageStatus} description="Mô tả ngắn về khả năng thoát nước mùa mưa.">
              <input className={inputClass} value={form.drainageStatus} onChange={(event) => update("drainageStatus", event.target.value)} />
            </Field>
            <Field label="Vị trí hoặc mô tả vị trí" error={errors.locationDescription} description="Ví dụ: khu vực phía Đông trang trại.">
              <input className={inputClass} value={form.locationDescription} onChange={(event) => update("locationDescription", event.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Hình ảnh khu canh tác" error={errors.imageUrls} description="Nhập URL hình ảnh, mỗi dòng một ảnh hoặc cách nhau bằng dấu phẩy.">
                <textarea className={textareaClass} value={form.imageUrls} onChange={(event) => update("imageUrls", event.target.value)} />
              </Field>
            </div>
          </div>
        ) : null}
      </section>
    </form>
  );
}
