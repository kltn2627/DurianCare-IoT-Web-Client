"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Droplets, RefreshCw, SunMedium, ThermometerSun } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { iotClient } from "@/lib/iot/client";
import type { IotDevice, IotTelemetryReading } from "@/lib/iot/types";
import { chartReadings, formatTimeLabel, historyQueryForRange } from "@/lib/iot/ranges";
import { completeTelemetryHistory, loadDashboardHistory } from "@/lib/iot/history";
import { IotDeviceRegistration } from "@/components/iot/IotDeviceRegistration";

const POLL_INTERVAL_MS = 8000;
const FALLBACK_DEVICE_ID = process.env.NEXT_PUBLIC_DEFAULT_IOT_DEVICE_ID ?? "esp32-01";
const CONNECTION_LABELS: Record<string, string> = {
  ONLINE: "Đang kết nối", STALE: "Dữ liệu đã cũ", OFFLINE: "Mất kết nối", INACTIVE: "Ngừng hoạt động", MAINTENANCE: "Đang bảo trì",
};
export const SENSOR_RANGE_OPTIONS = [
  { key: "today", label: "Hôm nay", limit: 1000 },
  { key: "24h", label: "24 Giờ qua", limit: 1000 },
  { key: "7d", label: "7 Ngày qua", limit: 1000 },
  { key: "month", label: "Tháng này", limit: 1000 },
  { key: "season", label: "Toàn vụ mùa", limit: 1000 },
] as const;
type TimeRangeKey = (typeof SENSOR_RANGE_OPTIONS)[number]["key"];
export type SensorChartMode = "area" | "bar" | "line";
export const SENSOR_CHART_MODES: Array<{ key: SensorChartMode; label: string }> = [
  { key: "line", label: "Line" },
  { key: "area", label: "Area" },
  { key: "bar", label: "Bar" },
];
const STATUS_COLORS = {
  DRY_WARNING: "#D6A928",
  OPTIMAL: "#4b9666",
  WET_WARNING: "#477681",
};

export function SensorCharts() {
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const requestSequence = useRef(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("24h");
  const [climateMode, setClimateMode] = useState<SensorChartMode>("area");
  const [soilMode, setSoilMode] = useState<SensorChartMode>("bar");
  const [latest, setLatest] = useState<IotTelemetryReading | null>(null);
  const [history, setHistory] = useState<IotTelemetryReading[]>([]);
  const [seasonHistory, setSeasonHistory] = useState<IotTelemetryReading[]>([]);
  const [incompleteHistory, setIncompleteHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? devices[0] ?? null,
    [devices, selectedDeviceId],
  );
  const chartData = chartReadings(history).map((reading) => ({
    airHumidity: reading.humidity ?? reading.air_humidity ?? null,
    dryThreshold: 60,
    soilMoisture: reading.soilMoisture ?? reading.soil_moisture ?? null,
    temperature: reading.temperature,
    time: reading.measuredAt ? formatTimeLabel(reading.measuredAt, timeRange) : "--",
    wetThreshold: 85,
  }));
  const statusData = useMemo(() => statusDistribution(seasonHistory), [seasonHistory]);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await iotClient.listDevices();
      let nextDevices: IotDevice[] = response.devices.map((device) => ({ ...device, telemetrySource: "registry" as const }));
      if (nextDevices.length === 0) {
        nextDevices = await loadSingleFarmTelemetryFallback();
      }
      setDevices(nextDevices);
      setSelectedDeviceId((current) =>
        nextDevices.some((device) => device.id === current) ? current : nextDevices[0]?.id ?? "",
      );
      if (nextDevices.length === 0) {
        setLatest(null);
        setHistory([]);
      }
    } catch (loadError) {
      setDevices([]);
      setSelectedDeviceId("");
      setLatest(null);
      setHistory([]);
      setSeasonHistory([]);
      setIncompleteHistory(false);
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTelemetry = useCallback(async (deviceId: string, options: { showLoading?: boolean } = {}) => {
    if (!deviceId) return;
    const sequence = ++requestSequence.current;
    const device = devices.find((item) => item.id === deviceId);
    if (!device) return;
    const isRawSensorFallback = device?.telemetrySource === "raw-sensor";
    if (options.showLoading !== false) {
      setLoading(true);
      setLatest(null);
      setHistory([]);
      setSeasonHistory([]);
    }
    setError(null);
    try {
      const now = new Date();
      const fetchHistory = (range: TimeRangeKey) => isRawSensorFallback
        ? completeTelemetryHistory(device.deviceUid, historyQueryForRange(range, now)).then(readings => ({ readings, incomplete: false }))
        : loadDashboardHistory(device.deviceUid, historyQueryForRange(range, now));
      const selectedHistory = fetchHistory(timeRange);
      const [latestResponse, historyResponse, seasonResponse] = await Promise.all([
        isRawSensorFallback ? iotClient.rawLatestTelemetry(device.deviceUid)
          : iotClient.latestTelemetry(deviceId).then(response => response.telemetry),
        selectedHistory,
        timeRange === "season" ? selectedHistory
          : fetchHistory("season"),
      ]);
      if (sequence !== requestSequence.current) return;
      setLatest(latestResponse);
      setHistory(historyResponse.readings);
      setSeasonHistory(seasonResponse.readings);
      setIncompleteHistory(historyResponse.incomplete || seasonResponse.incomplete);
    } catch (loadError) {
      if (sequence !== requestSequence.current) return;
      setLatest(null);
      setHistory([]);
      setSeasonHistory([]);
      setIncompleteHistory(false);
      setError(messageFromError(loadError));
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [devices, timeRange]);

  const refresh = useCallback(async () => {
    await loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (selectedDeviceId) void loadTelemetry(selectedDeviceId);
    return () => { requestSequence.current += 1; };
  }, [loadTelemetry, selectedDeviceId]);

  useEffect(() => {
    if (!selectedDeviceId) return undefined;
    const interval = window.setInterval(() => {
      void loadTelemetry(selectedDeviceId, { showLoading: false });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [loadTelemetry, selectedDeviceId]);

  return (
    <section id="sensors" className="panel scroll-mt-24 p-7 lg:p-8">
      <IotDeviceRegistration onRegistered={() => { void loadDevices(); }} />
      {loading && <p role="status" className="mb-4 text-sm text-neutral-500">Đang tải dữ liệu cảm biến…</p>}
      <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
        <div className="flex items-center gap-7">
          <span className="grid size-10 place-items-center rounded-xl bg-[#e8f0e9] text-[#2E5A44]"><Activity size={20} /></span>
          <div>
            <h2 className="text-[15px] font-bold">Giám sát cảm biến IoT</h2>
            <p className="mt-1 text-[13px] text-[#7e8b83]">{latest?.measuredAt ? `Lần đo cuối: ${new Date(latest.measuredAt).toLocaleString("vi-VN")}` : "Chưa có lần đo gần nhất"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#fff6db] px-4 py-2 text-sm font-extrabold text-[#8a6810]">
            {selectedDevice ? (CONNECTION_LABELS[selectedDevice.connectivityStatus ?? ""] ?? "Chưa rõ kết nối") : loading ? "Đang tải thiết bị…" : "Chưa có thiết bị"}
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

      <div className="mt-6 flex flex-wrap gap-2">
        {SENSOR_RANGE_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => setTimeRange(option.key)}
            className={`h-9 rounded-xl border px-4 text-[13px] font-bold transition ${
              timeRange === option.key
                ? "border-[#2E5A44] bg-[#2E5A44] text-white"
                : "border-[#dfe5de] bg-white text-[#536259]"
            }`}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-5 rounded-2xl bg-[#fff6db] px-4 py-3 text-[13px] font-bold text-[#6d5619]">{error}</p> : null}
      {!error && !loading && devices.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-[#edf3ee] px-4 py-3 text-[13px] font-bold text-[#536259]">
          Chưa có thiết bị được liên kết với trang trại bạn được quyền xem.
        </p>
      ) : null}

      <div className="mt-7 grid gap-7 md:grid-cols-3">
        <GaugeCard icon={ThermometerSun} label="Nhiệt độ hiện tại" max={40} min={20} unit="°C" value={latest?.temperature ?? null} />
        <GaugeCard icon={Droplets} label="Độ ẩm không khí" max={100} min={0} unit="%" value={latest?.humidity ?? latest?.air_humidity ?? null} />
        <GaugeCard icon={SunMedium} label="Độ ẩm đất" max={100} min={0} unit="%" value={latest?.soilMoisture ?? latest?.soil_moisture ?? null} warning={latest?.status ?? null} />
      </div>

      <div className="mt-8 grid gap-10 xl:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0">
          <ChartHeader mode={climateMode} onChange={setClimateMode} title="NHIỆT ĐỘ & ĐỘ ẨM KHÔNG KHÍ" />
          <div className="h-[300px]">
            {chartData.length > 1 && climateMode === "area" ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 300 }}>
                <AreaChart data={chartData} margin={{ left: -18, right: 10 }}>
                  <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#7d8a82" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#7d8a82" }} />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe6df", fontSize: 14 }} />
                  <Area connectNulls type="monotone" dataKey="airHumidity" name="Độ ẩm không khí %" stroke="#4b9666" fill="#dceadd" strokeWidth={2} />
                  <Area connectNulls type="monotone" dataKey="temperature" name="Nhiệt độ °C" stroke="#D6A928" fill="#fbf5d8" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
            {chartData.length > 1 && climateMode === "line" ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 300 }}>
                <LineChart data={chartData} margin={{ left: -18, right: 10 }}>
                  <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#7d8a82" }} />
                  <YAxis yAxisId="temperature" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#a47c12" }} />
                  <YAxis yAxisId="humidity" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#4b9666" }} />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe6df", fontSize: 14 }} />
                  <Line yAxisId="temperature" connectNulls type="monotone" dataKey="temperature" name="Nhiệt độ °C" stroke="#D6A928" strokeWidth={3} dot={{ r: 2 }} />
                  <Line yAxisId="humidity" connectNulls type="monotone" dataKey="airHumidity" name="Độ ẩm không khí %" stroke="#4b9666" strokeWidth={3} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
            {chartData.length > 1 && climateMode === "bar" ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 300 }}>
                <BarChart data={chartData} margin={{ left: -18, right: 10 }}>
                  <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#7d8a82" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#7d8a82" }} />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe6df", fontSize: 14 }} />
                  <Bar dataKey="temperature" name="Nhiệt độ °C" fill="#D6A928" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="airHumidity" name="Độ ẩm không khí %" fill="#4b9666" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
            {chartData.length <= 1 ? <EmptyChart /> : null}
          </div>
        </div>
        <div className="min-w-0">
          <ChartHeader mode={soilMode} onChange={setSoilMode} title="ĐỘ ẨM ĐẤT & NGƯỠNG AN TOÀN" />
          <div className="h-[300px]">
            {chartData.length > 1 && soilMode === "bar" ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height: 300 }}>
                <BarChart data={chartData} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7d8a82" }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7d8a82" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe6df", fontSize: 14 }} />
                  <ReferenceLine y={60} stroke="#D6A928" strokeDasharray="5 5" label={{ value: "Khô <60%", fill: "#8a6810", fontSize: 11 }} />
                  <ReferenceLine y={85} stroke="#477681" strokeDasharray="5 5" label={{ value: "Úng >85%", fill: "#477681", fontSize: 11 }} />
                  <Bar dataKey="soilMoisture" name="Độ ẩm đất %" fill="#78966A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
            {chartData.length > 1 && soilMode === "area" ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height: 300 }}>
                <AreaChart data={chartData} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7d8a82" }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7d8a82" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe6df", fontSize: 14 }} />
                  <ReferenceLine y={60} stroke="#D6A928" strokeDasharray="5 5" label={{ value: "Khô <60%", fill: "#8a6810", fontSize: 11 }} />
                  <ReferenceLine y={85} stroke="#477681" strokeDasharray="5 5" label={{ value: "Úng >85%", fill: "#477681", fontSize: 11 }} />
                  <Area connectNulls type="monotone" dataKey="soilMoisture" name="Độ ẩm đất %" stroke="#78966A" fill="#dceadd" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
            {chartData.length > 1 && soilMode === "line" ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height: 300 }}>
                <LineChart data={chartData} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7d8a82" }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7d8a82" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe6df", fontSize: 14 }} />
                  <ReferenceLine y={60} stroke="#D6A928" strokeDasharray="5 5" label={{ value: "Khô <60%", fill: "#8a6810", fontSize: 11 }} />
                  <ReferenceLine y={85} stroke="#477681" strokeDasharray="5 5" label={{ value: "Úng >85%", fill: "#477681", fontSize: 11 }} />
                  <Line connectNulls type="monotone" dataKey="soilMoisture" name="Độ ẩm đất %" stroke="#78966A" strokeWidth={3} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
            {chartData.length <= 1 ? <EmptyChart /> : null}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h3 className="mb-4 text-[13px] font-bold text-[#536259]">PHÂN BỔ TRẠNG THÁI CÁC MẪU</h3>
          <div className="h-[260px]">
            {statusData.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 420, height: 260 }}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" innerRadius={58} outerRadius={92} paddingAngle={3}>
                    {statusData.map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value ?? 0} mẫu`, String(name)]} />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>
        <div className="grid content-start gap-3 rounded-2xl border border-[#edf1ec] bg-white p-5">
          <h3 className="text-[13px] font-bold text-[#263a2f]">Tóm tắt dữ liệu đang xem</h3>
          <SummaryRow label="Số mẫu trong dải" value={`${history.length}`} />
          {chartData.length < history.length ? <SummaryRow label="Mẫu thực tế đại diện trên biểu đồ" value={`${chartData.length}`} /> : null}
          {incompleteHistory ? <p role="status" className="text-sm text-amber-800">Lịch sử bị giới hạn ở 1.000 mẫu; chưa tải được phần còn lại. Biểu đồ và phân bố chỉ tính các mẫu đã tải.</p> : null}
          <SummaryRow label="Mẫu đã tải từ tháng 6/2026" value={`${seasonHistory.length} mẫu`} />
          <SummaryRow label="Thiết bị" value={selectedDevice?.deviceUid ?? "--"} />
          <SummaryRow label="Nguồn" value={selectedDevice?.telemetrySource === "raw-sensor" ? "Telemetry fallback" : "Registry API"} />
        </div>
      </div>
    </section>
  );
}

async function loadSingleFarmTelemetryFallback(): Promise<IotDevice[]> {
  try {
    const farms = await iotClient.listFarms();
    if (farms.length !== 1) return [];
    const latestTelemetry = await iotClient.rawLatestTelemetry(FALLBACK_DEVICE_ID).catch(() => null);
    if (!latestTelemetry) return [];
    const farm = farms[0];
    return [
      {
        cultivationAreaId: null,
        connectivityStatus: "RAW_SENSOR",
        deviceUid: FALLBACK_DEVICE_ID,
        farmId: farm.id,
        id: `raw:${FALLBACK_DEVICE_ID.toLocaleLowerCase("en-US")}`,
        lastSeenAt: latestTelemetry.measuredAt,
        latestTelemetry,
        name: `${FALLBACK_DEVICE_ID} (${farm.name ?? farm.code ?? "farm duy nhất"})`,
        status: "UNMAPPED",
        telemetrySource: "raw-sensor",
        telemetryState: "HAS_TELEMETRY",
      },
    ];
  } catch {
    return [];
  }
}

function ChartHeader({
  mode,
  onChange,
  title,
}: {
  mode: SensorChartMode;
  onChange: (mode: SensorChartMode) => void;
  title: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-[13px] font-bold text-[#536259]">{title}</h3>
      <div className="inline-flex rounded-xl bg-[#edf3ee] p-1">
        {SENSOR_CHART_MODES.map((item) => (
          <button
            key={item.key}
            className={`h-8 rounded-lg px-3 text-[12px] font-bold ${mode === item.key ? "bg-white text-[#2E5A44] shadow-sm" : "text-[#66756c]"}`}
            onClick={() => onChange(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function GaugeCard({
  icon: Icon,
  label,
  max,
  min,
  unit,
  value,
  warning,
}: {
  icon: typeof ThermometerSun;
  label: string;
  max: number;
  min: number;
  unit: string;
  value: number | null;
  warning?: string | null;
}) {
  const percent = value === null ? 0 : clamp(((value - min) / (max - min)) * 100, 0, 100);
  const color = warning === "DRY_WARNING" || warning === "WET_WARNING"
    ? "#D6A928"
    : percent > 82
      ? "#477681"
      : "#4b9666";
  return (
    <div className="rounded-2xl border border-[#edf1ec] bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="grid size-9 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44]"><Icon size={18} /></span>
          <small className="mt-4 block text-[14px] font-bold text-[#536259]">{label}</small>
          <b className="mt-1 block text-xl text-[#263a2f]">{value === null ? "--" : `${formatValue(value)} ${unit}`}</b>
        </div>
        <div
          className="grid size-20 place-items-center rounded-full"
          style={{ background: `conic-gradient(${color} ${percent * 3.6}deg, #edf1ec 0deg)` }}
        >
          <div className="grid size-14 place-items-center rounded-full bg-white text-[12px] font-extrabold text-[#536259]">
            {value === null ? "--" : `${Math.round(percent)}%`}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-[#f7faf7] px-4 py-3 text-[13px]">
      <span className="font-semibold text-[#66756c]">{label}</span>
      <b className="text-[#263a2f]">{value}</b>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[#dfe5de] px-6 text-center text-[13px] font-bold text-[#7d8a82]">
      Chưa đủ dữ liệu trong khoảng thời gian đã chọn.
    </div>
  );
}

function formatValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function statusDistribution(readings: IotTelemetryReading[]) {
  const totals = {
    DRY_WARNING: 0,
    OPTIMAL: 0,
    WET_WARNING: 0,
  };
  readings.forEach((reading) => {
    const status = reading.status ?? statusFromSoil(reading.soilMoisture ?? reading.soil_moisture ?? null);
    if (status) totals[status] += 1;
  });
  return [
    { color: STATUS_COLORS.OPTIMAL, name: "OPTIMAL", value: totals.OPTIMAL },
    { color: STATUS_COLORS.DRY_WARNING, name: "DRY_WARNING", value: totals.DRY_WARNING },
    { color: STATUS_COLORS.WET_WARNING, name: "WET_WARNING", value: totals.WET_WARNING },
  ];
}

function statusFromSoil(soilMoisture: number | null) {
  if (soilMoisture === null) return null;
  if (soilMoisture < 60) return "DRY_WARNING";
  if (soilMoisture > 85) return "WET_WARNING";
  return "OPTIMAL";
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Không thể tải dữ liệu IoT.";
}
