"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Bell, Droplets, RefreshCw, SunMedium, ThermometerSun } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { iotClient } from "@/lib/iot/client";
import type { IotAlert, IotDevice, IotTelemetryReading } from "@/lib/iot/types";

const HISTORY_LIMIT = 288;

export function SensorCharts() {
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [alerts, setAlerts] = useState<IotAlert[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [latest, setLatest] = useState<IotTelemetryReading | null>(null);
  const [history, setHistory] = useState<IotTelemetryReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? devices[0] ?? null,
    [devices, selectedDeviceId],
  );
  const chartData = history.map((reading) => ({
    airHumidity: reading.humidity,
    light: reading.light,
    temperature: reading.temperature,
    time: reading.measuredAt ? new Date(reading.measuredAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "--",
  }));

  async function loadDevices() {
    setLoading(true);
    setError(null);
    try {
      const response = await iotClient.listDevices();
      setDevices(response.devices);
      setSelectedDeviceId((current) =>
        response.devices.some((device) => device.id === current) ? current : response.devices[0]?.id ?? "",
      );
      if (response.devices.length === 0) {
        setLatest(null);
        setHistory([]);
      }
    } catch (loadError) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadAlerts() {
    try {
      const response = await iotClient.listAlerts("ALERTING");
      setAlerts(response.alerts);
    } catch {
      setAlerts([]);
    }
  }

  async function loadTelemetry(deviceId: string) {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const [latestResponse, historyResponse] = await Promise.all([
        iotClient.latestTelemetry(deviceId),
        iotClient.telemetryHistory(deviceId, { limit: HISTORY_LIMIT }),
      ]);
      setLatest(latestResponse.telemetry);
      setHistory(historyResponse.telemetry);
    } catch (loadError) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    await Promise.all([loadDevices(), loadAlerts()]);
    if (selectedDeviceId) await loadTelemetry(selectedDeviceId);
  }

  useEffect(() => {
    void loadDevices();
    void loadAlerts();
  }, []);

  useEffect(() => {
    if (selectedDeviceId) void loadTelemetry(selectedDeviceId);
  }, [selectedDeviceId]);

  return (
    <section id="sensors" className="panel scroll-mt-24 p-7 lg:p-8">
      <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
        <div className="flex items-center gap-7">
          <span className="grid size-10 place-items-center rounded-xl bg-[#e8f0e9] text-[#2E5A44]"><Activity size={20} /></span>
          <div>
            <h2 className="text-[15px] font-bold">Giám sát cảm biến IoT</h2>
            <p className="mt-1 text-[13px] text-[#7e8b83]">Dữ liệu thật từ telemetry registry và history API</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-4 rounded-full bg-[#eaf4ec] px-4 py-2 text-sm font-extrabold tracking-[1px] text-[#37704f]">
            <i className={`size-1.5 rounded-full ${latest ? "bg-[#4b9666]" : "bg-[#c89b28]"}`} /> REAL API
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#fff6db] px-4 py-2 text-sm font-extrabold text-[#8a6810]">
            {selectedDevice?.status ?? "NO_DEVICE"} · {selectedDevice?.connectivityStatus ?? "UNKNOWN"}
          </span>
          <button onClick={refresh} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dfe5de] bg-white px-4 text-[13px] font-bold">
            <RefreshCw size={14} /> Làm mới
          </button>
          <select
            value={selectedDevice?.id ?? ""}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
            className="h-9 rounded-xl border border-[#dfe5de] bg-white px-4 text-[13px] font-bold outline-none"
          >
            {devices.length === 0 ? <option value="">Chưa có thiết bị</option> : null}
            {devices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      </div>

      {error ? <p className="mt-5 rounded-2xl bg-[#fff6db] px-4 py-3 text-[13px] font-bold text-[#6d5619]">{error}</p> : null}
      {!error && !loading && devices.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-[#edf3ee] px-4 py-3 text-[13px] font-bold text-[#536259]">
          Không có thiết bị IoT nào nằm trong farm/khu bạn được quyền xem. Web không dùng dữ liệu mẫu.
        </p>
      ) : null}

      <div className="mt-7 grid gap-7 sm:grid-cols-3">
        <MetricCard icon={ThermometerSun} label="Nhiệt độ hiện tại" unit="°C" value={latest?.temperature ?? null} tone="yellow" />
        <MetricCard icon={Droplets} label="Độ ẩm không khí" unit="%" value={latest?.humidity ?? null} tone="green" />
        <MetricCard icon={SunMedium} label="Ánh sáng" unit="raw" value={latest?.light ?? null} tone="blue" />
      </div>

      <div className="mt-7 rounded-2xl border border-[#edf1ec] bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#fff6db] text-[#a47c12]"><Bell size={17} /></span>
          <div>
            <h3 className="text-[13px] font-bold text-[#263a2f]">Cảnh báo IoT đang mở</h3>
            <p className="text-[12px] font-semibold text-[#7e8b83]">Nguồn thật từ alert API, không dùng mock fallback</p>
          </div>
        </div>
        {alerts.length === 0 ? (
          <p className="rounded-xl bg-[#edf3ee] px-4 py-3 text-[13px] font-bold text-[#536259]">Không có alert IoT đang mở.</p>
        ) : (
          <div className="grid gap-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="rounded-xl border border-[#edf1ec] p-4">
                <div className="flex items-center justify-between gap-4">
                  <b className="text-[13px] text-[#263a2f]">{alert.alertType}</b>
                  <span className="text-[12px] font-bold text-[#a47c12]">{alert.status}</span>
                </div>
                <p className="mt-1 text-[13px] font-semibold text-[#66756c]">{alert.deviceName} · {alert.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-10 xl:grid-cols-[1.45fr_1fr]">
        <div>
          <h3 className="mb-4 text-[13px] font-bold text-[#536259]">BIẾN THIÊN NHIỆT ĐỘ</h3>
          <div className="h-[260px]">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 260 }}>
                <LineChart data={chartData} margin={{ left: -25, right: 10 }}>
                  <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#7d8a82" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#7d8a82" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe6df", fontSize: 14 }} />
                  <Line connectNulls type="monotone" dataKey="temperature" name="Nhiệt độ °C" stroke="#D6A928" strokeWidth={3} dot={{ r: 3, fill: "#D6A928" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-[13px] font-bold text-[#536259]">ĐỘ ẨM & ÁNH SÁNG</h3>
          <div className="h-[260px]">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height: 260 }}>
                <BarChart data={chartData} margin={{ left: -25 }}>
                  <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7d8a82" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7d8a82" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe6df", fontSize: 14 }} />
                  <Bar dataKey="airHumidity" name="Độ ẩm %" fill="#78966A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="light" name="Ánh sáng raw" fill="#2E5A44" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  tone,
  unit,
  value,
}: {
  icon: typeof ThermometerSun;
  label: string;
  tone: "blue" | "green" | "yellow";
  unit: string;
  value: number | null;
}) {
  const palette = {
    blue: "bg-[#eef4f4] text-[#477681]",
    green: "bg-[#edf3ee] text-[#2E5A44]",
    yellow: "bg-[#fbf5d8] text-[#a47c12]",
  }[tone];
  return (
    <div className={`rounded-2xl p-5 ${palette}`}>
      <Icon size={18} />
      <small className="mt-5 block text-[15px]">{label}</small>
      <b className="mt-1 block text-xl">{value === null ? "--" : `${formatValue(value)} ${unit}`}</b>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[#dfe5de] px-6 text-center text-[13px] font-bold text-[#7d8a82]">
      Chưa đủ dữ liệu history để vẽ chart. Không dùng sample chart.
    </div>
  );
}

function formatValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Không thể tải dữ liệu IoT.";
}
