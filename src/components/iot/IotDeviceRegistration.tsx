"use client";

import { useRef, useState } from "react";
import { KeyRound, LoaderCircle, Plus, X } from "lucide-react";
import { farmZoneClient } from "@/lib/cultivation/client";
import type { FarmCatalog } from "@/lib/cultivation/types";
import { iotLifecycleClient, lifecycleErrorMessage } from "@/lib/iot/lifecycle";
import { Toast } from "@/components/feedback/Toast";

const UID_PATTERN = /^[A-Za-z0-9._:-]{3,150}$/;
const CODE_PATTERN = /^[0-9A-Za-z]{5}-?[0-9A-Za-z]{5}$/;

/** Adds a provisioned device to a farm/zone the farmer manages, using its one-time activation code. */
export function IotDeviceRegistration({ onRegistered }: { onRegistered: () => void }) {
  const [open, setOpen] = useState(false);
  const [farms, setFarms] = useState<FarmCatalog[]>([]);
  const [farmId, setFarmId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [deviceUid, setDeviceUid] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inFlight = useRef(false);
  const zones = farms.find((farm) => farm.id === farmId)?.zones ?? [];

  async function openForm() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const result = await farmZoneClient.listFarms();
      setFarms(result);
      setFarmId(result.length === 1 ? result[0].id : "");
    } catch { setError("Không thể tải trang trại. Vui lòng thử lại."); }
    finally { setLoading(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!UID_PATTERN.test(deviceUid.trim())) return setError("Mã thiết bị không hợp lệ.");
    if (!CODE_PATTERN.test(claimCode.trim())) return setError("Mã kích hoạt gồm 10 ký tự, ví dụ ABCDE-12345.");
    if (!farms.some((farm) => farm.id === farmId)) return setError("Chọn trang trại.");
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await iotLifecycleClient.claimDevice({
        deviceUid: deviceUid.trim(), claimCode: claimCode.trim(), farmId, cultivationAreaId: zoneId || null, name: name.trim() || null,
      });
      if (result.device?.provisioningStatus !== "CLAIMED" || result.device.farmId !== farmId) throw new Error("Unexpected device scope");
      setSuccess(`Đã thêm thiết bị ${result.device.name}.`);
      setOpen(false);
      setDeviceUid("");
      setClaimCode("");
      setName("");
      onRegistered();
    } catch (cause) {
      setError(lifecycleErrorMessage(cause, "Không thể kích hoạt thiết bị. Vui lòng thử lại."));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const input = "mt-1 block h-11 w-full rounded-lg border border-neutral-300 bg-white px-3";
  return <section className="mb-4 border-b border-neutral-200 pb-4">
    {success && <Toast message={success} onClose={() => setSuccess(null)} />}
    {!open ? <button type="button" onClick={() => void openForm()} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold"><Plus size={16} />Thêm thiết bị</button> :
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-base font-bold">Thêm thiết bị bằng mã kích hoạt</h2><button type="button" disabled={busy} onClick={() => setOpen(false)} aria-label="Đóng" title="Đóng" className="rounded p-2"><X size={18} /></button></div>
        {loading ? <p className="flex items-center gap-2 text-sm text-neutral-600"><LoaderCircle size={16} className="animate-spin" />Đang tải trang trại…</p> : <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Mã thiết bị<input required maxLength={150} value={deviceUid} disabled={busy} onChange={(e) => setDeviceUid(e.target.value)} placeholder="esp32-01" className={input} /></label>
            <label className="text-sm font-medium">Mã kích hoạt<input required maxLength={11} value={claimCode} disabled={busy} onChange={(e) => setClaimCode(e.target.value.toUpperCase())} placeholder="ABCDE-12345" autoComplete="off" className={`${input} font-mono tracking-wider`} /></label>
            <label className="text-sm font-medium">Trang trại<select required value={farmId} disabled={busy} onChange={(e) => { setFarmId(e.target.value); setZoneId(""); }} className={input}><option value="">Chọn trang trại</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name ?? farm.id}</option>)}</select></label>
            <label className="text-sm font-medium">Khu canh tác<select value={zoneId} disabled={busy || !farmId} onChange={(e) => setZoneId(e.target.value)} className={input}><option value="">Cả trang trại</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name ?? zone.id}</option>)}</select></label>
            <label className="text-sm font-medium sm:col-span-2">Tên thiết bị (tùy chọn)<input maxLength={160} value={name} disabled={busy} onChange={(e) => setName(e.target.value)} placeholder="Trạm cảm biến khu Bắc" className={input} /></label>
          </div>
          <button type="submit" disabled={busy || !farmId} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <KeyRound size={16} />}Kích hoạt</button>
        </>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {!loading && farms.length === 0 && !error && <p className="text-sm text-neutral-600">Chưa có trang trại được phép quản lý.</p>}
      </form>}
  </section>;
}
