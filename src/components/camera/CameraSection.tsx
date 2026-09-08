"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Brain,
  Calendar,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronDown,
  Clock,
  ImageIcon,
  Leaf,
  Loader2,
  Maximize2,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Sparkles,
  ScanSearch,
  X,
} from "lucide-react";
import { cameraClient } from "@/lib/camera/client";
import type { AiDiagnosisResult, AiStatus, CameraCapture, RiskLevel } from "@/lib/camera/types";

// ── Config ────────────────────────────────────────────────────────────────────

const CAMERA_DEVICES = [
  { id: "esp32-cam-01", label: "ESP32-CAM 01 (Vườn chính)" },
  { id: "esp32-cam-02", label: "ESP32-CAM 02 (Vườn phụ)" },
];

// Giới hạn khung giờ ban ngày (6h–16h) — ban đêm thiếu sáng, ảnh không dùng được
const TIME_SLOTS = [
  { cron: "0 6 * * *",  label: "06:00" },
  { cron: "0 8 * * *",  label: "08:00" },
  { cron: "0 10 * * *", label: "10:00" },
  { cron: "0 12 * * *", label: "12:00" },
  { cron: "0 14 * * *", label: "14:00" },
  { cron: "0 16 * * *", label: "16:00" },
];

const DISEASE_NAMES: Record<string, string> = {
  ALGAL_LEAF_SPOT:      "Đốm rong tảo",
  ALLOCARIDARA_ATTACK:  "Sâu Allocaridara",
  HEALTHY_LEAF:         "Lá khỏe mạnh",
  LEAF_BLIGHT:          "Cháy lá",
  PHOMOPSIS_LEAF_SPOT:  "Đốm lá Phomopsis",
};

const RISK_CONFIG: Record<RiskLevel, { label: string; badge: string; bar: string; card: string }> = {
  LOW:      { label: "Thấp",       badge: "bg-green-100 text-green-700",   bar: "bg-green-500",  card: "bg-green-50  border-green-200"  },
  MEDIUM:   { label: "Trung bình", badge: "bg-amber-100 text-amber-700",   bar: "bg-amber-500",  card: "bg-amber-50  border-amber-200"  },
  HIGH:     { label: "Nguy hiểm",  badge: "bg-orange-100 text-orange-700", bar: "bg-orange-500", card: "bg-orange-50 border-orange-200" },
  CRITICAL: { label: "Nguy cấp",   badge: "bg-red-100 text-red-700",       bar: "bg-red-500",    card: "bg-red-50    border-red-200"    },
};

// ── Helper functions ──────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function getDiseaseName(code: string | null, vietnameseName?: string | null) {
  if (!code) return "—";
  return vietnameseName || DISEASE_NAMES[code] || code;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CaptureBadge({ type }: { type: "MANUAL" | "SCHEDULED" }) {
  return type === "SCHEDULED" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#D6A928]/15 px-2 py-0.5 text-[10px] font-semibold text-[#a47c12]">
      <Clock size={9} /> Tự động + AI
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#2E5A44]/10 px-2 py-0.5 text-[10px] font-semibold text-[#2E5A44]">
      <Camera size={9} /> Thủ công
    </span>
  );
}

// Badge overlaid on gallery thumbnails
function DiseaseBadge({ capture }: { capture: CameraCapture }) {
  const { ai_status, disease_detected, confidence_score, diagnosis_result } = capture;
  if (!ai_status) return null;

  if (ai_status === "PROCESSING") {
    return (
      <span className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 bg-amber-500/80 py-1 text-[9px] font-bold text-white">
        <Loader2 size={8} className="animate-spin" /> Đang phân tích...
      </span>
    );
  }
  if (ai_status === "FAILED") {
    return (
      <span className="absolute bottom-0 inset-x-0 bg-gray-500/80 py-1 text-center text-[9px] font-bold text-white">
        Lỗi AI
      </span>
    );
  }
  if (ai_status === "COMPLETED" && disease_detected) {
    const isHealthy = disease_detected === "HEALTHY_LEAF";
    const name      = getDiseaseName(disease_detected, diagnosis_result?.vietnameseName);
    const pct       = confidence_score != null ? Math.round(confidence_score * 100) : null;
    return (
      <span className={`absolute bottom-0 inset-x-0 truncate px-1.5 py-1 text-center text-[9px] font-bold text-white ${
        isHealthy ? "bg-green-600/85" : "bg-red-600/85"
      }`}>
        {name}{pct != null ? ` · ${pct}%` : ""}
      </span>
    );
  }
  return null;
}

// Compact result shown below capture button after a successful shot
function CaptureResultBanner({
  capture,
  onViewDetails,
}: {
  capture: CameraCapture;
  onViewDetails: () => void;
}) {
  const { ai_status, disease_detected, confidence_score, diagnosis_result } = capture;

  if (!ai_status || ai_status === "PROCESSING") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-[12px] text-green-700">
        <CheckCircle2 size={14} className="shrink-0" />
        Đã lưu ảnh lúc {formatTime(capture.captured_at)}
      </div>
    );
  }
  if (ai_status === "FAILED") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
        <AlertTriangle size={14} className="shrink-0" />
        Đã lưu ảnh — AI không phân tích được.
        <button onClick={onViewDetails} className="ml-auto underline">Xem ảnh</button>
      </div>
    );
  }
  if (ai_status === "COMPLETED" && disease_detected) {
    const isHealthy = disease_detected === "HEALTHY_LEAF";
    const name      = getDiseaseName(disease_detected, diagnosis_result?.vietnameseName);
    const pct       = confidence_score != null ? Math.round(confidence_score * 100) : null;
    return (
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] ${
        isHealthy ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}>
        {isHealthy ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
        <span className="flex-1">
          {isHealthy ? "Lá khỏe mạnh" : `Phát hiện: ${name}`}
          {pct != null && ` (${pct}%)`}
        </span>
        <button onClick={onViewDetails} className="shrink-0 rounded-lg bg-white/60 px-2 py-0.5 text-[11px] font-semibold hover:bg-white">
          Chi tiết →
        </button>
      </div>
    );
  }
  return null;
}

// Full AI diagnosis display — shown in the enlarged modal
function DiagnosisCard({ diag, aiStatus, diseaseDetected, confidenceScore }: {
  diag: AiDiagnosisResult | null;
  aiStatus: AiStatus | null;
  diseaseDetected: string | null;
  confidenceScore: number | null;
}) {
  if (!aiStatus) return null;

  if (aiStatus === "PROCESSING") {
    return (
      <div className="flex items-center gap-3 border-t border-[#e8ece7] p-4 text-[13px] text-amber-600">
        <Loader2 size={16} className="animate-spin shrink-0" />
        Đang phân tích bệnh bằng AI... Vui lòng chờ.
      </div>
    );
  }

  if (aiStatus === "FAILED") {
    return (
      <div className="flex items-center gap-3 border-t border-[#e8ece7] p-4 text-[13px] text-gray-500">
        <AlertCircle size={16} className="shrink-0" />
        Phân tích AI thất bại. Vui lòng thử chụp lại.
      </div>
    );
  }

  if (aiStatus === "COMPLETED") {
    if (!diag) {
      return (
        <div className="border-t border-[#e8ece7] p-4 text-[12px] text-gray-400">
          Đã hoàn tất phân tích (không có chi tiết).
        </div>
      );
    }

    const {
      predictedDisease, confidence, riskLevel,
      vietnameseName, diseaseSummary,
      symptoms, immediateActions, farmerNotes, topPredictions,
    } = diag;

    const isHealthy = diseaseDetected === "HEALTHY_LEAF";
    const riskCfg   = riskLevel ? RISK_CONFIG[riskLevel] : null;
    const name      = getDiseaseName(diseaseDetected, vietnameseName);
    const pct       = confidenceScore != null ? Math.round(confidenceScore * 100) : null;

    return (
      <div className="border-t border-[#e8ece7]">
        {/* AI header */}
        <div className="flex items-center gap-2 border-b border-[#e8ece7] bg-[#f9fbf9] px-4 py-2.5">
          <Brain size={14} className="text-[#2E5A44]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#536259]">
            Kết quả chẩn đoán AI
          </span>
          {riskCfg && (
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${riskCfg.badge}`}>
              Rủi ro: {riskCfg.label}
            </span>
          )}
        </div>

        <div className="max-h-[40vh] overflow-y-auto p-4 space-y-4">
          {/* Disease name + confidence */}
          <div className={`rounded-xl border p-4 ${isHealthy ? "border-green-200 bg-green-50" : (riskCfg ? riskCfg.card : "border-red-200 bg-red-50")}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {isHealthy
                    ? <Leaf size={16} className="text-green-600 shrink-0" />
                    : <ShieldAlert size={16} className="text-red-500 shrink-0" />
                  }
                  <h4 className={`font-bold text-[14px] ${isHealthy ? "text-green-800" : "text-red-800"}`}>
                    {name}
                  </h4>
                </div>
                {predictedDisease && predictedDisease !== name && (
                  <p className="mt-0.5 text-[10px] text-gray-400 ml-6">{predictedDisease}</p>
                )}
              </div>
            </div>

            {/* Confidence bar */}
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[11px] text-gray-500">
                <span>Độ tin cậy</span>
                <span className="font-bold">{confidence ?? (pct != null ? `${pct}%` : "—")}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/70">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isHealthy ? "bg-green-500" : (riskCfg ? riskCfg.bar : "bg-red-500")
                  }`}
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Disease summary */}
          {diseaseSummary && (
            <p className="text-[12px] leading-relaxed text-[#536259]">{diseaseSummary}</p>
          )}

          {/* Symptoms */}
          {symptoms.length > 0 && (
            <div>
              <h5 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#536259]">
                Triệu chứng nhận biết
              </h5>
              <ul className="space-y-1.5">
                {symptoms.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex gap-2 text-[12px] text-[#536259]">
                    <span className="mt-0.5 shrink-0 text-[#D6A928]">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Immediate actions */}
          {immediateActions.length > 0 && !isHealthy && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <h5 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-red-700">
                <AlertTriangle size={11} /> Hành động ngay
              </h5>
              <ul className="space-y-1.5">
                {immediateActions.slice(0, 4).map((a, i) => (
                  <li key={i} className="flex gap-2 text-[12px] text-red-700">
                    <span className="shrink-0">→</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Farmer notes */}
          {farmerNotes.length > 0 && (
            <div className="rounded-xl border border-[#e8ece7] bg-[#f9fbf9] p-3">
              <h5 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[#536259]">
                <Sparkles size={11} className="text-[#D6A928]" /> Khuyến nghị nông dân
              </h5>
              <ul className="space-y-1.5">
                {farmerNotes.slice(0, 3).map((n, i) => (
                  <li key={i} className="flex gap-2 text-[12px] text-[#536259]">
                    <span className="shrink-0 text-[#D6A928]">✦</span>
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top predictions */}
          {topPredictions.length > 1 && (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600">
                <ChevronDown size={13} className="transition-transform group-open:rotate-180" />
                Xem tất cả dự đoán ({topPredictions.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {topPredictions.map((p, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1 text-[11px]">
                    <span className="text-gray-600">{DISEASE_NAMES[p.label] ?? p.label}</span>
                    <span className="font-semibold text-gray-500">{p.confidence.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function CameraSection() {
  const [deviceId, setDeviceId] = useState(CAMERA_DEVICES[0].id);

  // ── Live snapshot ─────────────────────────────────────────────────────────
  const [snapshotUrl, setSnapshotUrl]       = useState<string | null>(null);
  const [previewError, setPreviewError]     = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const snapshotTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobUrlRef     = useRef<string | null>(null);
  const inFlightRef    = useRef(false);  // guard: at most one snapshot request in flight

  const refreshSnapshot = useCallback(async () => {
    if (inFlightRef.current) return;  // skip — previous request still pending
    inFlightRef.current = true;
    try {
      const url = await cameraClient.fetchSnapshotBlob(deviceId);
      setSnapshotUrl((prev) => {
        if (prev && prev === blobUrlRef.current) URL.revokeObjectURL(prev);
        blobUrlRef.current = url;
        return url;
      });
      setPreviewError(null);
    } catch {
      setPreviewError("Không thể kết nối ESP32-CAM. Kiểm tra địa chỉ IP và kết nối mạng.");
    } finally {
      inFlightRef.current = false;
      setPreviewLoading(false);
    }
  }, [deviceId]);

  // Poll at 8 s — slower than the 6 s ESP32-CAM timeout so only one connection
  // is ever open at a time, even if a request stalls near the limit.
  useEffect(() => {
    setPreviewLoading(true);
    setSnapshotUrl(null);
    inFlightRef.current = false;
    void refreshSnapshot();
    snapshotTimer.current = setInterval(refreshSnapshot, 8_000);
    return () => {
      if (snapshotTimer.current) clearInterval(snapshotTimer.current);
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    };
  }, [refreshSnapshot]);

  // ── Capture now ───────────────────────────────────────────────────────────
  type CaptureStep = "idle" | "capturing" | "analyzing";
  const [captureStep, setCaptureStep]     = useState<CaptureStep>("idle");
  const [captureResult, setCaptureResult] = useState<CameraCapture | null>(null);
  const [captureError, setCaptureError]   = useState<string | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCaptureNow = async () => {
    setCaptureStep("capturing");
    setCaptureResult(null);
    setCaptureError(null);

    // Switch label to "analyzing" after 2 s (camera → AI handoff)
    stepTimerRef.current = setTimeout(() => setCaptureStep("analyzing"), 2_000);

    try {
      const capture = await cameraClient.captureNow(deviceId);
      setCaptureResult(capture);
      setEnlarged(capture);   // Auto-open diagnosis modal
      void fetchHistory();
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : "Chụp hình thất bại.");
    } finally {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
      setCaptureStep("idle");
    }
  };

  // ── History gallery ───────────────────────────────────────────────────────
  const [history, setHistory]       = useState<CameraCapture[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [enlarged, setEnlarged]     = useState<CameraCapture | null>(null);

  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const result = await cameraClient.history({ device_id: deviceId, limit: 12 });
      setHistory(result.data);
    } catch {
      // gallery errors are non-critical
    } finally {
      setHistLoading(false);
    }
  }, [deviceId]);

  useEffect(() => { void fetchHistory(); }, [fetchHistory]);

  // ── Schedule ──────────────────────────────────────────────────────────────
  const [schedEnabled, setSchedEnabled]   = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [schedSaving, setSchedSaving]     = useState(false);
  const [schedSaved, setSchedSaved]       = useState(false);
  const [schedError, setSchedError]       = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    try {
      const result = await cameraClient.getSchedule(deviceId);
      const active = new Set(result.schedules.filter((s) => s.enabled).map((s) => s.cron_expression));
      setSelectedSlots(active);
      setSchedEnabled(active.size > 0);
    } catch { /* silent */ }
  }, [deviceId]);

  useEffect(() => { void fetchSchedule(); }, [fetchSchedule]);

  // When enabling the schedule for the first time with nothing selected, pre-select all 6h–16h slots
  const handleToggleSchedule = (enabled: boolean) => {
    setSchedEnabled(enabled);
    if (enabled && selectedSlots.size === 0) {
      setSelectedSlots(new Set(TIME_SLOTS.map((ts) => ts.cron)));
    }
  };

  const toggleSlot = (cronExpr: string) =>
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      next.has(cronExpr) ? next.delete(cronExpr) : next.add(cronExpr);
      return next;
    });

  const handleSaveSchedule = async () => {
    setSchedSaving(true);
    setSchedError(null);
    try {
      const payload = schedEnabled
        ? TIME_SLOTS.filter((ts) => selectedSlots.has(ts.cron)).map((ts) => ({
            cron_expression: ts.cron, label: ts.label, enabled: true,
          }))
        : [];
      await cameraClient.updateSchedule(deviceId, payload);
      setSchedSaved(true);
      setTimeout(() => setSchedSaved(false), 3_000);
      void fetchSchedule();
    } catch (err) {
      setSchedError(err instanceof Error ? err.message : "Lưu lịch thất bại.");
    } finally {
      setSchedSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const isCapturing = captureStep !== "idle";

  return (
    <section className="panel scroll-mt-24 space-y-6 p-7 lg:p-8">

      {/* ── Header ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="grid size-10 place-items-center rounded-xl bg-[#e8f0e9] text-[#2E5A44]">
            <Camera size={20} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold">DurianCare AI Vision</h2>
            <p className="mt-0.5 text-[13px] text-[#7e8b83]">ESP32-CAM • Giám sát & Chẩn đoán bệnh lá sầu riêng</p>
          </div>
        </div>
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="h-9 rounded-xl border border-[#dfe5de] bg-white px-3 text-[13px] font-semibold outline-none"
        >
          {CAMERA_DEVICES.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* ── Preview + Schedule grid ── */}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">

        {/* Live stream preview + capture controls */}
        <div className="overflow-hidden rounded-2xl border border-[#e8ece7] bg-white">
          <div className="flex items-center justify-between border-b border-[#e8ece7] px-4 py-2.5">
            <span className="text-[12px] font-semibold text-[#536259]">Xem trực tiếp</span>
            {!previewError && !previewLoading && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf4ec] px-2.5 py-1 text-[10px] font-bold text-[#37704f]">
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-[#4b9666]" />
                LIVE · 3s
              </span>
            )}
          </div>

          <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
            {previewLoading && !snapshotUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            )}
            {previewError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-gray-400">
                <CameraOff size={32} className="opacity-60" />
                <p className="text-xs leading-relaxed">{previewError}</p>
                <button
                  onClick={() => void refreshSnapshot()}
                  className="rounded-lg bg-white/10 px-4 py-1.5 text-xs font-semibold hover:bg-white/20"
                >
                  Thử kết nối lại
                </button>
              </div>
            ) : snapshotUrl ? (
              <img
                key={snapshotUrl}
                src={snapshotUrl}
                alt="ESP32-CAM live preview"
                className="h-full w-full object-cover"
                onError={() => {
                  setPreviewError("Ảnh snapshot bị lỗi — ESP32-CAM có thể đang bận hoặc mất kết nối.");
                  setSnapshotUrl(null);
                }}
              />
            ) : null}

            {/* Capture-step overlay */}
            {isCapturing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  {captureStep === "capturing" ? (
                    <>
                      <Camera size={28} className="text-white animate-pulse" />
                      <p className="text-sm font-semibold text-white">Đang chụp ảnh...</p>
                    </>
                  ) : (
                    <>
                      <Brain size={28} className="text-[#9ECBB0] animate-pulse" />
                      <p className="text-sm font-semibold text-white">Đang phân tích bệnh bằng AI...</p>
                    </>
                  )}
                  <div className="mt-1 flex gap-1">
                    <span className={`size-1.5 rounded-full transition-colors ${captureStep === "capturing" ? "bg-white" : "bg-white/30"}`} />
                    <span className={`size-1.5 rounded-full transition-colors ${captureStep === "analyzing" ? "bg-[#9ECBB0]" : "bg-white/30"}`} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Capture controls */}
          <div className="space-y-2 p-3">
            <button
              onClick={handleCaptureNow}
              disabled={isCapturing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2E5A44] py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#264d3b] active:scale-[0.98] disabled:opacity-60"
            >
              {captureStep === "capturing" ? (
                <><Camera size={15} className="animate-pulse" /> Đang chụp ảnh...</>
              ) : captureStep === "analyzing" ? (
                <><Brain size={15} className="animate-pulse" /> Đang phân tích AI...</>
              ) : (
                <><Camera size={15} /> Chụp hình ngay</>
              )}
            </button>

            {captureResult && captureStep === "idle" && (
              <CaptureResultBanner
                capture={captureResult}
                onViewDetails={() => setEnlarged(captureResult)}
              />
            )}
            {captureError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-600">
                <AlertCircle size={14} className="shrink-0" />
                {captureError}
              </div>
            )}
          </div>
        </div>

        {/* Schedule configuration */}
        <div className="rounded-2xl border border-[#e8ece7] bg-white">
          <div className="flex items-center justify-between border-b border-[#e8ece7] px-4 py-2.5">
            <span className="flex items-center gap-2 text-[12px] font-semibold text-[#536259]">
              <Settings2 size={13} /> Lịch chụp & phân tích tự động
            </span>
            <button
              role="switch"
              aria-checked={schedEnabled}
              aria-label="Bật/tắt lịch tự động"
              onClick={() => handleToggleSchedule(!schedEnabled)}
              className={`relative h-5 w-9 rounded-full transition-colors ${schedEnabled ? "bg-[#2E5A44]" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${schedEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="space-y-3 p-4">
            {/* AI analysis notice — always visible */}
            <div className="flex items-start gap-2 rounded-xl bg-[#edf7f1] px-3 py-2.5 text-[11px] text-[#2E5A44]">
              <Brain size={13} className="mt-0.5 shrink-0" />
              <span>
                Mỗi lần chụp sẽ <strong>tự động phân tích bệnh lá</strong> bằng AI ngay sau khi chụp xong. Kết quả hiển thị trong thư viện ảnh bên dưới.
              </span>
            </div>

            <p className="text-[12px] text-[#7e8b83]">
              {schedEnabled ? "Chọn khung giờ chụp hàng ngày (6:00 – 16:00):" : "Bật lịch để cấu hình khung giờ."}
            </p>

            {schedEnabled && (
              <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
                <Clock size={11} className="shrink-0" />
                Chỉ hỗ trợ ban ngày (06:00 – 16:00) — ban đêm thiếu sáng, ảnh không dùng được.
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((ts) => {
                const active = schedEnabled && selectedSlots.has(ts.cron);
                return (
                  <button
                    key={ts.cron}
                    disabled={!schedEnabled}
                    onClick={() => toggleSlot(ts.cron)}
                    className={`flex flex-col items-center rounded-xl border py-2 text-[11px] font-semibold transition-all
                      ${active
                        ? "border-[#2E5A44] bg-[#edf7f1] text-[#2E5A44] shadow-sm"
                        : "border-[#dfe5de] bg-white text-[#7e8b83] disabled:opacity-40"
                      }`}
                  >
                    <Clock size={11} className="mb-0.5" />
                    {ts.label}
                  </button>
                );
              })}
            </div>

            {schedEnabled && selectedSlots.size === 0 && (
              <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-600">
                Chọn ít nhất một khung giờ để lưu lịch.
              </p>
            )}
            {schedError && (
              <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-600">{schedError}</p>
            )}

            <button
              onClick={handleSaveSchedule}
              disabled={schedSaving || (schedEnabled && selectedSlots.size === 0)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D6A928] py-2 text-[12px] font-semibold text-white transition hover:bg-[#b8911e] disabled:opacity-50"
            >
              {schedSaving ? (
                <><Loader2 size={13} className="animate-spin" /> Đang lưu...</>
              ) : schedSaved ? (
                <><CheckCircle2 size={13} /> Đã lưu!</>
              ) : (
                <><Calendar size={13} /> Lưu lịch chụp</>
              )}
            </button>

            {schedEnabled && selectedSlots.size > 0 && (
              <div className="rounded-xl bg-[#f9fbf9] px-3 py-2.5 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#536259]">Lịch đã cài</p>
                <p className="text-[11px] text-[#7e8b83]">
                  {TIME_SLOTS.filter((ts) => selectedSlots.has(ts.cron)).map((ts) => ts.label).join(" · ")} hàng ngày
                </p>
                <p className="flex items-center gap-1 text-[10px] text-[#2E5A44]">
                  <ScanSearch size={10} className="shrink-0" />
                  Chụp ảnh + phân tích AI tự động mỗi khung giờ trên
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Photo gallery ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#536259]">
            <ImageIcon size={13} /> Thư viện ảnh chụp gần đây
          </h3>
          <button
            onClick={() => void fetchHistory()}
            className="flex items-center gap-1.5 rounded-lg border border-[#dfe5de] bg-white px-3 py-1.5 text-[11px] text-[#536259] hover:bg-[#f0f4f1]"
          >
            <RefreshCw size={11} className={histLoading ? "animate-spin" : ""} />
            Tải lại
          </button>
        </div>

        {histLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-gray-100" style={{ aspectRatio: "4/3" }} />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dfe5de] py-14 text-sm text-gray-400">
            <Camera size={30} className="mb-2 opacity-30" />
            <p>Chưa có ảnh nào được chụp.</p>
            <p className="mt-0.5 text-xs">Nhấn "Chụp hình ngay" để bắt đầu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {history.map((cap) => (
              <div
                key={cap.id}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-[#e8ece7] bg-white shadow-sm transition-shadow hover:shadow-md"
                onClick={() => setEnlarged(cap)}
              >
                <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: "4/3" }}>
                  <img
                    src={cap.image_url}
                    alt={`Ảnh chụp ${cap.id}`}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-start justify-between bg-gradient-to-b from-black/30 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <CaptureBadge type={cap.capture_type} />
                    <Maximize2 size={13} className="text-white drop-shadow" />
                  </div>
                  {/* Disease badge (always visible) */}
                  <DiseaseBadge capture={cap} />
                </div>
                <div className="px-2 py-1.5">
                  <p className="truncate text-[10px] text-[#7e8b83]">{formatTime(cap.captured_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Enlarged image + diagnosis modal ── */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setEnlarged(null)}
        >
          <div
            className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{ maxHeight: "92vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#e8ece7] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <CaptureBadge type={enlarged.capture_type} />
                <span className="text-[12px] text-[#536259]">{formatTime(enlarged.captured_at)}</span>
                {enlarged.device_id && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                    {enlarged.device_id}
                  </span>
                )}
              </div>
              <button
                onClick={() => setEnlarged(null)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Image */}
            <div className="shrink-0 bg-black">
              <img
                src={enlarged.image_url}
                alt="Ảnh phóng to"
                className="max-h-[40vh] w-full object-contain"
              />
            </div>

            {/* AI Diagnosis card (scrollable) */}
            <DiagnosisCard
              diag={enlarged.diagnosis_result}
              aiStatus={enlarged.ai_status}
              diseaseDetected={enlarged.disease_detected}
              confidenceScore={enlarged.confidence_score}
            />

            {/* Notes fallback */}
            {!enlarged.ai_status && enlarged.notes && (
              <div className="border-t border-[#e8ece7] px-4 py-3">
                <p className="text-[12px] text-[#7e8b83]">{enlarged.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
