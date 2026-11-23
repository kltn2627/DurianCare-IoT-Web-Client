"use client";

import { soilSensorNote } from "@/lib/iot/soil";
import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, Check, Cpu, LoaderCircle, Plus, RefreshCw, Save, Settings2, SlidersHorizontal, Trash2 } from "lucide-react";
import type { IotAlert } from "@/lib/iot/types";
import {
  ALERT_TYPE_LABELS, DELIVERY_LABELS, METRIC_LABELS, SEVERITY_LABELS, iotLifecycleClient, lifecycleErrorMessage,
  validateRuleForm,
  type IotAlertRule, type IotDefaultRule, type IotDeviceConfig, type IotDeviceDetail, type IotMetric, type IotSeverity,
} from "@/lib/iot/lifecycle";

const CONNECTIVITY: Record<string, { label: string; tone: string }> = {
  ONLINE: { label: "Đang kết nối", tone: "bg-green-100 text-green-800" },
  STALE: { label: "Hoạt động hạn chế", tone: "bg-amber-100 text-amber-800" },
  OFFLINE: { label: "Mất kết nối", tone: "bg-red-100 text-red-700" },
  UNKNOWN: { label: "Chưa có dữ liệu", tone: "bg-neutral-100 text-neutral-600" },
};
const STATUS_REASONS: Record<string, string> = {
  TELEMETRY_DELAYED: "Dữ liệu về trễ hơn chu kỳ gửi.",
  NO_DATA_5_MIN: "Không nhận dữ liệu quá 5 phút — kiểm tra nguồn và Wi-Fi.",
  WIFI_WEAK: "Sóng Wi-Fi yếu (dưới −80 dBm).",
};
const SEVERITY_TONE: Record<string, string> = {
  CRITICAL: "border-red-200 bg-red-50 text-red-800",
  WARNING: "border-amber-200 bg-amber-50 text-amber-900",
  INFO: "border-sky-200 bg-sky-50 text-sky-900",
};
const METRICS: IotMetric[] = ["TEMPERATURE", "HUMIDITY", "SOIL_MOISTURE", "LIGHT"];
const UNITS: Record<IotMetric, string> = { TEMPERATURE: "°C", HUMIDITY: "%", SOIL_MOISTURE: "%", LIGHT: "" };

function when(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

/** Device detail for UC80 (status), UC81 (configuration), UC84 (open alerts) and UC85 (thresholds). */
export function IotDevicePanel({ deviceId }: { deviceId: string }) {
  const [device, setDevice] = useState<IotDeviceDetail | null>(null);
  const [alerts, setAlerts] = useState<IotAlert[]>([]);
  const [config, setConfig] = useState<IotDeviceConfig | null>(null);
  const [rules, setRules] = useState<IotAlertRule[]>([]);
  const [defaults, setDefaults] = useState<IotDefaultRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [detail, cfg] = await Promise.all([iotLifecycleClient.getDevice(deviceId), iotLifecycleClient.getConfig(deviceId)]);
      setDevice(detail.device);
      setAlerts(detail.openAlerts ?? []);
      setConfig(cfg.config);
      const ruleList = await iotLifecycleClient.listRules(detail.device.farmId, detail.device.cultivationAreaId);
      setRules(ruleList.rules.filter((r) => !r.deviceId || r.deviceId === detail.device.id));
      setDefaults(ruleList.defaults);
    } catch (cause) {
      setError(lifecycleErrorMessage(cause, "Không thể tải chi tiết thiết bị."));
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  if (loading) return <p className="mt-6 flex items-center gap-2 text-sm text-neutral-500"><LoaderCircle size={16} className="animate-spin" />Đang tải thiết bị…</p>;
  if (error || !device) {
    return <p role="alert" className="mt-6 flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {error ?? "Không tìm thấy thiết bị."}
      <button type="button" onClick={() => { setLoading(true); void load(); }} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-xs"><RefreshCw size={12} />Thử lại</button>
    </p>;
  }

  const status = CONNECTIVITY[device.connectivityStatus ?? "UNKNOWN"] ?? CONNECTIVITY.UNKNOWN;
  const latest = device.latestByMetric;
  return <section className="mt-8 grid gap-6 xl:grid-cols-2">
    <div className="space-y-4 rounded-2xl border border-[#edf1ec] bg-white p-5">
      <h3 className="flex items-center gap-2 text-[13px] font-bold text-[#263a2f]"><Cpu size={16} />THIẾT BỊ</h3>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-extrabold text-neutral-900">{device.name}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.tone}`}>{status.label}</span>
      </div>
      {(device.statusReasons ?? []).length > 0 && <ul className="space-y-0.5 text-xs text-amber-800">
        {(device.statusReasons ?? []).map((reason) => <li key={reason}>• {STATUS_REASONS[reason] ?? reason}</li>)}
      </ul>}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Mã thiết bị" value={device.deviceUid} />
        <Info label="Loại" value={device.deviceType === "CAMERA" ? "Camera" : "Cảm biến"} />
        <Info label="Firmware" value={device.firmwareVersion ?? "Chưa báo"} />
        <Info label="Lần cuối gửi dữ liệu" value={when(device.lastSeenAt)} />
        <Info label="Khu canh tác" value={device.cultivationAreaId ?? "Cả trang trại"} />
        <Info label="Kích hoạt lúc" value={when(device.claimedAt)} />
      </dl>
      {latest ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([["Nhiệt độ", latest.temperature], ["Độ ẩm KK", latest.humidity], ["Độ ẩm đất", latest.soilMoisture], ["Ánh sáng", latest.light]] as const).map(([label, metric]) => (
          <div key={label} className="rounded-xl bg-[#f6f8f5] p-3">
            <p className="text-[11px] font-bold text-neutral-500">{label}</p>
            {label === "Độ ẩm đất" && !metric && soilSensorNote(latest.soilSensor?.status) ? <>
              <p className="text-sm font-bold text-amber-800">{soilSensorNote(latest.soilSensor?.status)}</p>
              <p className="text-[11px] text-neutral-400">Raw {latest.soilSensor?.raw ?? "—"} · {when(latest.soilSensor?.measuredAt ?? null)}</p>
            </> : <>
              <p className="text-lg font-extrabold text-neutral-900">{metric ? `${metric.value}${metric.unit === "raw" ? "" : metric.unit}` : "—"}</p>
              <p className="text-[11px] text-neutral-400">{metric ? when(metric.measuredAt) : "Chưa có"}</p>
            </>}
          </div>
        ))}
      </div> : null}
      <OpenAlerts alerts={alerts} onChanged={load} />
    </div>
    <div className="space-y-6">
      {config ? <ConfigForm deviceId={device.id} config={config} onSaved={setConfig} /> : null}
      <RulesEditor device={device} rules={rules} defaults={defaults} onChanged={load} />
    </div>
  </section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[11px] font-bold text-neutral-500">{label}</dt><dd className="font-semibold text-neutral-800">{value}</dd></div>;
}

function OpenAlerts({ alerts, onChanged }: { alerts: IotAlert[]; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function acknowledge(id: string) {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    try { await iotLifecycleClient.acknowledgeAlert(id); onChanged(); }
    catch (cause) { setError(lifecycleErrorMessage(cause, "Không thể cập nhật cảnh báo.")); }
    finally { setBusyId(null); }
  }
  return <div>
    <h4 className="mb-2 flex items-center gap-2 text-xs font-bold text-neutral-600"><BellRing size={14} />Cảnh báo đang mở ({alerts.length})</h4>
    {alerts.length === 0 ? <p className="text-sm text-neutral-500">Không có cảnh báo.</p> : <ul className="space-y-2">
      {alerts.map((alert) => <li key={alert.id} className={`rounded-xl border p-3 text-sm ${SEVERITY_TONE[alert.severity ?? "WARNING"] ?? SEVERITY_TONE.WARNING}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold">{ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType}</p>
            <p className="text-xs">{alert.message}</p>
            <p className="text-[11px] opacity-75">Từ {when(alert.startedAt)} · gần nhất {when(alert.lastObservedAt)}</p>
          </div>
          {alert.status === "ALERTING" ? <button type="button" disabled={busyId === alert.id} onClick={() => void acknowledge(alert.id)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-current bg-white/70 px-2 py-1 text-xs font-bold disabled:opacity-50">
            {busyId === alert.id ? <LoaderCircle size={12} className="animate-spin" /> : <Check size={12} />}Đã xem</button>
            : <span className="shrink-0 text-xs font-bold">Đã xem</span>}
        </div>
      </li>)}
    </ul>}
    {error ? <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
  </div>;
}

function ConfigForm({ deviceId, config, onSaved }: { deviceId: string; config: IotDeviceConfig; onSaved: (c: IotDeviceConfig) => void }) {
  const [interval, setIntervalValue] = useState(String(config.publishIntervalSeconds ?? 10));
  const [alertsEnabled, setAlertsEnabled] = useState(config.alertsEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const seconds = Number(interval);
    if (!Number.isInteger(seconds) || seconds < 5 || seconds > 3600) return setError("Chu kỳ gửi phải là số nguyên từ 5 đến 3600 giây.");
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try { onSaved((await iotLifecycleClient.saveConfig(deviceId, { publishIntervalSeconds: seconds, alertsEnabled })).config); }
    catch (cause) { setError(lifecycleErrorMessage(cause, "Không thể lưu cấu hình.")); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-3 rounded-2xl border border-[#edf1ec] bg-white p-5">
    <h3 className="flex items-center gap-2 text-[13px] font-bold text-[#263a2f]"><Settings2 size={16} />CẤU HÌNH THIẾT BỊ</h3>
    <label className="block text-sm font-medium">Chu kỳ gửi dữ liệu (giây)
      <input type="number" min={5} max={3600} step={1} value={interval} disabled={busy || !config.deviceSupportsRemoteConfig}
        onChange={(e) => setIntervalValue(e.target.value)} className="mt-1 block h-10 w-40 rounded-lg border border-neutral-300 px-3" /></label>
    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={alertsEnabled} disabled={busy} onChange={(e) => setAlertsEnabled(e.target.checked)} />Bật cảnh báo cho thiết bị này</label>
    <p className="text-xs text-neutral-600">
      Trạng thái: <b>{DELIVERY_LABELS[config.deliveryStatus]}</b>
      {config.configVersion ? ` · phiên bản ${config.configVersion}` : ""}
      {config.appliedAt ? ` · áp dụng lúc ${when(config.appliedAt)}` : ""}
    </p>
    {!config.deviceSupportsRemoteConfig ? <p className="text-xs text-neutral-500">Loại thiết bị này không nhận cấu hình từ xa.</p> : null}
    {error ? <p role="alert" className="text-xs font-semibold text-red-700">{error}</p> : null}
    <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
      {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}Lưu cấu hình</button>
  </form>;
}

function RulesEditor({ device, rules, defaults, onChanged }: {
  device: IotDeviceDetail; rules: IotAlertRule[]; defaults: IotDefaultRule[]; onChanged: () => void;
}) {
  const [metric, setMetric] = useState<IotMetric>("SOIL_MOISTURE");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [hysteresis, setHysteresis] = useState("0");
  const [severity, setSeverity] = useState<IotSeverity>("WARNING");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const num = (text: string) => (text.trim() === "" ? null : Number(text));

  async function run(key: string, work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(key);
    setError(null);
    try { await work(); onChanged(); }
    catch (cause) { setError(lifecycleErrorMessage(cause, "Không thể cập nhật ngưỡng cảnh báo.")); }
    finally { setBusy(null); }
  }

  function add(event: React.FormEvent) {
    event.preventDefault();
    const min = num(minValue);
    const max = num(maxValue);
    const band = Number(hysteresis || 0);
    const invalid = validateRuleForm(metric, min, max, band);
    if (invalid) return setError(invalid);
    void run("add", async () => {
      await iotLifecycleClient.createRule({ farmId: device.farmId, cultivationAreaId: device.cultivationAreaId, deviceId: null,
        metric, minValue: min, maxValue: max, hysteresis: band, severity, notify: true });
      setMinValue(""); setMaxValue(""); setHysteresis("0");
    });
  }

  const scopeLabel = (rule: IotAlertRule) => rule.scope === "DEVICE" ? "Thiết bị" : rule.scope === "ZONE" ? "Khu" : "Trang trại";
  const range = (min: number | null, max: number | null, unit: string) =>
    [min !== null ? `≥ ${min}${unit}` : null, max !== null ? `≤ ${max}${unit}` : null].filter(Boolean).join(" và ") || "—";

  return <div className="space-y-3 rounded-2xl border border-[#edf1ec] bg-white p-5">
    <h3 className="flex items-center gap-2 text-[13px] font-bold text-[#263a2f]"><SlidersHorizontal size={16} />NGƯỠNG CẢNH BÁO</h3>
    <ul className="space-y-2 text-sm">
      {METRICS.map((m) => {
        const own = rules.filter((r) => r.metric === m);
        const fallback = defaults.find((d) => d.metric === m);
        if (own.length === 0) {
          return <li key={m} className="flex justify-between gap-2 rounded-lg bg-[#f6f8f5] px-3 py-2">
            <span className="font-semibold">{METRIC_LABELS[m]}</span>
            <span className="text-neutral-500">{fallback ? `Mặc định: ${range(fallback.minValue, fallback.maxValue, UNITS[m])}` : "Chưa đặt ngưỡng"}</span>
          </li>;
        }
        return own.map((rule) => <li key={rule.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2">
          <span><b>{METRIC_LABELS[m]}</b> · {range(rule.minValue, rule.maxValue, UNITS[m])}
            <span className="text-neutral-500"> · {scopeLabel(rule)} · {SEVERITY_LABELS[rule.severity]}{rule.hysteresis ? ` · đệm ${rule.hysteresis}` : ""}</span></span>
          <span className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={rule.enabled} disabled={busy !== null}
              onChange={(e) => void run(rule.id, () => iotLifecycleClient.updateRule(rule.id, { enabled: e.target.checked }))} />Bật</label>
            <button type="button" aria-label="Xóa ngưỡng" disabled={busy !== null} onClick={() => void run(rule.id, () => iotLifecycleClient.deleteRule(rule.id))}
              className="rounded p-1 text-red-700 disabled:opacity-50"><Trash2 size={14} /></button>
          </span>
        </li>);
      })}
    </ul>
    <form onSubmit={add} className="grid gap-2 sm:grid-cols-6 sm:items-end">
      <label className="text-xs font-medium sm:col-span-2">Chỉ số<select value={metric} onChange={(e) => setMetric(e.target.value as IotMetric)} className="mt-1 block h-9 w-full rounded-lg border border-neutral-300 bg-white px-2">
        {METRICS.map((m) => <option key={m} value={m}>{METRIC_LABELS[m]}</option>)}</select></label>
      <label className="text-xs font-medium">Thấp<input inputMode="decimal" value={minValue} onChange={(e) => setMinValue(e.target.value)} className="mt-1 block h-9 w-full rounded-lg border border-neutral-300 px-2" /></label>
      <label className="text-xs font-medium">Cao<input inputMode="decimal" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} className="mt-1 block h-9 w-full rounded-lg border border-neutral-300 px-2" /></label>
      <label className="text-xs font-medium">Vùng đệm<input inputMode="decimal" value={hysteresis} onChange={(e) => setHysteresis(e.target.value)} className="mt-1 block h-9 w-full rounded-lg border border-neutral-300 px-2" /></label>
      <label className="text-xs font-medium">Mức<select value={severity} onChange={(e) => setSeverity(e.target.value as IotSeverity)} className="mt-1 block h-9 w-full rounded-lg border border-neutral-300 bg-white px-2">
        {(["INFO", "WARNING", "CRITICAL"] as IotSeverity[]).map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}</select></label>
      <button type="submit" disabled={busy !== null} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-emerald-800 px-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-6 sm:w-fit">
        {busy === "add" ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}Thêm ngưỡng cho {device.cultivationAreaId ? "khu này" : "trang trại"}</button>
    </form>
    {error ? <p role="alert" className="text-xs font-semibold text-red-700">{error}</p> : null}
  </div>;
}
