"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, Edit3, Loader2, MapPinned, Plus, Trees } from "lucide-react";

import { CultivationApiError, farmZoneClient } from "@/lib/cultivation/client";
import type { CanonicalCultivationZone, FarmZoneStatus } from "@/lib/cultivation/types";
import { friendlyApiMessage } from "@/lib/feedback";

const statusLabels: Record<FarmZoneStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Tạm ngưng",
  QUARANTINED: "Cách ly",
  ARCHIVED: "Đã lưu trữ",
};

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-4"><small className="block text-xs font-bold text-neutral-500">{label}</small><b className="mt-1 block break-words text-sm text-neutral-900">{value ?? "Chưa cập nhật"}</b></div>;
}

function errorMessage(caught: unknown) {
  const status = caught instanceof CultivationApiError ? caught.status : undefined;
  const message = caught instanceof Error ? caught.message : undefined;
  return friendlyApiMessage({ status, message }, "general", "Không thể tải chi tiết khu canh tác lúc này.");
}

export function CultivationZoneDetail({ zoneId }: { zoneId: string }) {
  const router = useRouter();
  const [zone, setZone] = useState<CanonicalCultivationZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void farmZoneClient.getZone(zoneId)
      .then((result) => { if (active) setZone(result); })
      .catch((caught) => { if (active) setError(errorMessage(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [zoneId]);

  const archive = async () => {
    if (!zone || !window.confirm(`Lưu trữ khu canh tác "${zone.name}"?`)) return;
    setArchiving(true);
    setError(null);
    try {
      await farmZoneClient.archiveZone(zone.farmId, zone.id);
      router.push("/dashboard/client/cultivation-zones");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="panel p-5 sm:p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><span className="grid size-11 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]"><Trees size={21} /></span><div><p className="text-xs font-extrabold tracking-[1px] text-[#6f7d73]">CHI TIẾT KHU CANH TÁC</p><h1 className="mt-1 text-xl font-extrabold text-neutral-900 sm:text-2xl">{zone?.name ?? "Đang tải khu canh tác"}</h1><p className="mt-2 text-sm text-neutral-500">{zone?.code ? `Mã khu: ${zone.code}` : "Dữ liệu catalog thật từ backend."}</p></div></div><div className="flex flex-col gap-2 sm:flex-row">{zone ? <Link href={`/dashboard/client/cultivation-zones/${encodeURIComponent(zone.id)}/edit`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-700"><Edit3 size={16} />Sửa</Link> : null}{zone ? <button type="button" onClick={() => void archive()} disabled={archiving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 disabled:opacity-60">{archiving ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}Lưu trữ</button> : null}<Link href="/dashboard/client/cultivation-zones/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-bold text-white"><Plus size={16} />Tạo khu mới</Link></div></div></div>
      <Link href="/dashboard/client/cultivation-zones" className="inline-flex items-center gap-2 text-sm font-bold text-[#2E5A44]"><ArrowLeft size={16} />Quay lại danh sách</Link>
      {loading ? <div className="panel grid min-h-48 place-items-center p-7 text-sm font-bold text-neutral-600"><span className="inline-flex items-center gap-2"><Loader2 size={18} className="animate-spin" />Đang tải dữ liệu...</span></div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
      {zone ? <><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Info label="Trang trại" value={zone.farmName} /><Info label="Diện tích" value={zone.areaSquareMeters == null ? null : `${zone.areaSquareMeters} m²`} /><Info label="Trạng thái" value={statusLabels[zone.status]} /><Info label="Mã khu" value={zone.code} /><Info label="Số cây" value={null} /><Info label="Giống sầu riêng" value={null} /><Info label="Ngày trồng / tuổi cây" value={null} /><Info label="Cập nhật" value={zone.updatedAt ? new Date(zone.updatedAt).toLocaleDateString("vi-VN") : null} /></section><section className="rounded-2xl border border-neutral-200 bg-white p-5"><span className="flex items-center gap-2 text-xs font-bold text-neutral-500"><MapPinned size={15} />Mô tả khu vực</span><p className="mt-3 text-sm leading-6 text-neutral-700">{zone.description || "Chưa cập nhật"}</p><p className="mt-3 text-xs font-semibold text-neutral-500">Số cây, giống và tuổi cây chưa thuộc FarmZone backend contract hiện tại.</p></section></> : null}
    </div>
  );
}
