"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, KeyRound, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { iotLifecycleClient, lifecycleErrorMessage, type IotAdminDevice } from "@/lib/iot/lifecycle";

function when(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** UC79 (administrator side): register a device and hand out its one-time activation code. */
export function AdminDeviceInventory() {
  const [devices, setDevices] = useState<IotAdminDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceUid, setDeviceUid] = useState("");
  const [deviceType, setDeviceType] = useState<"SENSOR" | "CAMERA">("SENSOR");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ deviceUid: string; code: string; expiresAt: string } | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try { setDevices((await iotLifecycleClient.listAdminDevices()).devices); }
    catch (cause) { setError(lifecycleErrorMessage(cause, "Không thể tải danh sách thiết bị.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  async function run(key: string, work: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(key);
    setError(null);
    try { await work(); await load(); }
    catch (cause) { setError(lifecycleErrorMessage(cause, "Không thể thực hiện thao tác.")); }
    finally { inFlight.current = false; setBusy(null); }
  }

  function provision(event: React.FormEvent) {
    event.preventDefault();
    if (!/^[A-Za-z0-9._:-]{3,150}$/.test(deviceUid.trim())) return setError("Mã thiết bị gồm 3–150 ký tự chữ, số, dấu chấm, gạch dưới, hai chấm hoặc gạch ngang.");
    void run("provision", async () => {
      const result = await iotLifecycleClient.provisionDevice({ deviceUid: deviceUid.trim(), deviceType, name: name.trim() || null });
      setIssued({ deviceUid: result.device.deviceUid, code: result.claimCode, expiresAt: result.claimCodeExpiresAt });
      setDeviceUid("");
      setName("");
    });
  }

  function regenerate(device: IotAdminDevice) {
    void run(device.id, async () => {
      const result = await iotLifecycleClient.regenerateClaimCode(device.id);
      setIssued({ deviceUid: device.deviceUid, code: result.claimCode, expiresAt: result.claimCodeExpiresAt });
    });
  }

  const input = "mt-1 block h-11 w-full rounded-lg border border-neutral-300 bg-white px-3";
  return <div className="space-y-6">
    <section className="panel p-5 sm:p-7">
      <h1 className="text-xl font-extrabold text-neutral-900">Thiết bị IoT</h1>
      <form onSubmit={provision} className="mt-5 grid gap-3 sm:grid-cols-[1fr_160px_1fr_auto] sm:items-end">
        <label className="text-sm font-medium">Mã thiết bị<input value={deviceUid} maxLength={150} onChange={(e) => setDeviceUid(e.target.value)} placeholder="esp32-02" className={input} /></label>
        <label className="text-sm font-medium">Loại<select value={deviceType} onChange={(e) => setDeviceType(e.target.value as "SENSOR" | "CAMERA")} className={input}><option value="SENSOR">Cảm biến</option><option value="CAMERA">Camera</option></select></label>
        <label className="text-sm font-medium">Tên (tùy chọn)<input value={name} maxLength={160} onChange={(e) => setName(e.target.value)} className={input} /></label>
        <button type="submit" disabled={busy !== null} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-50">
          {busy === "provision" ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}Đăng ký</button>
      </form>
      {issued ? <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">Mã kích hoạt cho {issued.deviceUid} (chỉ hiển thị một lần, hết hạn {when(issued.expiresAt)}):</p>
        <p className="mt-2 flex items-center gap-3 font-mono text-2xl font-extrabold tracking-widest text-emerald-950">{issued.code}
          <button type="button" aria-label="Sao chép mã" onClick={() => void navigator.clipboard?.writeText(issued.code)} className="rounded-lg border border-emerald-300 bg-white p-2 text-emerald-900"><Copy size={16} /></button></p>
      </div> : null}
      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </section>

    <section className="panel p-5 sm:p-7">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-neutral-900">Danh sách thiết bị</h2>
        <button type="button" onClick={() => { setLoading(true); void load(); }} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold"><RefreshCw size={12} />Tải lại</button>
      </div>
      {loading ? <p className="flex items-center gap-2 text-sm text-neutral-500"><LoaderCircle size={16} className="animate-spin" />Đang tải…</p>
        : devices.length === 0 ? <p className="text-sm text-neutral-500">Chưa có thiết bị.</p>
          : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="border-b border-neutral-200 text-xs font-bold text-neutral-500">
              <th className="py-2 pr-3">Mã thiết bị</th><th className="py-2 pr-3">Loại</th><th className="py-2 pr-3">Trạng thái</th>
              <th className="py-2 pr-3">Trang trại / khu</th><th className="py-2 pr-3">Mã kích hoạt</th><th className="py-2" /></tr></thead>
            <tbody>{devices.map((device) => <tr key={device.id} className="border-b border-neutral-100 last:border-0">
              <td className="py-2 pr-3 font-bold">{device.deviceUid}<span className="block text-xs font-normal text-neutral-500">{device.name}</span></td>
              <td className="py-2 pr-3">{device.deviceType === "CAMERA" ? "Camera" : "Cảm biến"}</td>
              <td className="py-2 pr-3">{device.provisioningStatus === "CLAIMED" ? `Đã kích hoạt ${when(device.claimedAt)}` : "Chờ kích hoạt"}</td>
              <td className="py-2 pr-3">{device.farmId ? `${device.farmId}${device.cultivationAreaId ? ` / ${device.cultivationAreaId}` : ""}` : "—"}</td>
              <td className="py-2 pr-3">{device.provisioningStatus === "PROVISIONED"
                ? device.claimCodeStatus === "PENDING" ? `Còn hạn đến ${when(device.claimCodeExpiresAt)}` : "Chưa có mã hợp lệ" : "Đã dùng"}</td>
              <td className="py-2 text-right">{device.provisioningStatus === "PROVISIONED" ? <button type="button" disabled={busy !== null} onClick={() => regenerate(device)}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1 text-xs font-bold disabled:opacity-50">
                {busy === device.id ? <LoaderCircle size={12} className="animate-spin" /> : <KeyRound size={12} />}Cấp mã mới</button> : null}</td>
            </tr>)}</tbody></table></div>}
    </section>
  </div>;
}
