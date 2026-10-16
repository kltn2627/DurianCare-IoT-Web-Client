"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPinned, Save, Trees } from "lucide-react";

import { CultivationApiError, farmZoneClient } from "@/lib/cultivation/client";
import type { FarmCatalog, FarmZoneStatus } from "@/lib/cultivation/types";
import { friendlyApiMessage } from "@/lib/feedback";

type FormState = {
  areaSquareMeters: string;
  code: string;
  description: string;
  farmId: string;
  name: string;
  status: FarmZoneStatus;
};

const emptyForm: FormState = { areaSquareMeters: "", code: "", description: "", farmId: "", name: "", status: "ACTIVE" };

const statusOptions: Array<{ label: string; value: FarmZoneStatus }> = [
  { label: "Đang hoạt động", value: "ACTIVE" },
  { label: "Tạm ngưng", value: "INACTIVE" },
  { label: "Cách ly", value: "QUARANTINED" },
  { label: "Đã lưu trữ", value: "ARCHIVED" },
];

function messageFor(caught: unknown, fallback: string) {
  const status = caught instanceof CultivationApiError ? caught.status : undefined;
  const message = caught instanceof Error ? caught.message : undefined;
  return friendlyApiMessage({ status, message }, "general", fallback);
}

export function CreateCultivationZoneForm({ zoneId }: { zoneId?: string }) {
  const router = useRouter();
  const editing = Boolean(zoneId);
  const [farms, setFarms] = useState<FarmCatalog[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const farmResult = await farmZoneClient.listFarms();
        if (!active) return;
        setFarms(farmResult);
        if (!zoneId) {
          setForm((current) => ({ ...current, farmId: farmResult.length === 1 ? farmResult[0].id : current.farmId }));
          return;
        }
        const zone = await farmZoneClient.getZone(zoneId);
        if (!active) return;
        setForm({ areaSquareMeters: zone.areaSquareMeters == null ? "" : String(zone.areaSquareMeters), code: zone.code ?? "", description: zone.description ?? "", farmId: zone.farmId, name: zone.name, status: zone.status });
      } catch (caught) {
        if (active) setError(messageFor(caught, "Không thể tải dữ liệu khu canh tác."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [zoneId]);

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.farmId || !form.name.trim()) {
      setError("Vui lòng chọn trang trại và nhập tên khu canh tác.");
      return;
    }
    const area = form.areaSquareMeters.trim() ? Number(form.areaSquareMeters) : null;
    if (area !== null && (!Number.isFinite(area) || area < 0)) {
      setError("Diện tích phải là số không âm.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = { areaSquareMeters: area, code: form.code.trim() || null, description: form.description.trim() || null, name: form.name.trim() };
      const saved = zoneId
        ? await farmZoneClient.updateZone(form.farmId, zoneId, { ...body, status: form.status })
        : await farmZoneClient.createZone({ ...body, farmId: form.farmId });
      router.push(`/dashboard/client/cultivation-zones/${encodeURIComponent(saved.id)}`);
      router.refresh();
    } catch (caught) {
      setError(messageFor(caught, editing ? "Không thể cập nhật khu canh tác." : "Không thể tạo khu canh tác."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <section className="panel p-5 sm:p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]"><Trees size={21} /></span><div><p className="text-xs font-extrabold tracking-[1px] text-[#6f7d73]">KHU CANH TÁC</p><h1 className="mt-1 text-xl font-extrabold text-neutral-900 sm:text-2xl">{editing ? "Sửa khu canh tác" : "Tạo khu canh tác"}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Thông tin được lưu vào cùng FarmZone backend contract mà Mobile đang dùng.</p></div></div><div className="flex gap-2"><Link href={zoneId ? `/dashboard/client/cultivation-zones/${encodeURIComponent(zoneId)}` : "/dashboard/client/cultivation-zones"} className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-700">Hủy</Link><button type="submit" disabled={loading || saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{editing ? "Lưu thay đổi" : "Tạo khu"}</button></div></div></section>
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
      {loading ? <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm font-semibold text-neutral-600"><Loader2 size={16} className="mr-2 inline animate-spin" />Đang tải dữ liệu...</div> : <section className="rounded-2xl border border-neutral-200 bg-white p-5"><div className="mb-5 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]"><MapPinned size={18} /></span><div><h2 className="text-sm font-extrabold text-neutral-900">Thông tin khu</h2><p className="mt-1 text-xs text-neutral-500">Các trường được backend FarmZone hỗ trợ hiện tại.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Trang trại" required><select value={form.farmId} disabled={editing || farms.length === 0} onChange={(event) => update("farmId", event.target.value)} className={inputClass}><option value="">Chọn trang trại</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name || farm.code || "Trang trại chưa đặt tên"}</option>)}</select></Field><Field label="Tên khu canh tác" required><input value={form.name} onChange={(event) => update("name", event.target.value)} className={inputClass} /></Field><Field label="Mã khu"><input value={form.code} onChange={(event) => update("code", event.target.value)} className={inputClass} /></Field><Field label="Diện tích (m²)"><input value={form.areaSquareMeters} inputMode="decimal" onChange={(event) => update("areaSquareMeters", event.target.value)} className={inputClass} /></Field>{editing ? <Field label="Trạng thái"><select value={form.status} onChange={(event) => update("status", event.target.value as FarmZoneStatus)} className={inputClass}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field> : null}<div className="sm:col-span-2"><Field label="Mô tả"><textarea value={form.description} onChange={(event) => update("description", event.target.value)} className={`${inputClass} min-h-28 py-3`} /></Field></div></div></section>}
    </form>
  );
}

function Field({ children, label, required }: { children: React.ReactNode; label: string; required?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">{label}{required ? " *" : ""}</span>{children}</label>;
}

const inputClass = "h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414]";
