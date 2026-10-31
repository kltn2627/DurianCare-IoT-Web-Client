"use client";

import { useEffect, useMemo, useState } from "react";
import { cultivationClient } from "@/lib/cultivation/client";
import type { AgriculturalInput, CultivationActivity } from "@/lib/cultivation/types";
import { activityTypeLabels } from "./labels";
import { buildCompletionPayload, emptyUsage, requiresRecordedInput, type CompletionDraft } from "./completionForm";

const fieldClass = "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950";
const localNow = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function CompleteActivityDialog({ activity, actorId, actorName, onClose, onSubmit }: {
  activity: CultivationActivity | null;
  actorId: string;
  actorName: string;
  onClose: () => void;
  onSubmit: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CompletionDraft>({ startedAt: "", completedAt: "", actualArea: "", areaUnit: "ha", notes: "", inputUsages: [] });
  const [catalog, setCatalog] = useState<AgriculturalInput[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activity) return;
    let active = true;
    const now = localNow();
    setDraft({ startedAt: now, completedAt: now, actualArea: "", areaUnit: "ha", notes: "", inputUsages: requiresRecordedInput(activity.activityType) ? [emptyUsage()] : [] });
    setFormError("");
    setCatalog([]);
    setCatalogError(false);
    setCatalogLoading(true);
    cultivationClient.listAgriculturalInputs({ status: "VERIFIED" })
      .then((items) => { if (active) setCatalog(items.filter((item) => item.status === "VERIFIED")); })
      .catch(() => { if (active) setCatalogError(true); })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [activity]);

  const byId = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);
  if (!activity) return null;
  const updateUsage = (index: number, changes: Partial<CompletionDraft["inputUsages"][number]>) =>
    setDraft((current) => ({ ...current, inputUsages: current.inputUsages.map((usage, position) => position === index ? { ...usage, ...changes } : usage) }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    try {
      if (catalogError) throw new Error("Không thể tải danh mục vật tư.");
      const payload = buildCompletionPayload(activity.activityType, draft, catalog, actorId);
      setSubmitting(true);
      await onSubmit(activity.id, payload);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể hoàn thành công việc.");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" role="dialog" aria-modal="true" aria-label="Hoàn thành công việc">
    <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
      <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Hoàn thành: {activity.title}</h2><p className="text-sm text-neutral-600">{activityTypeLabels[activity.activityType]}</p></div><button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng">✕</button></div>
      <form onSubmit={submit} className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2"><h3 className="sm:col-span-2 font-bold">Thông tin thực hiện</h3>
          <label className="text-sm">Bắt đầu<input required type="datetime-local" className={fieldClass} value={draft.startedAt} onChange={(event) => setDraft({ ...draft, startedAt: event.target.value })} /></label>
          <label className="text-sm">Hoàn thành<input required type="datetime-local" className={fieldClass} value={draft.completedAt} onChange={(event) => setDraft({ ...draft, completedAt: event.target.value })} /></label>
          <label className="text-sm">Người thực hiện<input className={fieldClass} readOnly value={actorName || actorId} /></label>
          <label className="text-sm">Diện tích thực hiện<input type="number" min="0" step="any" className={fieldClass} value={draft.actualArea} onChange={(event) => setDraft({ ...draft, actualArea: event.target.value })} /></label>
          <label className="text-sm">Đơn vị diện tích<input className={fieldClass} value={draft.areaUnit} onChange={(event) => setDraft({ ...draft, areaUnit: event.target.value })} /></label>
          <label className="text-sm sm:col-span-2">Ghi chú<textarea className={fieldClass} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
        </section>
        <section className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-bold">Vật tư đã sử dụng {requiresRecordedInput(activity.activityType) ? "*" : ""}</h3><button type="button" className="text-sm font-semibold text-emerald-800" onClick={() => setDraft({ ...draft, inputUsages: [...draft.inputUsages, emptyUsage()] })}>+ Thêm vật tư</button></div>
          {catalogLoading ? <p>Đang tải danh mục vật tư...</p> : catalogError ? <p role="alert">Không thể tải danh mục vật tư.</p> : catalog.length === 0 ? <p>Chưa có vật tư trong danh mục.</p> : null}
          {draft.inputUsages.map((usage, index) => { const input = byId.get(usage.agriculturalInputId); return <div key={index} className="rounded-xl border border-neutral-200 p-3 space-y-3">
            <label className="block text-sm">Sản phẩm<select className={fieldClass} value={usage.agriculturalInputId} onChange={(event) => { const selected = byId.get(event.target.value); updateUsage(index, { agriculturalInputId: event.target.value, quantityUnit: selected?.unit ?? "" }); }}><option value="">Chọn vật tư</option>{catalog.map((item) => <option key={item.id} value={item.id}>{item.tradeName || item.productName} · {item.category}</option>)}</select></label>
            {input ? <p className="text-xs text-neutral-600">Loại: {input.category} · Nhà sản xuất: {input.manufacturer || "—"} · Số đăng ký: {input.registrationNumber || "—"}<br />Hoạt chất: {input.activeIngredients?.map((ingredient) => ingredient.name).join(", ") || "—"} · PHI: {input.preHarvestIntervalDays ?? "—"} ngày · Liều khuyến nghị: {input.recommendedDose || "—"}</p> : null}
            <div className="grid gap-2 sm:grid-cols-3"><label className="text-sm">Số lượng<input type="number" min="0" step="any" className={fieldClass} value={usage.quantityUsed} onChange={(event) => updateUsage(index, { quantityUsed: event.target.value })} /></label><label className="text-sm">Đơn vị<input className={fieldClass} value={usage.quantityUnit} onChange={(event) => updateUsage(index, { quantityUnit: event.target.value })} /></label><label className="text-sm">Batch/Lot<input className={fieldClass} value={usage.batchNumber} onChange={(event) => updateUsage(index, { batchNumber: event.target.value })} /></label></div>
            <button type="button" className="text-sm text-red-700" onClick={() => setDraft({ ...draft, inputUsages: draft.inputUsages.filter((_, position) => position !== index) })}>Xóa dòng</button>
          </div>; })}
        </section>
        {formError ? <p role="alert" className="text-sm text-red-700">{formError}</p> : null}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border px-4 py-2">Hủy</button><button type="submit" disabled={submitting || catalogLoading || catalogError} className="rounded-xl bg-[#2E5A44] px-4 py-2 font-bold text-white disabled:opacity-50">{submitting ? "Đang lưu..." : "Ghi hoàn thành"}</button></div>
      </form>
    </div>
  </div>;
}
