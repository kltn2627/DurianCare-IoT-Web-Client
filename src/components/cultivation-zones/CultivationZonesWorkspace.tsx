"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Loader2,
  MapPinned,
  Plus,
  RefreshCw,
  Search,
  Sprout,
  Trees,
} from "lucide-react";
import { cultivationClient, CultivationApiError } from "@/lib/cultivation/client";
import type { CultivationZone, CultivationZoneStatus, FarmOption } from "@/lib/cultivation/types";
import { friendlyApiMessage } from "@/lib/feedback";

const statusLabels: Record<string, string> = {
  PREPARING: "Đang chuẩn bị",
  ACTIVE: "Đang canh tác",
  PAUSED: "Tạm ngưng",
  RENOVATING: "Đang cải tạo",
  CLOSED: "Đã kết thúc",
};

const growthStageLabels: Record<string, string> = {
  SEEDLING: "Cây con",
  VEGETATIVE: "Sinh trưởng thân lá",
  FLOWERING: "Ra hoa",
  FRUITING: "Nuôi trái",
  PRODUCTIVE: "Đang cho thu hoạch",
  RENOVATION: "Cải tạo",
};

const areaUnitLabels: Record<string, string> = {
  SQUARE_METER: "m2",
  HECTARE: "ha",
};

const statusOptions: Array<{ value: "" | CultivationZoneStatus; label: string }> = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PREPARING", label: "Đang chuẩn bị" },
  { value: "ACTIVE", label: "Đang canh tác" },
  { value: "PAUSED", label: "Tạm ngưng" },
  { value: "RENOVATING", label: "Đang cải tạo" },
  { value: "CLOSED", label: "Đã kết thúc" },
];

function farmLabel(farm: FarmOption) {
  return farm.name || farm.code || "Trang trại chưa đặt tên";
}

function zoneAge(plantingDate: string) {
  const planted = new Date(`${plantingDate}T00:00:00`);
  if (Number.isNaN(planted.getTime())) return "Chưa rõ tuổi cây";
  const now = new Date();
  let months = (now.getFullYear() - planted.getFullYear()) * 12 + now.getMonth() - planted.getMonth();
  if (now.getDate() < planted.getDate()) months -= 1;
  if (months < 0) return "Ngày trồng chưa hợp lệ";
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  if (!years) return `${Math.max(restMonths, 0)} tháng tuổi`;
  return restMonths ? `${years} năm ${restMonths} tháng` : `${years} năm`;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
        <MapPinned size={20} />
      </span>
      <h2 className="mt-4 text-sm font-extrabold text-neutral-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-500">{description}</p>
      <Link
        href="/dashboard/client/cultivation-zones/new"
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-bold text-white"
      >
        <Plus size={16} />
        Tạo khu canh tác
      </Link>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex gap-3 text-sm font-semibold text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          {message}
        </span>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-red-700 ring-1 ring-red-200"
        >
          <RefreshCw size={15} />
          Thử lại
        </button>
      </div>
    </div>
  );
}

export function CultivationZonesWorkspace() {
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [zones, setZones] = useState<CultivationZone[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"" | CultivationZoneStatus>("");
  const [searchText, setSearchText] = useState("");
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingZones, setLoadingZones] = useState(true);
  const [farmError, setFarmError] = useState<string | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const farmNameById = useMemo(() => {
    return new Map(farms.map((farm) => [farm.id, farmLabel(farm)]));
  }, [farms]);

  const loadFarms = useCallback(async () => {
    setLoadingFarms(true);
    setFarmError(null);
    try {
      const result = await cultivationClient.listFarms();
      setFarms(result);
      setSelectedFarmId((current) => current || (result.length === 1 ? result[0].id : ""));
    } catch (caught) {
      const status = caught instanceof CultivationApiError ? caught.status : undefined;
      const message = caught instanceof Error ? caught.message : undefined;
      setFarmError(friendlyApiMessage({ status, message }, "general", "Không thể tải danh sách trang trại."));
    } finally {
      setLoadingFarms(false);
    }
  }, []);

  const loadZones = useCallback(async () => {
    setLoadingZones(true);
    setZoneError(null);
    try {
      const result = await cultivationClient.listCultivationZones({
        farmId: selectedFarmId || undefined,
        status: selectedStatus || undefined,
        search: searchText.trim() || undefined,
      });
      setZones(result);
    } catch (caught) {
      const status = caught instanceof CultivationApiError ? caught.status : undefined;
      const message = caught instanceof Error ? caught.message : undefined;
      setZoneError(friendlyApiMessage({ status, message }, "general", "Không thể tải danh sách khu canh tác."));
    } finally {
      setLoadingZones(false);
    }
  }, [selectedFarmId, selectedStatus, searchText]);

  useEffect(() => {
    void loadFarms();
  }, [loadFarms]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadZones();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadZones]);

  return (
    <div className="space-y-4">
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]">
              <Trees size={21} />
            </span>
            <div>
              <p className="text-xs font-extrabold tracking-[1px] text-[#6f7d73]">KHU CANH TÁC</p>
              <h1 className="mt-1 text-xl font-extrabold text-neutral-900 sm:text-2xl">Quản lý khu canh tác</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                Theo dõi diện tích, giống cây, tuổi cây, số cây hiện tại và tình trạng từng khu trong trang trại.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/client/cultivation-zones/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-bold text-white"
          >
            <Plus size={16} />
            Tạo khu canh tác
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(200px,280px)_minmax(180px,240px)_1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-neutral-700">Trang trại</span>
            <select
              value={selectedFarmId}
              disabled={loadingFarms || !!farmError}
              onChange={(event) => setSelectedFarmId(event.target.value)}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414]"
            >
              <option value="">Tất cả trang trại</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farmLabel(farm)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-neutral-700">Trạng thái</span>
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as "" | CultivationZoneStatus)}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414]"
            >
              {statusOptions.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-neutral-700">Tìm khu canh tác</span>
            <span className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414]"
                placeholder="Nhập tên khu, giống cây hoặc ghi chú"
              />
            </span>
          </label>

          <button
            type="button"
            onClick={() => {
              void loadFarms();
              void loadZones();
            }}
            className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-700"
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
        </div>
      </section>

      {farmError ? <ErrorState message={farmError} onRetry={loadFarms} /> : null}
      {zoneError ? <ErrorState message={zoneError} onRetry={loadZones} /> : null}

      {loadingZones ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm font-bold text-neutral-600">
          <span className="inline-flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Đang tải khu canh tác...
          </span>
        </div>
      ) : null}

      {!loadingZones && !zoneError && zones.length === 0 ? (
        <EmptyState
          title="Chưa có khu canh tác"
          description="Tạo khu canh tác đầu tiên để gắn cây trồng, mùa vụ, lịch chăm sóc và dữ liệu IoT theo đúng khu vực thực tế."
        />
      ) : null}

      {!loadingZones && !zoneError && zones.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {zones.map((zone) => (
            <Link
              key={zone.id}
              href={`/dashboard/client/cultivation-zones/${encodeURIComponent(zone.id)}`}
              className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#cad9ce] hover:shadow-lg hover:shadow-[#2e5a4412]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#edf3ee] px-3 py-1 text-xs font-bold text-[#2E5A44]">
                    <MapPinned size={14} />
                    {statusLabels[zone.status] ?? "Đang cập nhật"}
                  </span>
                  <h2 className="mt-3 text-base font-extrabold text-neutral-900">{zone.name}</h2>
                  <p className="mt-1 text-sm text-neutral-500">{farmNameById.get(zone.farmId) ?? "Trang trại đang quản lý"}</p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]">
                  <Sprout size={18} />
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <span className="rounded-xl bg-neutral-50 p-3">
                  <small className="block text-xs font-bold text-neutral-500">Diện tích</small>
                  <b className="mt-1 block text-sm text-neutral-900">
                    {zone.areaValue} {areaUnitLabels[zone.areaUnit] ?? zone.areaUnit}
                  </b>
                </span>
                <span className="rounded-xl bg-neutral-50 p-3">
                  <small className="block text-xs font-bold text-neutral-500">Số cây</small>
                  <b className="mt-1 block text-sm text-neutral-900">{zone.currentTreeCount}</b>
                </span>
                <span className="rounded-xl bg-neutral-50 p-3">
                  <small className="block text-xs font-bold text-neutral-500">Giống</small>
                  <b className="mt-1 block truncate text-sm text-neutral-900">{zone.variety}</b>
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-neutral-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1">
                  <CalendarDays size={13} />
                  {zoneAge(zone.plantingDate)}
                </span>
                {zone.growthStage ? (
                  <span className="rounded-full bg-neutral-100 px-3 py-1">
                    {growthStageLabels[zone.growthStage] ?? "Giai đoạn đang cập nhật"}
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
