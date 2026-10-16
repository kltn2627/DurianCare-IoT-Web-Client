"use client";

import { useState } from "react";
import { LoaderCircle, Plus, X } from "lucide-react";
import { farmZoneClient } from "@/lib/cultivation/client";
import type { FarmCatalog } from "@/lib/cultivation/types";
import { iotClient, IotApiError } from "@/lib/iot/client";
import { friendlyApiMessage } from "@/lib/feedback";
import { Toast } from "@/components/feedback/Toast";

export function IotDeviceRegistration({ onRegistered }: { onRegistered: () => void }) {
  const [open, setOpen] = useState(false);
  const [farms, setFarms] = useState<FarmCatalog[]>([]);
  const [farmId, setFarmId] = useState("");
  const [deviceUid, setDeviceUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    if (busy) return;
    if (!/^[A-Za-z0-9._:-]{3,150}$/.test(deviceUid.trim()) || !farms.some(farm => farm.id === farmId)) {
      setError("Chọn trang trại và nhập mã thiết bị hợp lệ.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await iotClient.registerDevice(deviceUid, farmId);
      if (!result.device?.id || result.device.farmId !== farmId || result.device.deviceUid.toLowerCase() !== deviceUid.trim().toLowerCase()) {
        throw new Error("Unexpected device scope");
      }
      setSuccess("Đã đăng ký thiết bị.");
      setOpen(false);
      setDeviceUid("");
      onRegistered();
    } catch (cause) {
      setError(cause instanceof IotApiError && cause.status === 409 ? "Mã thiết bị đã được đăng ký. Vui lòng kiểm tra danh sách trước khi thử lại." :
        friendlyApiMessage(cause instanceof IotApiError ? cause : null, "general", "Không thể đăng ký thiết bị. Vui lòng kiểm tra mã và quyền trang trại."));
    } finally { setBusy(false); }
  }

  return <section className="mb-4 border-b border-neutral-200 pb-4">
    {success && <Toast message={success} onClose={() => setSuccess(null)} />}
    {!open ? <button type="button" onClick={() => void openForm()} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold"><Plus size={16} />Đăng ký thiết bị</button> :
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-base font-bold">Đăng ký thiết bị</h2><button type="button" disabled={busy} onClick={() => setOpen(false)} aria-label="Đóng đăng ký thiết bị" title="Đóng" className="rounded p-2"><X size={18} /></button></div>
        {loading ? <p className="flex items-center gap-2 text-sm text-neutral-600"><LoaderCircle size={16} className="animate-spin" />Đang tải trang trại…</p> : <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm font-medium">Mã thiết bị<input required minLength={3} maxLength={150} pattern="[A-Za-z0-9._:-]+" value={deviceUid} disabled={busy} onChange={event => setDeviceUid(event.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-neutral-300 px-3" /></label>
          <label className="text-sm font-medium">Trang trại<select required value={farmId} disabled={busy} onChange={event => setFarmId(event.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-neutral-300 bg-white px-3"><option value="">Chọn trang trại</option>{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name ?? farm.id}</option>)}</select></label>
          <button type="submit" disabled={busy || !farmId} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}Đăng ký</button>
        </div>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {!loading && farms.length === 0 && !error && <p className="text-sm text-neutral-600">Chưa có trang trại được phép quản lý.</p>}
      </form>}
  </section>;
}
