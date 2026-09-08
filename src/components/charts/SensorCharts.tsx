"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Droplets,
  RefreshCw,
  ThermometerSun,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { sensorClient } from "@/lib/sensor/client";
import type {
  ChartType,
  SensorHistoryPoint,
  SensorLatest,
  SensorMetric,
  TimeRange,
} from "@/lib/sensor/types";

// ─── Config ──────────────────────────────────────────────────────────────────

const DEVICES = [
  { id: "esp32-01", label: "Trạm IoT 01" },
  { id: "esp32-02", label: "Trạm IoT 02" },
  { id: "esp32-03", label: "Trạm IoT 03" },
  { id: "esp32-04", label: "Trạm IoT 04" },
];

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "1D", label: "24H" },
  { key: "1W", label: "7 Ngày" },
  { key: "1M", label: "30 Ngày" },
  { key: "1Y", label: "12 Tháng" },
  { key: "custom", label: "Tùy chỉnh" },
];

const CHART_TYPES: { key: ChartType; label: string }[] = [
  { key: "line", label: "Đường" },
  { key: "bar", label: "Cột" },
  { key: "area", label: "Miền" },
];

const METRICS: { key: SensorMetric; label: string }[] = [
  { key: "temperature", label: "Nhiệt độ" },
  { key: "air_humidity", label: "Độ ẩm KK" },
  { key: "soil_moisture", label: "Độ ẩm đất" },
];

interface MetricConfig {
  label: string;
  unit: string;
  color: string;
  compColor: string;
  domain: [number, number];
  cardBg: string;
  iconColor: string;
  labelColor: string;
  safeZone: [number, number];
}

const METRIC_CONFIG: Record<SensorMetric, MetricConfig> = {
  temperature: {
    label: "Nhiệt độ",
    unit: "°C",
    color: "#D6A928",
    compColor: "#9ECBB0",
    domain: [20, 40],
    cardBg: "bg-[#fbf5d8]",
    iconColor: "text-[#a47c12]",
    labelColor: "text-[#7d714d]",
    safeZone: [24, 30],
  },
  air_humidity: {
    label: "Độ ẩm không khí",
    unit: "%",
    color: "#2E5A44",
    compColor: "#9ECBB0",
    domain: [40, 100],
    cardBg: "bg-[#edf3ee]",
    iconColor: "text-[#2E5A44]",
    labelColor: "text-[#64756a]",
    safeZone: [60, 85],
  },
  soil_moisture: {
    label: "Độ ẩm đất",
    unit: "%",
    color: "#477681",
    compColor: "#9ECBB0",
    domain: [20, 100],
    cardBg: "bg-[#eef4f4]",
    iconColor: "text-[#477681]",
    labelColor: "text-[#63777a]",
    safeZone: [60, 80],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeBounds(
  range: TimeRange,
  customFrom: string,
  customTo: string,
): { from: Date; to: Date } {
  const to = new Date();
  switch (range) {
    case "1D":
      return { from: new Date(to.getTime() - 24 * 3_600_000), to };
    case "1W":
      return { from: new Date(to.getTime() - 7 * 24 * 3_600_000), to };
    case "1M":
      return { from: new Date(to.getTime() - 30 * 24 * 3_600_000), to };
    case "1Y":
      return { from: new Date(to.getTime() - 365 * 24 * 3_600_000), to };
    case "custom": {
      const from = customFrom
        ? new Date(customFrom)
        : new Date(to.getTime() - 24 * 3_600_000);
      const toCustom = customTo ? new Date(customTo) : to;
      toCustom.setHours(23, 59, 59, 999);
      return { from, to: toCustom };
    }
  }
}

function getPrevBounds(from: Date, to: Date): { from: Date; to: Date } {
  const duration = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - duration), to: from };
}

function formatLabel(ts: string, range: TimeRange): string {
  const d = new Date(ts);
  if (range === "1D")
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  if (range === "1Y")
    return d.toLocaleDateString("vi-VN", { month: "short" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function calcStats(data: SensorHistoryPoint[], metric: SensorMetric) {
  if (!data.length) return { min: null, max: null, avg: null, optimalPct: null };
  const vals = data.map((p) => p[metric]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const [lo, hi] = METRIC_CONFIG[metric].safeZone;
  const optimalPct = Math.round(
    (vals.filter((v) => v >= lo && v <= hi).length / vals.length) * 100,
  );
  return { min, max, avg, optimalPct };
}

function getInsight(
  metric: SensorMetric,
  avg: number,
  optimalPct: number,
): string {
  if (metric === "soil_moisture") {
    if (avg < 40)
      return `Độ ẩm đất trung bình ${avg.toFixed(1)}% — đất khô hạn, cần tưới nước ngay!`;
    if (avg < 60)
      return `Độ ẩm đất ${avg.toFixed(1)}% — ở mức thấp, nên tưới bổ sung.`;
    if (avg <= 80)
      return `Độ ẩm đất duy trì mức OPTIMAL ${optimalPct}% thời gian — cây sầu riêng phát triển tốt.`;
    return `Độ ẩm đất ${avg.toFixed(1)}% — quá ẩm, kiểm tra hệ thống thoát nước.`;
  }
  if (metric === "temperature") {
    if (avg < 24)
      return `Nhiệt độ trung bình ${avg.toFixed(1)}°C — thấp hơn ngưỡng lý tưởng, ảnh hưởng sinh trưởng.`;
    if (avg <= 30)
      return `Nhiệt độ ${avg.toFixed(1)}°C — trong vùng lý tưởng cho sầu riêng, thuận lợi ra hoa.`;
    return `Nhiệt độ ${avg.toFixed(1)}°C — cao, cần che phủ và tăng cường tưới nước.`;
  }
  if (avg < 60)
    return `Độ ẩm không khí ${avg.toFixed(1)}% — khô, cần phun sương bổ sung.`;
  if (avg <= 85)
    return `Độ ẩm không khí ${avg.toFixed(1)}% — mức ổn, thích hợp ra hoa đậu trái.`;
  return `Độ ẩm không khí ${avg.toFixed(1)}% — quá cao, chú ý phòng ngừa nấm bệnh.`;
}

function buildChartData(
  data: SensorHistoryPoint[],
  metric: SensorMetric,
  range: TimeRange,
) {
  return data.map((p) => ({ label: formatLabel(p.timestamp, range), value: p[metric] }));
}

type ChartPoint =
  | { label: string; value: number }
  | { label: string; kỳNày: number | null; kỳTrước: number | null };

function buildCompChartData(
  curr: SensorHistoryPoint[],
  prev: SensorHistoryPoint[],
  metric: SensorMetric,
  range: TimeRange,
): ChartPoint[] {
  const len = Math.max(curr.length, prev.length);
  return Array.from({ length: len }, (_, i) => ({
    label: curr[i] ? formatLabel(curr[i].timestamp, range) : `#${i + 1}`,
    kỳNày: curr[i]?.[metric] ?? null,
    kỳTrước: prev[i]?.[metric] ?? null,
  }));
}

// ─── Small components ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-gray-100 ${className ?? "h-24"}`} />
  );
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle size={17} className="shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold hover:bg-red-200"
      >
        <RefreshCw size={12} /> Thử lại
      </button>
    </div>
  );
}

// ─── Toggle button helper ─────────────────────────────────────────────────────

function ToggleBtn({
  active,
  activeClass,
  onClick,
  children,
}: {
  active: boolean;
  activeClass: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        active
          ? activeClass
          : "border border-[#dfe5de] bg-white text-[#536259] hover:bg-[#f0f4f1]"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SensorCharts() {
  const [deviceId, setDeviceId] = useState("esp32-01");
  const [timeRange, setTimeRange] = useState<TimeRange>("1D");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [metric, setMetric] = useState<SensorMetric>("temperature");
  const [compMode, setCompMode] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [latest, setLatest] = useState<SensorLatest | null>(null);
  const [latestLoading, setLatestLoading] = useState(true);
  const [latestError, setLatestError] = useState<string | null>(null);

  const [history, setHistory] = useState<SensorHistoryPoint[]>([]);
  const [prevHistory, setPrevHistory] = useState<SensorHistoryPoint[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch latest ──────────────────────────────────────────────────────────

  const fetchLatest = useCallback(async () => {
    try {
      setLatestError(null);
      const data = await sensorClient.latest(deviceId);
      setLatest(data);
    } catch (err) {
      setLatestError(
        err instanceof Error ? err.message : "Không thể tải dữ liệu thời gian thực.",
      );
    } finally {
      setLatestLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    setLatestLoading(true);
    fetchLatest();
    timerRef.current = setInterval(fetchLatest, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchLatest]);

  // ── Fetch history ─────────────────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    setHistError(null);
    try {
      const { from, to } = getTimeBounds(timeRange, customFrom, customTo);
      const prevBounds = getPrevBounds(from, to);

      const [currentRes, prevRes] = await Promise.all([
        sensorClient.history({
          device_id: deviceId,
          limit: 200,
          from: from.toISOString(),
          to: to.toISOString(),
        }),
        compMode
          ? sensorClient.history({
              device_id: deviceId,
              limit: 200,
              from: prevBounds.from.toISOString(),
              to: prevBounds.to.toISOString(),
            })
          : Promise.resolve({ data: [] as SensorHistoryPoint[] }),
      ]);

      setHistory(currentRes.data);
      setPrevHistory(prevRes.data);
    } catch (err) {
      setHistError(
        err instanceof Error ? err.message : "Không thể tải lịch sử cảm biến.",
      );
    } finally {
      setHistLoading(false);
    }
  }, [deviceId, timeRange, customFrom, customTo, compMode]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const cfg = METRIC_CONFIG[metric];
  const stats = useMemo(() => calcStats(history, metric), [history, metric]);
  const compStats = useMemo(() => calcStats(prevHistory, metric), [prevHistory, metric]);

  const chartData = useMemo(
    (): ChartPoint[] =>
      compMode
        ? buildCompChartData(history, prevHistory, metric, timeRange)
        : buildChartData(history, metric, timeRange),
    [history, prevHistory, metric, timeRange, compMode],
  );

  const deltaText = useMemo(() => {
    if (!compMode || stats.avg == null || compStats.avg == null || compStats.avg === 0)
      return null;
    const delta = ((stats.avg - compStats.avg) / compStats.avg) * 100;
    const dir = delta >= 0 ? "cao hơn" : "thấp hơn";
    return `${cfg.label} trung bình kỳ này ${dir} ${Math.abs(delta).toFixed(1)}% so với kỳ trước`;
  }, [compMode, stats.avg, compStats.avg, cfg.label]);

  // ── Chart render ──────────────────────────────────────────────────────────

  const axisProps = {
    axisLine: false as const,
    tickLine: false as const,
    tick: { fontSize: 12, fill: "#7d8a82" },
  };
  const tooltipProps = {
    contentStyle: { borderRadius: 12, border: "1px solid #dfe6df", fontSize: 13 },
  };
  const [domMin, domMax] = cfg.domain;
  const [safeMin, safeMax] = cfg.safeZone;

  function renderChart() {
    if (histLoading) {
      return (
        <div className="flex h-[300px] items-center justify-center rounded-2xl bg-gray-50">
          <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
            <RefreshCw size={20} className="animate-spin" />
            Đang tải dữ liệu...
          </div>
        </div>
      );
    }
    if (histError) {
      return (
        <div className="flex h-[300px] items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-sm text-red-500">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle size={20} />
            {histError}
          </div>
        </div>
      );
    }
    if (!chartData.length) {
      return (
        <div className="flex h-[300px] items-center justify-center rounded-2xl bg-gray-50 text-sm text-gray-400">
          Không có dữ liệu trong khoảng thời gian này.
        </div>
      );
    }

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ left: -20, right: 10 }}>
            <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis domain={[domMin, domMax]} {...axisProps} />
            <Tooltip {...tooltipProps} />
            {compMode ? (
              <>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="kỳNày" name="Kỳ này" fill={cfg.color} radius={[4, 4, 0, 0]} />
                <Bar dataKey="kỳTrước" name="Kỳ trước" fill={cfg.compColor} radius={[4, 4, 0, 0]} />
              </>
            ) : (
              <Bar
                dataKey="value"
                name={`${cfg.label} (${cfg.unit})`}
                fill={cfg.color}
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
            <defs>
              <linearGradient id="gradCurr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cfg.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cfg.compColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={cfg.compColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis domain={[domMin, domMax]} {...axisProps} />
            {!compMode && (
              <>
                <ReferenceArea y1={domMin} y2={safeMin} fill="#fee2e2" fillOpacity={0.35} />
                <ReferenceArea y1={safeMin} y2={safeMax} fill="#dcfce7" fillOpacity={0.25} />
                <ReferenceArea y1={safeMax} y2={domMax} fill="#fef9c3" fillOpacity={0.35} />
              </>
            )}
            <Tooltip {...tooltipProps} />
            {compMode ? (
              <>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="kỳNày"
                  name="Kỳ này"
                  stroke={cfg.color}
                  fill="url(#gradCurr)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="kỳTrước"
                  name="Kỳ trước"
                  stroke={cfg.compColor}
                  fill="url(#gradPrev)"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="value"
                name={`${cfg.label} (${cfg.unit})`}
                stroke={cfg.color}
                fill="url(#gradCurr)"
                strokeWidth={2.5}
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // line (default)
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ left: -20, right: 10 }}>
          <CartesianGrid stroke="#e8ece7" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis domain={[domMin, domMax]} {...axisProps} />
          <Tooltip {...tooltipProps} />
          {compMode ? (
            <>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="kỳNày"
                name="Kỳ này"
                stroke={cfg.color}
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="kỳTrước"
                name="Kỳ trước"
                stroke={cfg.compColor}
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
              />
            </>
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              name={`${cfg.label} (${cfg.unit})`}
              stroke={cfg.color}
              strokeWidth={2.5}
              dot={{ r: 2, fill: cfg.color }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section id="sensors" className="panel scroll-mt-24 space-y-6 p-7 lg:p-8">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="grid size-10 place-items-center rounded-xl bg-[#e8f0e9] text-[#2E5A44]">
            <Activity size={20} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold">Giám sát cảm biến IoT thời gian thực</h2>
            <p className="mt-0.5 text-[13px] text-[#7e8b83]">DHT22 • Cảm biến độ ẩm đất</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf4ec] px-3 py-1.5 text-xs font-bold tracking-wide text-[#37704f]">
            <span className="size-1.5 rounded-full bg-[#4b9666] animate-pulse inline-block" />
            LIVE
          </span>
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="h-9 rounded-xl border border-[#dfe5de] bg-white px-3 text-[13px] font-semibold outline-none"
          >
            {DEVICES.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
          <button
            onClick={() => { setLatestLoading(true); void fetchLatest(); }}
            title="Làm mới"
            className="grid size-9 place-items-center rounded-xl border border-[#dfe5de] bg-white hover:bg-[#f0f4f1]"
          >
            <RefreshCw
              size={14}
              className={latestLoading ? "animate-spin text-[#2E5A44]" : "text-[#536259]"}
            />
          </button>
        </div>
      </div>

      {/* Latest error */}
      {latestError && !latestLoading && (
        <ErrorBanner
          message={latestError}
          onRetry={() => { setLatestLoading(true); void fetchLatest(); }}
        />
      )}

      {/* Realtime cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {latestLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <div className="rounded-2xl bg-[#fbf5d8] p-5">
              <ThermometerSun size={18} className="text-[#a47c12]" />
              <small className="mt-4 block text-[14px] text-[#7d714d]">Nhiệt độ hiện tại</small>
              <b className="mt-1 block text-2xl">
                {latest?.temperature != null ? `${latest.temperature}°C` : "—"}
              </b>
              <p className="mt-1.5 text-[11px] text-[#9b9278]">
                {latest?.timestamp
                  ? new Date(latest.timestamp).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Chưa có dữ liệu"}
              </p>
            </div>
            <div className="rounded-2xl bg-[#edf3ee] p-5">
              <Droplets size={18} className="text-[#2E5A44]" />
              <small className="mt-4 block text-[14px] text-[#64756a]">Độ ẩm không khí</small>
              <b className="mt-1 block text-2xl">
                {latest?.air_humidity != null ? `${latest.air_humidity}%` : "—"}
              </b>
              <p className="mt-1.5 text-[11px] text-[#7a8e83]">DHT22</p>
            </div>
            <div className="rounded-2xl bg-[#eef4f4] p-5">
              <Droplets size={18} className="text-[#477681]" />
              <small className="mt-4 block text-[14px] text-[#63777a]">Độ ẩm đất</small>
              <b className="mt-1 block text-2xl">
                {latest?.soil_moisture != null ? `${latest.soil_moisture}%` : "—"}
              </b>
              <p className="mt-1.5 text-[11px] text-[#7a8e8f]">Cảm biến đất</p>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-[#e8ece7] bg-[#f9fbf9] p-4 space-y-4">

        {/* Time range */}
        <div className="flex flex-wrap items-start gap-3">
          <span className="mt-1 w-20 shrink-0 text-[12px] font-semibold text-[#536259]">Thời gian</span>
          <div className="flex flex-wrap gap-2">
            {TIME_RANGES.map((tr) => (
              <ToggleBtn
                key={tr.key}
                active={timeRange === tr.key}
                activeClass="bg-[#2E5A44] text-white"
                onClick={() => setTimeRange(tr.key)}
              >
                {tr.label}
              </ToggleBtn>
            ))}
          </div>
          {timeRange === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 rounded-lg border border-[#dfe5de] bg-white px-2 text-[12px] outline-none"
              />
              <span className="text-xs text-gray-400">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 rounded-lg border border-[#dfe5de] bg-white px-2 text-[12px] outline-none"
              />
            </div>
          )}
        </div>

        {/* Chart type & metric */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-[12px] font-semibold text-[#536259]">Dạng biểu đồ</span>
            <div className="flex gap-1.5">
              {CHART_TYPES.map((ct) => (
                <ToggleBtn
                  key={ct.key}
                  active={chartType === ct.key}
                  activeClass="bg-[#D6A928] text-white"
                  onClick={() => setChartType(ct.key)}
                >
                  {ct.label}
                </ToggleBtn>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[12px] font-semibold text-[#536259]">Chỉ số</span>
            <div className="flex gap-1.5">
              {METRICS.map((m) => (
                <ToggleBtn
                  key={m.key}
                  active={metric === m.key}
                  activeClass="bg-[#477681] text-white"
                  onClick={() => setMetric(m.key)}
                >
                  {m.label}
                </ToggleBtn>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison toggle */}
        <div className="flex items-center gap-3">
          <button
            role="switch"
            aria-checked={compMode}
            onClick={() => setCompMode((v) => !v)}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              compMode ? "bg-[#2E5A44]" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                compMode ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-[13px] text-[#536259]">So sánh với kỳ trước</span>
        </div>
      </div>

      {/* History error */}
      {histError && !histLoading && (
        <ErrorBanner message={histError} onRetry={fetchHistory} />
      )}

      {/* Main chart */}
      <div>
        <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-[#536259]">
          {cfg.label} • {cfg.unit}
          {compMode && <span className="ml-2 font-normal text-[#9ECBB0]">vs Kỳ trước</span>}
          {chartType === "area" && !compMode && (
            <span className="ml-2 font-normal text-gray-400">
              — vùng xanh = tối ưu
            </span>
          )}
        </h3>
        {renderChart()}
      </div>

      {/* Summary stats & agricultural insight */}
      {!histLoading && !histError && history.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">

          {/* Stats card */}
          <div className="rounded-2xl border border-[#e8ece7] bg-white p-5">
            <h4 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-[#536259]">
              Thống kê • {cfg.label}
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              {(
                [
                  { label: "Thấp nhất", value: stats.min, Icon: TrendingDown, color: "text-blue-500" },
                  { label: "Trung bình", value: stats.avg, Icon: Activity, color: "text-[#2E5A44]" },
                  { label: "Cao nhất", value: stats.max, Icon: TrendingUp, color: "text-red-400" },
                ] as const
              ).map(({ label, value, Icon, color }) => (
                <div key={label}>
                  <Icon size={14} className={`mx-auto mb-1 ${color}`} />
                  <div className="text-lg font-bold">
                    {value != null ? `${value.toFixed(1)}${cfg.unit}` : "—"}
                  </div>
                  <div className="text-[11px] text-gray-500">{label}</div>
                </div>
              ))}
            </div>

            {compMode && deltaText && (
              <div
                className={`mt-4 rounded-xl px-3 py-2.5 text-[12px] font-medium leading-relaxed ${
                  (stats.avg ?? 0) >= (compStats.avg ?? 0)
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {deltaText}
              </div>
            )}
          </div>

          {/* Agricultural insight */}
          {stats.avg != null && stats.optimalPct != null && (
            <div className={`rounded-2xl p-5 ${cfg.cardBg}`}>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#536259]">
                Nhận xét nông nghiệp
              </h4>
              <p className={`text-[13px] font-medium leading-relaxed ${cfg.iconColor}`}>
                {getInsight(metric, stats.avg, stats.optimalPct)}
              </p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[11px] text-gray-500">
                  <span>Thời gian trong vùng tối ưu</span>
                  <span className="font-bold">{stats.optimalPct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/60">
                  <div
                    className="h-2 rounded-full bg-[#4b9666] transition-all duration-500"
                    style={{ width: `${stats.optimalPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-gray-400">
                  <span>{cfg.safeZone[0]}{cfg.unit} – {cfg.safeZone[1]}{cfg.unit}</span>
                  <span>ngưỡng tối ưu sầu riêng</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
