"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit3, Loader2, MapPinned, Plus, Sprout, Trash2, Trees } from "lucide-react";
import { cultivationClient, CultivationApiError } from "@/lib/cultivation/client";
import type { CultivationZone, FarmOption } from "@/lib/cultivation/types";
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

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <small className="block text-xs font-bold text-neutral-500">{label}</small>
      <b className="mt-1 block break-words text-sm text-neutral-900">{value ?? "Chưa có dữ liệu"}</b>
    </div>
  );
}

function farmLabel(farm: FarmOption) {
  return farm.name || farm.code || "Trang trại chưa đặt tên";
}

function plantingYear(plantingDate?: string) {
  if (!plantingDate) return "Chưa có dữ liệu";
  const year = new Date(`${plantingDate}T00:00:00`).getFullYear();
  return Number.isFinite(year) ? year : "Chưa có dữ liệu";
}

export function CultivationZoneDetail({ zoneId }: { zoneId: string }) {
  const router = useRouter();
  const [zone, setZone] = useState<CultivationZone | null>(null);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      cultivationClient.getCultivationZone(zoneId),
      cultivationClient.listFarms().catch(() => [] as FarmOption[]),
    ])
      .then(([zoneResult, farmResult]) => {
        if (!active) return;
        setZone(zoneResult);
        setFarms(farmResult);
      })
      .catch((caught) => {
        if (!active) return;
        const status = caught instanceof CultivationApiError ? caught.status : undefined;
        const message = caught instanceof Error ? caught.message : undefined;
        setError(friendlyApiMessage({ status, message }, "general", "Không thể tải chi tiết khu canh tác lúc này."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [zoneId]);

  const handleDelete = async () => {
    if (!zone) return;
    const confirmed = window.confirm(`Xóa khu canh tác "${zone.name}"? Thao tác này không thể hoàn tác.`);
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await cultivationClient.deleteCultivationZone(zone.id);
      router.push("/dashboard/client/cultivation-zones");
      router.refresh();
    } catch (caught) {
      const status = caught instanceof CultivationApiError ? caught.status : undefined;
      const message = caught instanceof Error ? caught.message : undefined;
      setError(friendlyApiMessage({ status, message }, "general", "Không thể xóa khu canh tác. Vui lòng thử lại."));
      setDeleting(false);
    }
  };

  const farmName = zone ? farms.find((farm) => farm.id === zone.farmId) : null;
  const harvestHistories = zone?.harvestHistories ?? [];

  return (
    <div className="space-y-4">
      <div className="panel p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-11 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]">
              <Trees size={21} />
            </span>
            <div>
              <p className="text-xs font-extrabold tracking-[1px] text-[#6f7d73]">CHI TIẾT KHU CANH TÁC</p>
              <h1 className="mt-1 text-xl font-extrabold text-neutral-900 sm:text-2xl">
                {zone?.name ?? "Đang tải khu canh tác"}
              </h1>
              <p className="mt-2 text-sm text-neutral-500">
                {zone?.code ? `Mã khu: ${zone.code}` : "Thông tin được lấy từ backend hoặc dữ liệu mock cục bộ."}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {zone ? (
              <Link
                href={`/dashboard/client/cultivation-zones/${encodeURIComponent(zone.id)}/edit`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-700"
              >
                <Edit3 size={16} />
                Sửa
              </Link>
            ) : null}
            {zone ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Xóa
              </button>
            ) : null}
            <Link href="/dashboard/client/cultivation-zones/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-bold text-white">
              <Plus size={16} />
              Tạo khu mới
            </Link>
          </div>
        </div>
      </div>

      <Link href="/dashboard/client/cultivation-zones" className="inline-flex items-center gap-2 text-sm font-bold text-[#2E5A44]">
        <ArrowLeft size={16} />
        Quay lại danh sách
      </Link>

      {loading ? (
        <div className="panel grid min-h-48 place-items-center p-7 text-sm font-bold text-neutral-600">
          <span className="inline-flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Đang tải dữ liệu...</span>
        </div>
      ) : null}

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}

      {zone ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Trang trại" value={farmName ? farmLabel(farmName) : "Trang trại đang quản lý"} />
            <Info label="Diện tích" value={`${zone.areaValue} ${areaUnitLabels[zone.areaUnit] ?? zone.areaUnit}`} />
            <Info label="Giống sầu riêng" value={zone.variety} />
            <Info label="Trạng thái sử dụng" value={statusLabels[zone.status] ?? zone.status} />
            <Info label="Năm trồng" value={plantingYear(zone.plantingDate)} />
            <Info label="Ngày trồng" value={zone.plantingDate} />
            <Info label="Số cây hiện tại" value={zone.currentTreeCount} />
            <Info label="Số mùa vụ đã thu hoạch" value={harvestHistories.length || zone.previousHarvestCount} />
            <Info label="Giai đoạn" value={zone.growthStage ? growthStageLabels[zone.growthStage] ?? zone.growthStage : null} />
            <Info label="Khoảng cách trồng" value={zone.plantingDistance} />
            <Info label="Nguồn nước" value={zone.waterSource} />
            <Info label="Thoát nước" value={zone.drainageStatus} />
            <div className="md:col-span-2 xl:col-span-4">
              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <span className="flex items-center gap-2 text-xs font-bold text-neutral-500">
                  <MapPinned size={15} />
                  Ghi chú và vị trí
                </span>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{zone.notes}</p>
                {zone.locationDescription ? <p className="mt-2 text-sm leading-6 text-neutral-500">{zone.locationDescription}</p> : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]">
                <Sprout size={18} />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-neutral-900">Lịch sử mùa vụ đã thu hoạch</h2>
                <p className="mt-1 text-xs text-neutral-500">Theo dõi năng suất và ghi chú chất lượng qua các vụ trước.</p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              {harvestHistories.length ? (
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs font-bold text-neutral-500">
                      <th className="py-3 pr-3">Mùa vụ</th>
                      <th className="py-3 pr-3">Năm</th>
                      <th className="py-3 pr-3">Ngày thu hoạch</th>
                      <th className="py-3 pr-3">Sản lượng</th>
                      <th className="py-3 pr-3">Chất lượng</th>
                      <th className="py-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {harvestHistories.map((item) => (
                      <tr key={item.id ?? `${item.seasonName}-${item.harvestYear}`} className="border-b border-neutral-100 last:border-0">
                        <td className="py-3 pr-3 font-bold text-neutral-900">{item.seasonName}</td>
                        <td className="py-3 pr-3 text-neutral-700">{item.harvestYear}</td>
                        <td className="py-3 pr-3 text-neutral-700">{item.harvestedAt || "Chưa ghi"}</td>
                        <td className="py-3 pr-3 text-neutral-700">
                          {item.yieldValue == null ? "Chưa ghi" : `${item.yieldValue} ${item.yieldUnit ?? ""}`}
                        </td>
                        <td className="py-3 pr-3 text-neutral-700">{item.qualityNote || "Chưa ghi"}</td>
                        <td className="py-3 text-neutral-700">{item.notes || "Chưa ghi"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm font-semibold text-neutral-500">
                  Chưa có lịch sử mùa vụ đã thu hoạch.
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
