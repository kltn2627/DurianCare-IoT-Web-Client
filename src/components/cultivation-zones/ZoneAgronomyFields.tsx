"use client";

import type { FarmZoneAgronomy, HarvestForm, ZoneAgronomyForm } from "@/lib/cultivation/zoneAgronomy";
import { agronomyFields, agronomyGroups, agronomyFacts, newHarvestForm, todayLocal, treeAgeLabel } from "@/lib/cultivation/zoneAgronomy";

const inputClass = "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-[#2E5A44] focus:outline-none focus:ring-2 focus:ring-[#2E5A4420]";
const harvestFields: Array<{ key: keyof HarvestForm; label: string; type?: string; maxLength?: number }> = [
  { key: "seasonName", label: "Tên mùa vụ *", maxLength: 160 }, { key: "harvestYear", label: "Năm thu hoạch *", type: "number" },
  { key: "harvestedAt", label: "Ngày thu hoạch", type: "date" }, { key: "yieldValue", label: "Sản lượng", type: "number" },
  { key: "qualityNote", label: "Chất lượng", maxLength: 1000 }, { key: "notes", label: "Ghi chú mùa vụ", maxLength: 2000 },
];

export function ZoneAgronomyFields({ value, onChange }: { value: ZoneAgronomyForm; onChange: (value: ZoneAgronomyForm) => void }) {
  const updateHarvest = (index: number, patch: Partial<HarvestForm>) =>
    onChange({ ...value, harvestHistories: value.harvestHistories.map((row, i) => i === index ? { ...row, ...patch } : row) });
  return <>
    {agronomyGroups.map(group => <section key={group} className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7">
      <h2 className="text-base font-extrabold text-[#2E5A44]">{group}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {agronomyFields.filter(field => field.group === group).map(field => <label key={field.key} className={field.kind === "multiline" ? "block sm:col-span-2" : "block"}>
          <span className="mb-1.5 block text-xs font-bold text-neutral-700">{field.label}</span>
          {field.options ? <select className={inputClass} value={value[field.key]} onChange={event => onChange({ ...value, [field.key]: event.target.value })}>
            <option value="">Chưa cập nhật</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select> : field.kind === "multiline" ? <textarea className={inputClass + " min-h-24"} maxLength={field.maxLength} value={value[field.key]} onChange={event => onChange({ ...value, [field.key]: event.target.value })} /> :
            <input className={inputClass} type={field.kind === "date" ? "date" : field.kind === "integer" ? "number" : "text"} min={field.kind === "integer" ? 0 : undefined} max={field.kind === "date" ? todayLocal() : undefined} step={field.kind === "integer" ? 1 : undefined} maxLength={field.maxLength} value={value[field.key]} onChange={event => onChange({ ...value, [field.key]: event.target.value })} />}
        </label>)}
      </div>
      {group === "Thông tin cây trồng" ? <p className="mt-4 rounded-xl bg-[#edf3ee] p-3 text-sm text-[#2E5A44]">Tuổi cây: {treeAgeLabel(value.plantingDate)}</p> : null}
    </section>)}
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-extrabold text-[#2E5A44]">Lịch sử thu hoạch ({value.harvestHistories.length})</h2>
        <button type="button" disabled={value.harvestHistories.length >= 100} onClick={() => onChange({ ...value, harvestHistories: [...value.harvestHistories, newHarvestForm()] })} className="rounded-xl bg-[#edf3ee] px-4 py-2.5 text-sm font-bold text-[#2E5A44] disabled:opacity-50">Thêm lần thu hoạch</button></div>
      <p className="mt-2 text-sm text-neutral-500">Ghi lại các lần đã thu hoạch. Mùa vụ đang theo dõi vẫn được quản lý riêng.</p>
      {value.harvestHistories.map((row, index) => <div key={row.id} className="mt-4 rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold">Lần thu hoạch {index + 1}</h3><button type="button" aria-label={`Xóa lần thu hoạch ${index + 1}`} onClick={() => onChange({ ...value, harvestHistories: value.harvestHistories.filter((_, i) => i !== index) })} className="px-3 py-2 text-sm font-bold text-red-700">Xóa</button></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{harvestFields.map(field => <label key={field.key}><span className="mb-1 block text-xs font-bold text-neutral-700">{field.label}</span>
          <input className={inputClass} type={field.type ?? "text"} min={field.key === "harvestYear" ? 1900 : field.type === "number" ? 0 : undefined} max={field.type === "date" ? todayLocal() : field.key === "harvestYear" ? new Date().getFullYear() : undefined} step={field.key === "yieldValue" ? "any" : field.type === "number" ? 1 : undefined} maxLength={field.maxLength} value={row[field.key]} onChange={event => updateHarvest(index, { [field.key]: event.target.value })} />
        </label>)}<label><span className="mb-1 block text-xs font-bold text-neutral-700">Đơn vị sản lượng</span><select className={inputClass} value={row.yieldUnit} onChange={event => updateHarvest(index, { yieldUnit: event.target.value })}><option value="">Chưa chọn</option><option value="tấn">Tấn</option><option value="kg">Kg</option></select></label></div>
      </div>)}
    </section>
  </>;
}

export function ZoneAgronomyDetails({ value }: { value?: FarmZoneAgronomy | null }) {
  return <>
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7"><h2 className="text-base font-extrabold text-[#2E5A44]">Hồ sơ canh tác</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[...agronomyFacts(value), { label: "Tuổi cây", value: treeAgeLabel(value?.plantingDate) }].map(fact => <div key={fact.label} className="min-w-0 rounded-xl bg-neutral-50 p-3"><dt className="text-xs font-bold text-neutral-500">{fact.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-neutral-900">{fact.value}</dd></div>)}</dl>
      {value?.imageUrls?.length ? <div className="mt-5 grid gap-3 sm:grid-cols-3">{value.imageUrls.filter(url => /^https?:\/\//.test(url)).map((url, i) => <a key={url + i} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-neutral-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`Ảnh khu canh tác ${i + 1}`} loading="lazy" className="h-44 w-full object-cover" /><span className="block p-2 text-xs font-bold text-[#2E5A44]">Xem ảnh {i + 1}</span>
      </a>)}</div> : null}
    </section>
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7"><h2 className="text-base font-extrabold text-[#2E5A44]">Lịch sử thu hoạch ({value?.harvestHistories?.length ?? 0})</h2>
      {value?.harvestHistories?.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{value.harvestHistories.map((row, i) => <div key={row.id ?? i} className="rounded-xl bg-neutral-50 p-4"><h3 className="font-bold text-neutral-900">{row.seasonName} · {row.harvestYear}</h3><p className="mt-2 text-sm">Ngày thu hoạch: {row.harvestedAt || "Chưa cập nhật"}</p><p className="mt-1 text-sm">Sản lượng: {row.yieldValue == null ? "Chưa cập nhật" : `${row.yieldValue} ${row.yieldUnit ?? ""}`}</p><p className="mt-1 whitespace-pre-wrap text-sm">Chất lượng: {row.qualityNote || "Chưa cập nhật"}</p><p className="mt-1 whitespace-pre-wrap text-sm">Ghi chú: {row.notes || "Chưa cập nhật"}</p></div>)}</div> : <p className="mt-3 text-sm text-neutral-500">Chưa có lịch sử thu hoạch.</p>}
    </section>
  </>;
}

