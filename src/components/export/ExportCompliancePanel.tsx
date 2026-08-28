"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  FlaskConical,
  Globe,
  Loader2,
  PackageCheck,
  Plus,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { exportClient } from "@/lib/export/client";
import type {
  BatchStatus,
  Chemical,
  ChemicalApplication,
  ExportAssessment,
  FarmingBatch,
  FinalizeResult,
  RecommendationPriority,
  RiskSeverity,
  TargetMarket,
} from "@/lib/export/types";

// ── Config ────────────────────────────────────────────────────────────────────

const DEVICE_OPTIONS = [
  { id: "esp32-01",     label: "ESP32-01 (Vườn chính)" },
  { id: "esp32-cam-01", label: "ESP32-CAM-01 (Vườn chính)" },
];

const SEVERITY_STYLE: Record<RiskSeverity, { badge: string; row: string; icon: typeof AlertCircle }> = {
  CRITICAL: { badge: "bg-red-100 text-red-700",    row: "bg-red-50 border-red-200",    icon: ShieldAlert },
  HIGH:     { badge: "bg-orange-100 text-orange-700", row: "bg-orange-50 border-orange-200", icon: AlertTriangle },
  MEDIUM:   { badge: "bg-amber-100 text-amber-700", row: "bg-amber-50 border-amber-200",  icon: AlertCircle },
  LOW:      { badge: "bg-green-100 text-green-700", row: "bg-green-50 border-green-200",  icon: CheckCircle2 },
};

const PRIORITY_STYLE: Record<RecommendationPriority, { pill: string }> = {
  CRITICAL: { pill: "bg-red-600 text-white" },
  HIGH:     { pill: "bg-orange-500 text-white" },
  MEDIUM:   { pill: "bg-amber-500 text-white" },
  LOW:      { pill: "bg-green-600 text-white" },
};

const SCORE_COLOR = (s: number) =>
  s >= 80 ? "text-green-600" : s >= 60 ? "text-amber-600" : "text-red-600";

const SCORE_BG = (s: number) =>
  s >= 80 ? "bg-green-500" : s >= 60 ? "bg-amber-500" : "bg-red-500";

function scoreLabel(s: number) {
  if (s >= 85) return "Đủ điều kiện xuất khẩu";
  if (s >= 70) return "Cần cải thiện nhỏ";
  if (s >= 50) return "Rủi ro cao — cần xử lý";
  return "Không đủ điều kiện";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Gauge({ score }: { score: number }) {
  const r = 56, cx = 70, cy = 70;
  const circumference = 2 * Math.PI * r;
  const arc = (score / 100) * circumference;
  return (
    <svg width={140} height={100} viewBox="0 0 140 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8ece7" strokeWidth={14} strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={0} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444"}
        strokeWidth={14}
        strokeDasharray={`${arc} ${circumference - arc}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-[#20312A]" style={{ fontWeight: 900, fontSize: 26 }}>{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-[#7e8b83]" style={{ fontSize: 11 }}>/ 100</text>
    </svg>
  );
}

function CriteriaBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  return (
    <div className="grid items-center gap-x-3 gap-y-0.5" style={{ gridTemplateColumns: "1fr 120px 32px" }}>
      <span className="truncate text-[12px] text-[#536259]">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-[#e8ece7]">
        <div className={`h-2 rounded-full transition-all ${SCORE_BG(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-right text-[12px] font-bold ${SCORE_COLOR(score)}`}>{score}</span>
      <span className="text-[10px] text-[#7e8b83]">Trọng số {weight}%</span>
    </div>
  );
}

// ── Chemical Applications input ───────────────────────────────────────────────

function ChemicalRow({
  app,
  index,
  chemicals,
  onChange,
  onRemove,
}: {
  app: ChemicalApplication;
  index: number;
  chemicals: Chemical[];
  onChange: (i: number, app: ChemicalApplication) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-[#e8ece7] bg-[#f9fbf9] p-3 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
      <select
        value={app.chemical_id}
        onChange={(e) => onChange(index, { ...app, chemical_id: e.target.value })}
        className="rounded-lg border border-[#dfe5de] bg-white px-2.5 py-1.5 text-[12px] outline-none"
      >
        <option value="">-- Chọn hoạt chất --</option>
        {chemicals.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input
        type="date"
        value={app.applied_at}
        onChange={(e) => onChange(index, { ...app, applied_at: e.target.value })}
        className="rounded-lg border border-[#dfe5de] bg-white px-2.5 py-1.5 text-[12px] outline-none"
      />
      <input
        type="number"
        min={0}
        step={0.1}
        placeholder="Liều kg/ha"
        value={app.dose_kg_per_ha || ""}
        onChange={(e) => onChange(index, { ...app, dose_kg_per_ha: parseFloat(e.target.value) || 0 })}
        className="rounded-lg border border-[#dfe5de] bg-white px-2.5 py-1.5 text-[12px] outline-none"
      />
      <button
        onClick={() => onRemove(index)}
        className="grid place-items-center rounded-lg border border-[#dfe5de] bg-white p-1.5 text-red-400 hover:bg-red-50"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── Batch lifecycle helpers ────────────────────────────────────────────────────

const STATUS_LABEL: Record<BatchStatus, string> = {
  PLANNED:    "Kế hoạch",
  GROWING:    "Đang canh tác",
  HARVESTING: "Thu hoạch",
  EVALUATING: "Đánh giá XK",
  EXPORTED:   "Đã xuất xưởng",
};

const STATUS_CLASS: Record<BatchStatus, string> = {
  PLANNED:    "bg-gray-100 text-gray-600",
  GROWING:    "bg-green-100 text-green-700",
  HARVESTING: "bg-amber-100 text-amber-700",
  EVALUATING: "bg-blue-100 text-blue-700",
  EXPORTED:   "bg-emerald-100 text-emerald-700",
};

const LIFECYCLE: BatchStatus[] = ["PLANNED", "GROWING", "HARVESTING", "EVALUATING"];

// ── QR Modal ─────────────────────────────────────────────────────────────────

function QrModal({
  result,
  onClose,
}: {
  result: FinalizeResult;
  onClose: () => void;
}) {
  const webBase = process.env.NEXT_PUBLIC_WEB_BASE_URL?.replace(/\/$/, "") || "";
  const traceUrl = `${webBase}/traceability/${result.traceability_code}`;
  const [copied, setCopied] = useState(false);

  function copyLink() {
    void navigator.clipboard.writeText(traceUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function printQr() {
    const w = window.open("", "_blank");
    if (!w) return;
    const svg = document.getElementById("qr-export-svg");
    w.document.write(`<html><body style="display:flex;flex-direction:column;align-items:center;gap:16px;font-family:sans-serif;padding:32px">
      <h2 style="font-size:18px;font-weight:900;color:#20312A">QR Truy xuất nguồn gốc sầu riêng</h2>
      <p style="font-size:12px;color:#536259;margin:0">${result.batch_code}</p>
      ${svg?.outerHTML ?? ""}
      <p style="font-size:10px;color:#7e8b83;margin:0">${traceUrl}</p>
      <p style="font-size:10px;color:#7e8b83">DurianCare IoT Platform</p>
    </body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <button onClick={onClose} className="absolute right-5 top-5 grid size-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200">
          <X size={16} />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
            <PackageCheck size={20} />
          </span>
          <div>
            <h3 className="text-[15px] font-black text-[#20312A]">Xuất xưởng thành công!</h3>
            <p className="text-[12px] text-[#7e8b83]">{result.batch_code}</p>
          </div>
        </div>

        <div className="mb-4 flex justify-center rounded-2xl bg-[#f9fbf9] p-5">
          <QRCodeSVG
            id="qr-export-svg"
            value={traceUrl}
            size={200}
            fgColor="#20312A"
            bgColor="#f9fbf9"
            level="M"
          />
        </div>

        <p className="mb-4 break-all text-center text-[10px] text-[#2E5A44]">{traceUrl}</p>

        {result.export_score != null && (
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-[12px] font-bold text-emerald-700">
              Điểm xuất khẩu: {result.export_score}/100
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#e8ece7] bg-white py-2.5 text-[12px] font-semibold text-[#536259] hover:bg-[#f0f4f1]"
          >
            <Copy size={13} /> {copied ? "Đã sao chép!" : "Sao chép liên kết"}
          </button>
          <button
            onClick={printQr}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] py-2.5 text-[12px] font-semibold text-white hover:bg-[#264d3b]"
          >
            <QrCode size={13} /> Tải tem QR (In ấn)
          </button>
        </div>

        <a
          href={traceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#2E5A44] hover:underline"
        >
          <ExternalLink size={11} /> Mở trang tra cứu công khai
        </a>
      </div>
    </div>
  );
}

// ── Batch management section ──────────────────────────────────────────────────

function BatchManagementSection() {
  const [batches,       setBatches]       = useState<FarmingBatch[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [updating,      setUpdating]      = useState<string | null>(null);
  const [finalizing,    setFinalizing]    = useState<string | null>(null);
  const [qrResult,      setQrResult]      = useState<FinalizeResult | null>(null);
  const [err,           setErr]           = useState<string | null>(null);

  useEffect(() => {
    exportClient.batches()
      .then((r) => setBatches(r.batches))
      .catch(() => setErr("Không tải được danh sách lô"))
      .finally(() => setLoading(false));
  }, []);

  async function handleStatus(id: string, status: BatchStatus) {
    setUpdating(id);
    setErr(null);
    try {
      const updated = await exportClient.updateBatchStatus(id, status);
      setBatches((prev) => prev.map((b) => b.id === id ? { ...b, status: updated.status } : b));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setUpdating(null);
    }
  }

  async function handleFinalize(id: string) {
    setFinalizing(id);
    setErr(null);
    try {
      const result = await exportClient.finalizeBatch(id);
      setBatches((prev) => prev.map((b) =>
        b.id === id ? { ...b, status: "EXPORTED", traceability_code: result.traceability_code, export_score: result.export_score } : b
      ));
      setQrResult(result);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xuất xưởng thất bại");
    } finally {
      setFinalizing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-[#7e8b83]">
        <Loader2 size={14} className="animate-spin" /> Đang tải lô mùa vụ...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#536259]">
        <PackageCheck size={13} /> Quản lý Lô mùa vụ ({batches.length})
      </h3>
      {err && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-700">
          <AlertCircle size={13} /> {err}
        </div>
      )}
      {batches.length === 0 && (
        <p className="text-[13px] text-[#7e8b83]">Chưa có lô nào được tạo. Thêm dữ liệu demo qua migration V6.</p>
      )}
      <div className="space-y-2">
        {batches.map((batch) => (
          <div key={batch.id} className="rounded-xl border border-[#e8ece7] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold text-[#20312A]">{batch.batch_code}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLASS[batch.status]}`}>
                    {STATUS_LABEL[batch.status]}
                  </span>
                  {batch.export_score != null && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Điểm: {batch.export_score}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-[#7e8b83]">
                  {batch.farm_name || "—"} · {batch.variety || "Sầu riêng"} · {batch.target_market}
                </p>
                {batch.traceability_code && (
                  <a
                    href={`/traceability/${batch.traceability_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 text-[11px] text-[#2E5A44] hover:underline"
                  >
                    <ExternalLink size={10} /> {batch.traceability_code}
                  </a>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {batch.status !== "EXPORTED" && (
                  <>
                    {/* Step backward / forward in lifecycle */}
                    {LIFECYCLE.includes(batch.status) && LIFECYCLE.indexOf(batch.status) > 0 && (
                      <select
                        disabled={updating === batch.id}
                        value={batch.status}
                        onChange={(e) => handleStatus(batch.id, e.target.value as BatchStatus)}
                        className="rounded-lg border border-[#dfe5de] bg-white px-2 py-1 text-[11px] outline-none"
                      >
                        {LIFECYCLE.map((s) => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    )}
                    {batch.status !== "EVALUATING" && (
                      <button
                        disabled={updating === batch.id}
                        onClick={() => {
                          const idx = LIFECYCLE.indexOf(batch.status);
                          if (idx < LIFECYCLE.length - 1) handleStatus(batch.id, LIFECYCLE[idx + 1]);
                        }}
                        className="rounded-lg border border-[#dfe5de] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#536259] hover:bg-[#f0f4f1] disabled:opacity-50"
                      >
                        {updating === batch.id ? "..." : `→ ${STATUS_LABEL[LIFECYCLE[LIFECYCLE.indexOf(batch.status) + 1] ?? "EVALUATING"]}`}
                      </button>
                    )}
                    {batch.status === "EVALUATING" && (
                      <button
                        disabled={finalizing === batch.id}
                        onClick={() => handleFinalize(batch.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <PackageCheck size={12} />
                        {finalizing === batch.id ? "Đang xuất..." : "Đóng gói & Tạo QR"}
                      </button>
                    )}
                  </>
                )}
                {batch.status === "EXPORTED" && batch.traceability_code && (
                  <button
                    onClick={() => setQrResult({
                      id: batch.id,
                      batch_code: batch.batch_code,
                      status: "EXPORTED",
                      traceability_code: batch.traceability_code!,
                      export_score: batch.export_score,
                      finalized_at: batch.finalized_at ?? "",
                      traceability_url: `/traceability/${batch.traceability_code}`,
                    })}
                    className="flex items-center gap-1.5 rounded-lg border border-[#dfe5de] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#2E5A44] hover:bg-[#f0f4f1]"
                  >
                    <QrCode size={12} /> Xem QR
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {qrResult && <QrModal result={qrResult} onClose={() => setQrResult(null)} />}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ExportCompliancePanel() {
  // Form state
  const [deviceId,       setDeviceId]       = useState(DEVICE_OPTIONS[0].id);
  const [targetMarket,   setTargetMarket]   = useState<TargetMarket>("CHINA");
  const [harvestDate,    setHarvestDate]    = useState("");
  const [applications,   setApplications]  = useState<ChemicalApplication[]>([]);
  const [showChemForm,   setShowChemForm]  = useState(false);

  // API state
  const [chemicals,      setChemicals]      = useState<Chemical[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [result,         setResult]         = useState<ExportAssessment | null>(null);

  const MARKETS: { id: TargetMarket; label: string }[] = [
    { id: "CHINA",    label: "🇨🇳 Trung Quốc (GACC)" },
    { id: "EU",       label: "🇪🇺 Liên minh Châu Âu" },
    { id: "US",       label: "🇺🇸 Hoa Kỳ (FDA/EPA)" },
    { id: "JAPAN",    label: "🇯🇵 Nhật Bản" },
    { id: "DOMESTIC", label: "🇻🇳 Nội địa (VietGAP)" },
  ];

  useEffect(() => {
    exportClient.chemicals().then((r) => setChemicals(r.chemicals)).catch(() => {});
  }, []);

  const addApplication = () => setApplications((a) => [
    ...a,
    { chemical_id: "", applied_at: new Date().toISOString().slice(0, 10), dose_kg_per_ha: 0.5 },
  ]);

  const updateApplication = (i: number, app: ChemicalApplication) =>
    setApplications((prev) => prev.map((a, idx) => idx === i ? app : a));

  const removeApplication = (i: number) =>
    setApplications((prev) => prev.filter((_, idx) => idx !== i));

  const handleEvaluate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const assessment = await exportClient.evaluate({
        device_id:              deviceId,
        target_market:          targetMarket,
        harvest_date:           harvestDate || undefined,
        chemical_applications:  applications.filter((a) => a.chemical_id),
      });
      setResult(assessment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đánh giá thất bại.");
    } finally {
      setLoading(false);
    }
  }, [deviceId, targetMarket, harvestDate, applications]);

  const handlePrint = () => window.print();

  return (
    <section className="panel space-y-6 p-7 lg:p-8">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="grid size-10 place-items-center rounded-xl bg-[#e8f0e9] text-[#2E5A44]">
            <BadgeCheck size={20} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold">Đánh giá Sẵn sàng Xuất khẩu</h2>
            <p className="mt-0.5 text-[13px] text-[#7e8b83]">Tiêu chuẩn GACC · GlobalGAP · EU · VietGAP · Dư lượng MRL</p>
          </div>
        </div>
        {result && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl border border-[#dfe5de] bg-white px-4 py-2 text-[12px] font-semibold text-[#536259] hover:bg-[#f0f4f1] print:hidden"
          >
            <FileText size={14} /> Xuất báo cáo (PDF/In)
          </button>
        )}
      </div>

      {/* Batch management */}
      <div className="rounded-2xl border border-[#e8ece7] bg-[#f9fbf9] p-5 print:hidden">
        <BatchManagementSection />
      </div>

      {/* Config form */}
      <div className="grid gap-4 rounded-2xl border border-[#e8ece7] bg-[#f9fbf9] p-5 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        {/* Device */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wide text-[#536259]">Thiết bị IoT</label>
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="w-full rounded-xl border border-[#dfe5de] bg-white px-3 py-2 text-[12px] outline-none"
          >
            {DEVICE_OPTIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>

        {/* Market */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wide text-[#536259]">Thị trường mục tiêu</label>
          <select
            value={targetMarket}
            onChange={(e) => setTargetMarket(e.target.value as TargetMarket)}
            className="w-full rounded-xl border border-[#dfe5de] bg-white px-3 py-2 text-[12px] outline-none"
          >
            {MARKETS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        {/* Harvest date */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wide text-[#536259]">Ngày thu hoạch dự kiến</label>
          <input
            type="date"
            value={harvestDate}
            onChange={(e) => setHarvestDate(e.target.value)}
            className="w-full rounded-xl border border-[#dfe5de] bg-white px-3 py-2 text-[12px] outline-none"
          />
        </div>

        {/* Run button */}
        <div className="flex items-end">
          <button
            onClick={handleEvaluate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2E5A44] py-2.5 text-[13px] font-semibold text-white hover:bg-[#264d3b] disabled:opacity-60"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" /> Đang phân tích...</> : <><TrendingUp size={15} /> Đánh giá ngay</>}
          </button>
        </div>
      </div>

      {/* Chemical applications input */}
      <div className="print:hidden">
        <button
          onClick={() => setShowChemForm((v) => !v)}
          className="flex items-center gap-2 text-[13px] font-semibold text-[#2E5A44] hover:underline"
        >
          <FlaskConical size={14} />
          {showChemForm ? "Ẩn" : "Nhập"} lịch sử phun thuốc / bón phân
          {showChemForm ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showChemForm && (
          <div className="mt-3 space-y-2">
            <div className="grid text-[10px] font-bold uppercase tracking-wide text-[#7e8b83] sm:grid-cols-[1.5fr_1fr_1fr_auto]">
              <span>Hoạt chất</span>
              <span>Ngày phun</span>
              <span>Liều (kg/ha)</span>
            </div>
            {applications.map((app, i) => (
              <ChemicalRow
                key={i}
                app={app}
                index={i}
                chemicals={chemicals}
                onChange={updateApplication}
                onRemove={removeApplication}
              />
            ))}
            <button
              onClick={addApplication}
              className="flex items-center gap-2 rounded-xl border border-dashed border-[#dfe5de] bg-white px-3 py-2 text-[12px] text-[#536259] hover:bg-[#f0f4f1]"
            >
              <Plus size={13} /> Thêm hoạt chất
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Score card */}
          <div className="overflow-hidden rounded-2xl border border-[#e8ece7] bg-white">
            <div className="flex flex-col items-center justify-center gap-4 border-b border-[#e8ece7] bg-[#f9fbf9] p-6 sm:flex-row">
              <Gauge score={result.overall_score} />
              <div className="text-center sm:text-left">
                <div className={`text-[32px] font-black ${SCORE_COLOR(result.overall_score)}`}>
                  {result.overall_score}%
                </div>
                <div className="text-[15px] font-bold text-[#20312A]">{scoreLabel(result.overall_score)}</div>
                <div className="mt-1 flex items-center justify-center gap-1.5 sm:justify-start">
                  <Globe size={12} className="text-[#536259]" />
                  <span className="text-[12px] text-[#536259]">{result.market_label}</span>
                </div>
                {result.days_until_harvest > 0 && (
                  <div className="mt-2 rounded-full bg-[#edf7f1] px-3 py-1 text-[11px] font-semibold text-[#2E5A44] inline-block">
                    Còn {result.days_until_harvest} ngày đến thu hoạch
                  </div>
                )}
              </div>
            </div>

            {/* Criteria breakdown */}
            <div className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#536259]">
                <BarChart3 size={13} /> Phân tích 5 tiêu chí
              </h3>
              <div className="space-y-3">
                {result.criteria.map((c) => (
                  <CriteriaBar key={c.key} label={c.label} score={c.score} weight={c.weight} />
                ))}
              </div>
            </div>
          </div>

          {/* Risk table */}
          {result.risk_summary.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#536259]">
                <ShieldAlert size={13} /> Rủi ro dư lượng hoạt chất ({result.risk_summary.length})
              </h3>
              <div className="space-y-2">
                {result.risk_summary.map((r, i) => {
                  const cfg  = SEVERITY_STYLE[r.severity];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className={`rounded-xl border p-4 ${cfg.row}`}>
                      <div className="flex items-start gap-3">
                        <Icon size={16} className="mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-bold text-[#20312A]">{r.name}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                              {r.severity}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] text-[#536259]">{r.message}</p>
                          <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-[#7e8b83]">
                            <span>Phun {r.days_since_app} ngày trước</span>
                            {r.estimated_ppm > 0 && <span>~{r.estimated_ppm.toFixed(3)} ppm ước tính</span>}
                            {r.mrl_ppm != null && <span>MRL {r.mrl_ppm} ppm</span>}
                            {r.phi_remaining > 0 && <span>PHI còn {r.phi_remaining} ngày</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.risk_summary.length === 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-[13px] text-green-700">
              <ShieldCheck size={16} className="shrink-0" />
              Không phát hiện rủi ro dư lượng đối với thị trường {result.market_label}.
            </div>
          )}

          {/* Recommendations */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#536259]">
              <ClipboardList size={13} /> Khuyến nghị từ AI ({result.recommendations.length})
            </h3>
            <div className="space-y-2">
              {result.recommendations.map((rec, i) => {
                const pill = PRIORITY_STYLE[rec.priority].pill;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-[#e8ece7] bg-white p-4">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${pill}`}>
                      {rec.priority}
                    </span>
                    <p className="text-[13px] leading-relaxed text-[#536259]">{rec.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Print footer */}
          <div className="hidden print:block border-t border-gray-200 pt-4 text-center text-[11px] text-gray-400">
            Báo cáo đánh giá sơ bộ khả năng xuất khẩu — DurianCare IoT Platform · {new Date(result.assessed_at).toLocaleString("vi-VN")}
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dfe5de] py-16 text-center">
          <ShieldCheck size={36} className="mb-3 opacity-20" />
          <p className="text-[14px] font-semibold text-[#536259]">Chọn thiết bị, thị trường và nhấn "Đánh giá ngay"</p>
          <p className="mt-1 text-[12px] text-[#7e8b83]">Hệ thống sẽ phân tích dữ liệu IoT + lịch sử bệnh camera + danh mục hoạt chất để tính điểm sẵn sàng.</p>
        </div>
      )}
    </section>
  );
}
