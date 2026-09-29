"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, MapPinned, Plus, RefreshCw, Search, Sprout, Trees } from "lucide-react";

import { CultivationApiError, farmZoneClient } from "@/lib/cultivation/client";
import type { CanonicalCultivationZone, FarmCatalog, FarmZoneStatus } from "@/lib/cultivation/types";
import { friendlyApiMessage } from "@/lib/feedback";

const statusLabels: Record<FarmZoneStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Tạm ngưng",
  QUARANTINED: "Cách ly",
  ARCHIVED: "Đã lưu trữ",
};

const statusOptions: Array<{ label: string; value: "" | FarmZoneStatus }> = [
  { label: "Tất cả trạng thái", value: "" },
  { label: statusLabels.ACTIVE, value: "ACTIVE" },
  { label: statusLabels.INACTIVE, value: "INACTIVE" },
  { label: statusLabels.QUARANTINED, value: "QUARANTINED" },
];

function errorMessage(caught: unknown, fallback: string) {
  const status = caught instanceof CultivationApiError ? caught.status : undefined;
  const message = caught instanceof Error ? caught.message : undefined;
  return friendlyApiMessage({ status, message }, "general", fallback);
}

function areaLabel(zone: CanonicalCultivationZone) {
  return zone.areaSquareMeters == null ? "Chưa cập nhật" : `${zone.areaSquareMeters} m²`;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex gap-3 text-sm font-semibold text-red-700"><AlertTriangle size={18} className="mt-0.5 shrink-0" />{message}</span>
        <button type="button" onClick={onRetry} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-red-700 ring-1 ring-red-200"><RefreshCw size={15} />Thử lại</button>
      </div>
    </div>
  );
}

export function CultivationZonesWorkspace() {
  const [farms, setFarms] = useState<FarmCatalog[]>([]);
  const [zones, setZones] = useState<CanonicalCultivationZone[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"" | FarmZoneStatus>("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFarms = useCallback(async () => {
    const result = await farmZoneClient.listFarms();
    setFarms(result);
    setSelectedFarmId((current) => current || (result.length === 1 ? result[0].id : ""));
  }, []);

  const loadZones = useCallback(async () => {
    const result = await farmZoneClient.listZones({
      farmId: selectedFarmId || undefined,
      search: searchText.trim() || undefined,
      status: selectedStatus || undefined,
    });
    setZones(result);
  }, [searchText, selectedFarmId, selectedStatus]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadFarms(), loadZones()]);
    } catch (caught) {
      setError(errorMessage(caught, "Không thể tải danh sách khu canh tác."));
    } finally {
      setLoading(false);
    }
  }, [loadFarms, loadZones]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]"><Trees size={21} /></span>
            <div><p className="text-xs font-extrabold tracking-[1px] text-[#6f7d73]">KHU CANH TÁC</p><h1 className="mt-1 text-xl font-extrabold text-neutral-900 sm:text-2xl">Quản lý khu canh tác</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Dữ liệu được đọc trực tiếp từ catalog Farm/Zone của DurianCare.</p></div>
          </div>
          <Link href="/dashboard/client/cultivation-zones/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-bold text-white"><Plus size={16} />Tạo khu canh tác</Link>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(200px,280px)_minmax(180px,240px)_1fr_auto]">
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">Trang trại</span><select value={selectedFarmId} disabled={loading} onChange={(event) => setSelectedFarmId(event.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900"><option value="">Tất cả trang trại</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name || farm.code || "Trang trại chưa đặt tên"}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">Trạng thái</span><select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as "" | FarmZoneStatus)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900">{statusOptions.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">Tìm khu canh tác</span><span className="relative block"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input value={searchText} onChange={(event) => setSearchText(event.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm font-semibold text-neutral-900" placeholder="Tên, mã khu hoặc mô tả" /></span></label>
          <button type="button" onClick={() => void load()} className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-700"><RefreshCw size={16} />Làm mới</button>
        </div>
      </section>

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading ? <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm font-bold text-neutral-600"><span className="inline-flex items-center gap-2"><Loader2 size={18} className="animate-spin" />Đang tải khu canh tác...</span></div> : null}
      {!loading && !error && zones.length === 0 ? <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm font-semibold text-neutral-500">Chưa có khu canh tác phù hợp với bộ lọc hiện tại.</div> : null}
      {!loading && !error && zones.length > 0 ? <section className="grid gap-4 lg:grid-cols-2">{zones.map((zone) => <Link key={zone.id} href={`/dashboard/client/cultivation-zones/${encodeURIComponent(zone.id)}`} className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-[#cad9ce] hover:shadow-lg hover:shadow-[#2e5a4412]"><div className="flex items-start justify-between gap-4"><div><span className="inline-flex items-center gap-2 rounded-full bg-[#edf3ee] px-3 py-1 text-xs font-bold text-[#2E5A44]"><MapPinned size={14} />{statusLabels[zone.status]}</span><h2 className="mt-3 text-base font-extrabold text-neutral-900">{zone.name}</h2><p className="mt-1 text-sm text-neutral-500">{zone.farmName}</p></div><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]"><Sprout size={18} /></span></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-600">{zone.description || "Chưa cập nhật mô tả."}</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><Info label="Diện tích" value={areaLabel(zone)} /><Info label="Số cây" value="Chưa cập nhật" /><Info label="Giống" value="Chưa cập nhật" /></div><p className="mt-3 text-xs font-bold text-neutral-500">Tuổi cây: Chưa cập nhật</p></Link>)}</section> : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <span className="rounded-xl bg-neutral-50 p-3"><small className="block text-xs font-bold text-neutral-500">{label}</small><b className="mt-1 block truncate text-sm text-neutral-900">{value}</b></span>;
}
