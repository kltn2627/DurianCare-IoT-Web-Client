"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trees } from "lucide-react";
import { CultivationApiError, farmZoneClient } from "@/lib/cultivation/client";
import type { FarmCatalog, FarmZoneStatus } from "@/lib/cultivation/types";
import { createZoneAgronomyForm, toZoneAgronomy, type ZoneAgronomyForm } from "@/lib/cultivation/zoneAgronomy";
import { friendlyApiMessage } from "@/lib/feedback";
import { ZoneAgronomyFields } from "./ZoneAgronomyFields";

type FormState = {
  area: string;
  areaUnit: "m²" | "ha";
  code: string;
  description: string;
  farmId: string;
  name: string;
  status: FarmZoneStatus;
  agronomy: ZoneAgronomyForm;
};
const emptyForm: FormState = { area: "", areaUnit: "m²", code: "", description: "", farmId: "", name: "", status: "ACTIVE", agronomy: createZoneAgronomyForm({ cropType: "DURIAN" }) };
const statusOptions = [
  { label: "Đang hoạt động", value: "ACTIVE" }, { label: "Tạm ngưng", value: "INACTIVE" },
  { label: "Cách ly", value: "QUARANTINED" },
];
function messageFor(caught: unknown, fallback: string) {
  if (!(caught instanceof CultivationApiError)) return caught instanceof Error ? caught.message : fallback;
  return friendlyApiMessage({ status: caught.status, message: caught.message }, "general", fallback);
}

export function CreateCultivationZoneForm({ zoneId }: { zoneId?: string }) {
  const router = useRouter();
  const editing = Boolean(zoneId);
  const [farms, setFarms] = useState<FarmCatalog[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    void (async () => {
      try {
        const farmResult = await farmZoneClient.listFarms();
        if (!active) return;
        setFarms(farmResult);
        if (!zoneId) {
          setForm({ ...emptyForm, farmId: farmResult.length === 1 ? farmResult[0].id : "" });
          return;
        }
        const zone = await farmZoneClient.getZone(zoneId);
        if (!active) return;
        setForm({ area: zone.areaSquareMeters == null ? "" : String(zone.areaSquareMeters), areaUnit: "m²",
          code: zone.code ?? "", description: zone.description ?? "", farmId: zone.farmId,
          name: zone.name, status: zone.status, agronomy: createZoneAgronomyForm(zone.agronomy) });
      } catch (caught) {
        if (active) { setError(messageFor(caught, "Không thể tải dữ liệu khu canh tác.")); setLoadFailed(true); }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [zoneId]);

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm(current => ({ ...current, [key]: value }));
    setError(null);
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || loading || loadFailed) return;
    if (!form.farmId || !form.name.trim()) { setError("Vui lòng chọn trang trại và nhập tên khu canh tác."); return; }
    const area = form.area.trim() ? Number(form.area.replace(",", ".")) * (form.areaUnit === "ha" ? 10000 : 1) : null;
    if (area !== null && (!Number.isFinite(area) || area < 0)) { setError("Diện tích phải là số không âm."); return; }
    setSaving(true);
    setError(null);
    try {
      const body = { areaSquareMeters: area, code: form.code.trim(), description: form.description.trim(),
        name: form.name.trim(), status: form.status, agronomy: toZoneAgronomy(form.agronomy) };
      const saved = zoneId ? await farmZoneClient.updateZone(form.farmId, zoneId, body)
        : await farmZoneClient.createZone({ ...body, farmId: form.farmId });
      router.push(`/dashboard/client/cultivation-zones/${encodeURIComponent(saved.id)}`);
      router.refresh();
    } catch (caught) { setError(messageFor(caught, "Không thể lưu khu canh tác.")); }
    finally { setSaving(false); }
  };
  const saveButton = <button type="submit" disabled={loading || saving || loadFailed || farms.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{editing ? "Lưu thay đổi" : "Tạo khu canh tác"}</button>;

  return <form onSubmit={event => void submit(event)} className="space-y-4">
    <section className="panel flex flex-wrap items-start justify-between gap-4 p-5 sm:p-7">
      <div className="flex gap-3"><Trees className="mt-1 shrink-0 text-[#2E5A44]" /><div><h1 className="text-xl font-extrabold text-neutral-900">{editing ? "Sửa khu canh tác" : "Tạo khu canh tác"}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">Thông tin cây trồng, điều kiện canh tác và lịch sử thu hoạch được lưu cùng khu vườn, đồng bộ trên web và điện thoại.</p></div></div>
      <div className="flex flex-wrap gap-2"><Link href={zoneId ? `/dashboard/client/cultivation-zones/${encodeURIComponent(zoneId)}` : "/dashboard/client/cultivation-zones"} className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700">Hủy</Link>{saveButton}</div>
    </section>
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
    {loading ? <p className="p-5 text-sm text-neutral-600"><Loader2 size={16} className="mr-2 inline animate-spin" />Đang tải dữ liệu...</p> : <fieldset disabled={saving || loadFailed} className="min-w-0 space-y-4">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7"><h2 className="text-base font-extrabold text-[#2E5A44]">Thông tin cơ bản</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Trang trại *"><select className={inputClass} value={form.farmId} disabled={editing || farms.length === 0} onChange={event => update("farmId", event.target.value)}><option value="">Chọn trang trại</option>{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name || farm.code || "Trang trại chưa đặt tên"}</option>)}</select></Field>
          <Field label="Tên khu canh tác *"><input className={inputClass} maxLength={160} required value={form.name} onChange={event => update("name", event.target.value)} /></Field>
          <Field label="Mã khu"><input className={inputClass} maxLength={48} value={form.code} onChange={event => update("code", event.target.value)} /></Field>
          <Field label="Diện tích"><div className="flex gap-2"><input className={inputClass} inputMode="decimal" value={form.area} onChange={event => update("area", event.target.value)} /><select aria-label="Đơn vị diện tích" className={inputClass + " max-w-24"} value={form.areaUnit} onChange={event => {
            const next = event.target.value as "m²" | "ha";
            const area = Number(form.area.replace(",", "."));
            setForm(current => ({ ...current, areaUnit: next, area: current.area.trim() && Number.isFinite(area) ? String(area * (next === "ha" ? 0.0001 : 10000)) : current.area }));
          }}><option value="m²">m²</option><option value="ha">ha</option></select></div></Field>
          <Field label="Trạng thái sử dụng"><select className={inputClass} value={form.status} onChange={event => update("status", event.target.value as FarmZoneStatus)}>{statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
          <Field label="Mô tả khu"><textarea className={inputClass + " min-h-24"} maxLength={1000} value={form.description} onChange={event => update("description", event.target.value)} /></Field>
        </div>
        {!farms.length ? <p className="mt-3 text-sm text-amber-800">Bạn cần tạo trang trại trước khi thêm khu canh tác.</p> : null}
        <p className="mt-3 text-xs text-neutral-500">Các thông tin chưa có số liệu có thể để trống và bổ sung sau.</p>
      </section>
      <ZoneAgronomyFields value={form.agronomy} onChange={value => update("agronomy", value)} />
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-end">{saveButton}</div>
    </fieldset>}
  </form>;
}
function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">{label}</span>{children}</label>;
}
const inputClass = "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-[#2E5A44] focus:outline-none focus:ring-2 focus:ring-[#2E5A4420]";
