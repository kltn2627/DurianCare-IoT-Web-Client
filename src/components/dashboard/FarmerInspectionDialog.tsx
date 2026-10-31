"use client";
import { useState } from "react";
import { X, Check } from "lucide-react";
import { cultivationClient } from "@/lib/cultivation/client";

export function FarmerInspectionDialog({ releaseId, onClose, onSaved }: {
  releaseId: string; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [sourceRef, setSourceRef] = useState("");
  const [inspectedAt, setInspectedAt] = useState("");
  const [measuredBrix, setMeasuredBrix] = useState("");
  const [checks, setChecks] = useState({phiChecked: false, pestCheckPassed: false, qualityPassed: false});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
    <form role="dialog" aria-modal="true" aria-label="Tự kiểm tra xuất xưởng" className="w-full max-w-lg space-y-4 rounded-lg bg-white p-5" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try {
        await cultivationClient.inspectExportRelease(releaseId, {sourceRef, inspectedAt: new Date(inspectedAt).toISOString(), ...checks,
          ...(measuredBrix === "" ? {} : {measuredBrix: Number(measuredBrix)})});
        await onSaved(); onClose();
      } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu kiểm tra."); }
      finally { setBusy(false); }
    }}>
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Tự kiểm tra xuất xưởng</h2>
        <button title="Đóng" aria-label="Đóng" type="button" disabled={busy} onClick={onClose}><X size={20}/></button></div>
      <label className="block text-sm">Mã phiếu / tham chiếu biên bản kiểm tra<input required maxLength={500} value={sourceRef} onChange={e=>setSourceRef(e.target.value)} className="mt-1 block w-full rounded border p-2"/></label>
      <label className="block text-sm">Thời điểm kiểm tra thực tế<input required type="datetime-local" value={inspectedAt} onChange={e=>setInspectedAt(e.target.value)} className="mt-1 block w-full rounded border p-2"/></label>
      <label className="block text-sm">Brix đo được (nếu có)<input type="number" min={0} max={100} step="0.1" value={measuredBrix} onChange={e=>setMeasuredBrix(e.target.value)} className="mt-1 block w-full rounded border p-2"/></label>
      {([['phiChecked','Đã đối chiếu thời gian cách ly'],['pestCheckPassed','Kiểm tra sâu bệnh đạt'],['qualityPassed','Độ chín / chất lượng cơm đạt']] as const).map(([key,label])=>
        <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checks[key]} onChange={e=>setChecks({...checks,[key]:e.target.checked})}/>{label}</label>)}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p>:null}
      <button disabled={busy} className="inline-flex h-10 items-center gap-2 rounded bg-[#2E5A44] px-4 font-semibold text-white disabled:opacity-50"><Check size={16}/>{busy ? "Đang lưu…":"Ghi nhận kiểm tra"}</button>
    </form>
  </div>;
}
