"use client";

import Link from "next/link";
import JsBarcode from "jsbarcode";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { treeClient, TreeApiError } from "@/lib/trees/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { predictLeafDisease } from "@/lib/ai/client";
import type { PredictionData } from "@/lib/ai/types";
import type {
  CreateCarePlanRequest,
  RecommendedCareTask,
  RecoveryEvaluationResponse,
  TreeCarePlan,
  TreeCareRecommendation,
  TreeCareTask,
  TreeDetail,
  TreeDiagnosis,
  TreeHealthStatus,
} from "@/lib/trees/types";
import type { CultivationSeason, TreeYieldObservation } from "@/lib/cultivation/types";
import { cultivationClient } from "@/lib/cultivation/client";
import type { DiseaseCategory } from "@/lib/labels";
import { knowledgeClient } from "@/lib/knowledge/client";
import type { KnowledgeArticle } from "@/lib/knowledge/types";

// ── Display helpers ───────────────────────────────────────────────────────────

const HEALTH_LABELS: Record<string, string> = {
  HEALTHY: "Khỏe mạnh",
  DISEASED: "Bệnh",
  TREATING: "Đang điều trị",
  SUSPECTED: "Nghi ngờ",
  RECOVERED: "Đã hồi phục",
};

const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: "text-green-700 bg-green-50 border-green-200",
  DISEASED: "text-red-700 bg-red-50 border-red-200",
  TREATING: "text-orange-700 bg-orange-50 border-orange-200",
  SUSPECTED: "text-yellow-700 bg-yellow-50 border-yellow-200",
  RECOVERED: "text-cyan-700 bg-cyan-50 border-cyan-200",
};

const HEALTH_STATUS_OPTIONS: TreeHealthStatus[] = ["HEALTHY", "DISEASED", "TREATING", "SUSPECTED", "RECOVERED"];

function TreeBarcode({ treeCode }: { treeCode: string }) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!barcodeRef.current) return;
    JsBarcode(barcodeRef.current, treeCode, {
      format: "CODE128",
      displayValue: false,
      height: 44,
      margin: 0,
      width: 1.35,
    });
  }, [treeCode]);

  const copy = async () => {
    await navigator.clipboard?.writeText(treeCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return <div className="rounded-xl border border-neutral-100 bg-white p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-neutral-500">MÃ VẠCH CÂY</p><button className="text-xs font-bold text-[#2E5A44] underline" onClick={() => void copy()} type="button">{copied ? "Đã sao chép" : "Sao chép mã"}</button></div><svg aria-label={`Mã vạch CODE128 cho ${treeCode}`} className="mt-2 h-11 max-w-full" ref={barcodeRef} /><p className="mt-1 font-mono text-xs font-semibold text-neutral-700">{treeCode}</p></div>;
}

function YieldObservationPanel({ treeId, season, farmId, zoneId, onSaved, onSeasonCreated, onYieldSaved }: { treeId: string; season: CultivationSeason | null; farmId: string; zoneId: string; onSaved: () => void; onSeasonCreated: (season: CultivationSeason) => void; onYieldSaved?: () => void }) {
  const { user } = useAuth();
  const [fruitCount, setFruitCount] = useState("");
  const [weightOverride, setWeightOverride] = useState("");
  const [entryOpen, setEntryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [observations, setObservations] = useState<TreeYieldObservation[]>([]);
  const [observationsError, setObservationsError] = useState<string | null>(null);
  const [seasonName, setSeasonName] = useState(() => `Mùa vụ ${new Date().getFullYear()}`);
  const [crop, setCrop] = useState("Sầu riêng");
  const [variety, setVariety] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");

  const loadObservations = useCallback(async () => {
    if (!season) {
      setObservations([]);
      return;
    }
    try {
      setObservationsError(null);
      setObservations(await cultivationClient.listTreeYieldObservations(treeId, season.id));
    } catch (caught) {
      setObservationsError(caught instanceof Error ? caught.message : "Không thể tải các lần ghi nhận số trái.");
    }
  }, [season, treeId]);

  useEffect(() => { void loadObservations(); }, [loadObservations]);

  const createSeason = async () => {
    if (!user?.userId) {
      setError("Không xác định được tài khoản để tạo mùa vụ.");
      return;
    }
    if (!seasonName.trim() || !startDate || (endDate && endDate < startDate)) {
      setError("Nhập tên mùa vụ, ngày bắt đầu và bảo đảm ngày kết thúc không sớm hơn ngày bắt đầu.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await cultivationClient.createSeason({
        farmId,
        plotId: zoneId,
        name: seasonName.trim(),
        crop: crop.trim() || null,
        variety: variety.trim() || null,
        startDate,
        endDate: endDate || null,
        createdBy: user.userId,
      });
      onSeasonCreated(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tạo mùa vụ.");
    } finally {
      setSaving(false);
    }
  };

  if (!season) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-extrabold text-amber-900">TẠO MÙA VỤ ĐỂ GHI NHẬN SỐ TRÁI</p><p className="mt-1 text-xs text-amber-800">Khu này chưa có mùa vụ hiệu lực hôm nay. Tạo mùa vụ bên dưới, sau đó nhập số trái ngay tại cây đang chọn.</p><div className="mt-3 grid gap-2"><input className="rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-sm" onChange={(event) => setSeasonName(event.target.value)} placeholder="Tên mùa vụ" value={seasonName} /><div className="grid grid-cols-2 gap-2"><input className="rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-sm" onChange={(event) => setCrop(event.target.value)} placeholder="Cây trồng" value={crop} /><input className="rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-sm" onChange={(event) => setVariety(event.target.value)} placeholder="Giống (tùy chọn)" value={variety} /></div><div className="grid grid-cols-2 gap-2"><label className="text-xs text-neutral-600">Bắt đầu<input className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-sm" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} /></label><label className="text-xs text-neutral-600">Kết thúc (tùy chọn)<input className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-sm" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} /></label></div></div>{error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}<button className="mt-3 w-full rounded-lg bg-[#2E5A44] py-2 text-sm font-bold text-white disabled:opacity-50" disabled={saving} onClick={() => void createSeason()} type="button">{saving ? "Đang tạo..." : "Tạo mùa vụ và nhập số trái"}</button></div>;
  const save = async () => {
    const fruits = Number(fruitCount);
    const weight = weightOverride.trim() === "" ? null : Number(weightOverride);
    if (!Number.isInteger(fruits) || fruits < 0 || (weight != null && (!Number.isFinite(weight) || weight <= 0))) {
      setError("Số trái phải là số nguyên từ 0; khối lượng riêng phải lớn hơn 0.");
      return;
    }
    setSaving(true); setError(null);
    try {
      await cultivationClient.createTreeYieldObservation(treeId, { seasonId: season.id, zoneId, fruitCount: fruits, averageFruitWeightKgOverride: weight });
      setFruitCount(""); setWeightOverride(""); setEntryOpen(false); await loadObservations(); onSaved(); onYieldSaved?.();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể lưu số trái."); }
    finally { setSaving(false); }
  };
  const latestObservation = observations[0];
  return <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3"><p className="text-xs font-extrabold text-emerald-800">SỐ LƯỢNG TRÁI · {season.name}</p>{latestObservation ? <p className="mt-1 text-xs font-semibold text-emerald-900">Hiện tại: {latestObservation.fruitCount} trái · {new Date(latestObservation.observedAt).toLocaleString("vi-VN")}</p> : <p className="mt-1 text-xs text-neutral-600">Chưa có lần ghi nhận nào trong mùa vụ này.</p>}{observations.length > 1 ? <p className="mt-1 text-xs text-neutral-600">Hệ thống dùng lần ghi nhận mới nhất để tính dự báo.</p> : null}{observationsError ? <p className="mt-2 text-xs font-semibold text-red-600">{observationsError}</p> : null}<button className="mt-3 w-full rounded-lg border border-emerald-300 bg-white py-2 text-sm font-bold text-[#2E5A44] hover:bg-emerald-50" onClick={() => setEntryOpen((current) => !current)} type="button">{entryOpen ? "Ẩn biểu mẫu" : latestObservation ? "Cập nhật số lượng trái" : "Ghi nhận số lượng trái"}</button>{entryOpen ? <div className="mt-3 border-t border-emerald-200 pt-3"><p className="text-xs text-neutral-600">Khối lượng TB dùng thiết lập khu nếu không nhập giá trị riêng.</p><div className="mt-3 grid gap-2"><input className="rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-sm" inputMode="numeric" min="0" onChange={(event) => setFruitCount(event.target.value)} placeholder="Số trái hiện tại" type="number" value={fruitCount} /><input className="rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-sm" inputMode="decimal" min="0" onChange={(event) => setWeightOverride(event.target.value)} placeholder="Khối lượng riêng (kg/trái, tùy chọn)" type="number" value={weightOverride} /></div>{error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}<button className="mt-3 w-full rounded-lg bg-[#2E5A44] py-2 text-sm font-bold text-white disabled:opacity-50" disabled={saving} onClick={() => void save()} type="button">{saving ? "Đang lưu..." : "Lưu số trái"}</button></div> : null}</div>;
}

function categoryFromCode(code: string | null | undefined): DiseaseCategory {
  if (!code) return "INVALID_IMAGE";
  const lower = code.toLowerCase();
  if (lower === "low_confidence") return "LOW_CONFIDENCE";
  if (lower === "invalid_image") return "INVALID_IMAGE";
  if (lower === "recovered_by_farmer") return "HEALTHY";
  if (lower.includes("healthy")) return "HEALTHY";
  if (lower.includes("allocaridara")) return "PEST";
  return "DISEASE";
}

const CAT_BADGE: Record<DiseaseCategory, string> = {
  HEALTHY: "bg-green-50 text-green-700",
  DISEASE: "bg-red-50 text-red-700",
  PEST: "bg-amber-50 text-amber-700",
  LOW_CONFIDENCE: "bg-neutral-100 text-neutral-600",
  INVALID_IMAGE: "bg-neutral-100 text-neutral-500",
};

const CAT_LABEL: Record<DiseaseCategory, string> = {
  HEALTHY: "Khỏe",
  DISEASE: "Bệnh",
  PEST: "Sâu/Bọ",
  LOW_CONFIDENCE: "Thấp tin cậy",
  INVALID_IMAGE: "Ảnh không hợp lệ",
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs font-bold text-neutral-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-neutral-800">
        {value ?? <span className="text-neutral-400">Chưa có dữ liệu</span>}
      </dd>
    </div>
  );
}

// ── AI Panel ──────────────────────────────────────────────────────────────────

interface AIPanelProps {
  treeId: string;
  treeCode: string;
  onSaved: () => void;
}

function AIPanel({ treeId, treeCode, onSaved }: AIPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [predError, setPredError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [kbArticles, setKbArticles] = useState<KnowledgeArticle[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cat = prediction ? categoryFromCode(prediction.predictedDisease) : null;
    if (!cat || cat === "HEALTHY" || cat === "LOW_CONFIDENCE" || cat === "INVALID_IMAGE") {
      setKbArticles([]);
      return;
    }
    const diseaseCodeForKb = prediction?.predictedDisease ?? "";
    if (!diseaseCodeForKb) return;
    knowledgeClient
      .list({ search: diseaseCodeForKb, size: 2, status: "PUBLISHED" })
      .then((page) => setKbArticles(page.articles))
      .catch(() => setKbArticles([]));
  }, [prediction]);

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setPrediction(null);
    setPredError(null);
    setSavedOk(false);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(chosen);
    setPreviewUrl(URL.createObjectURL(chosen));
    setPrediction(null);
    setPredError(null);
    setSavedOk(false);
    e.target.value = "";
  }

  async function analyze() {
    if (!file) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPredicting(true);
    setPredError(null);
    setPrediction(null);
    try {
      const res = await predictLeafDisease(file, "WEB");
      if (!ctrl.signal.aborted) setPrediction(res.data);
    } catch (err) {
      if (!ctrl.signal.aborted) {
        setPredError(err instanceof Error ? err.message : "Phân tích thất bại.");
      }
    } finally {
      if (!ctrl.signal.aborted) setPredicting(false);
    }
  }

  async function saveResult() {
    if (!prediction) return;
    setSaving(true);
    try {
      const bbox = prediction.boundingBox
        ? ({
            left: prediction.boundingBox.left,
            top: prediction.boundingBox.top,
            right: prediction.boundingBox.right,
            bottom: prediction.boundingBox.bottom,
          } as Record<string, unknown>)
        : null;
      await treeClient.saveDiagnosis(treeId, {
        imageUrl: prediction.image?.url || "WEB_AI_NO_STORED_IMAGE",
        diseaseCode: prediction.predictedDisease,
        diseaseName: prediction.recommendation?.vietnameseName ?? null,
        confidence: prediction.confidence / 100,
        boundingBox: bbox,
        source: "WEB",
      });
      setSavedOk(true);
      onSaved();
    } catch (err) {
      setPredError(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  }

  const cat = prediction ? categoryFromCode(prediction.predictedDisease) : null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-xs font-extrabold text-neutral-700">PHÂN TÍCH AI</span>
        {expanded ? (
          <ChevronUp size={14} className="text-neutral-400" />
        ) : (
          <ChevronDown size={14} className="text-neutral-400" />
        )}
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3">
          {/* File picker */}
          {!savedOk ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 py-3 text-sm font-semibold text-neutral-500 hover:border-[#2E5A44] hover:text-[#2E5A44] transition-colors"
              >
                <ImagePlus size={16} />
                {file ? "Chọn ảnh khác" : "Chọn ảnh lá cây"}
              </button>
            </>
          ) : null}

          {/* Image preview */}
          {previewUrl && !savedOk ? (
            <div className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Ảnh đã chọn" className="w-full rounded-xl object-cover max-h-48" />
              {prediction?.boundingBox ? (
                <div
                  className="pointer-events-none absolute border-2 border-dashed rounded"
                  style={{
                    left: `${prediction.boundingBox.left}%`,
                    top: `${prediction.boundingBox.top}%`,
                    right: `${prediction.boundingBox.right}%`,
                    bottom: `${prediction.boundingBox.bottom}%`,
                    borderColor: cat === "HEALTHY" ? "#16a34a" : cat === "PEST" ? "#f59e0b" : "#dc2626",
                  }}
                />
              ) : null}
            </div>
          ) : null}

          {/* Analyze button */}
          {file && !prediction && !predicting && !savedOk ? (
            <button
              type="button"
              onClick={analyze}
              className="w-full rounded-xl bg-[#2E5A44] py-2.5 text-sm font-bold text-white transition hover:bg-[#254d3a]"
            >
              Phân tích
            </button>
          ) : null}

          {/* Loading */}
          {predicting ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 size={14} className="animate-spin" />
              Đang phân tích...
            </div>
          ) : null}

          {/* Result */}
          {prediction && !savedOk ? (
            <div className={`rounded-xl p-3 space-y-1.5 ${CAT_BADGE[cat!]}`}>
              <div className="flex items-center justify-between">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${CAT_BADGE[cat!]}`}>
                  {CAT_LABEL[cat!]}
                </span>
                <span className="text-xs font-semibold">{prediction.confidence.toFixed(1)}%</span>
              </div>
              <p className="text-sm font-bold">{prediction.recommendation?.vietnameseName ?? prediction.predictedDisease}</p>
              <p className="text-xs opacity-70">{prediction.predictedDisease}</p>
              {prediction.recommendation?.diseaseSummary ? (
                <p className="text-xs opacity-80 mt-1">{prediction.recommendation.diseaseSummary}</p>
              ) : null}
              {kbArticles.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                    <BookOpen size={10} className="inline mr-1" />
                    Tìm hiểu thêm
                  </p>
                  {kbArticles.map((a) => (
                    <Link
                      key={a.id}
                      href={`/dashboard/client/knowledge/${encodeURIComponent(a.slug)}`}
                      className="block rounded-lg border border-current/10 bg-white/50 px-2.5 py-2 hover:bg-white/80 transition-colors"
                    >
                      <p className="text-xs font-bold leading-snug">{a.title}</p>
                      <p className="mt-0.5 text-[10px] opacity-70 leading-snug line-clamp-2">{a.excerpt}</p>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Save */}
          {prediction && !saving && !savedOk ? (
            <button
              type="button"
              onClick={saveResult}
              className="w-full rounded-xl bg-[#2E5A44] py-2.5 text-sm font-bold text-white transition hover:bg-[#254d3a]"
            >
              Lưu vào hồ sơ cây {treeCode}
            </button>
          ) : null}

          {saving ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 size={14} className="animate-spin" />
              Đang lưu...
            </div>
          ) : null}

          {/* Success */}
          {savedOk ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3">
              <CheckCircle size={16} className="text-green-600 shrink-0" />
              <p className="text-sm font-semibold text-green-700">Đã lưu vào hồ sơ cây.</p>
              <button type="button" onClick={reset} className="ml-auto text-xs font-bold text-green-700 hover:underline">
                Phân tích lại
              </button>
            </div>
          ) : null}

          {/* Error */}
          {predError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {predError}
              <button type="button" onClick={reset} className="ml-2 text-xs font-bold underline">
                Thử lại
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── Recovery Panel ────────────────────────────────────────────────────────────

interface RecoveryPanelProps {
  treeId: string;
  treeCode: string;
  onSaved: () => void;
}

const RECOVERY_OUTCOME_ELIGIBLE = new Set(["RECOVERED", "IMPROVED"]);

const RECOVERY_OUTCOME_LABEL: Record<string, string> = {
  RECOVERED: "Đã hồi phục",
  IMPROVED: "Có dấu hiệu cải thiện",
  STABLE: "Chưa có cải thiện rõ ràng",
  WORSENED: "Có dấu hiệu xấu đi",
  UNCERTAIN: "Chưa xác định",
};

const RECOVERY_OUTCOME_CARD: Record<string, string> = {
  RECOVERED: "border-green-200 bg-green-50 text-green-700",
  IMPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  STABLE: "border-yellow-200 bg-yellow-50 text-yellow-700",
  WORSENED: "border-red-200 bg-red-50 text-red-700",
  UNCERTAIN: "border-neutral-200 bg-neutral-50 text-neutral-600",
};

const RECOVERY_NEXT_ACTION: Record<string, string> = {
  RECOVERED: "Có thể xác nhận cây đã hồi phục. Backend vẫn kiểm tra lại điều kiện trước khi cập nhật Tree Map.",
  IMPROVED: "Tiếp tục kế hoạch chăm sóc hiện tại và đặt lịch tái khám tiếp theo nếu cần.",
  STABLE: "Tiếp tục điều trị/theo dõi. Chưa cho xác nhận hồi phục.",
  WORSENED: "Đánh giá lại hướng xử lý, xem lại Knowledge Base hoặc tạo kế hoạch chăm sóc mới.",
  UNCERTAIN: "Chụp/đưa ảnh rõ hơn hoặc kiểm tra thêm trước khi kết luận.",
};

function formatPercent(value?: number | null) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function RecoveryEvaluationCard({
  evaluation,
  eligible,
}: {
  evaluation: RecoveryEvaluationResponse;
  eligible?: boolean;
}) {
  const tone = RECOVERY_OUTCOME_CARD[evaluation.outcome] ?? RECOVERY_OUTCOME_CARD.UNCERTAIN;
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold">
          {RECOVERY_OUTCOME_LABEL[evaluation.outcome] ?? evaluation.outcome}
        </p>
        {eligible === false ? (
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold">
            Không đủ điều kiện RECOVERED
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs opacity-85">{evaluation.reason}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-white/70 p-2">
          <p className="font-bold opacity-60">Lần trước</p>
          <p className="mt-1 font-semibold">{evaluation.previousDiseaseCode ?? "—"}</p>
          <p className="opacity-70">Confidence: {formatPercent(evaluation.previousConfidence)}</p>
        </div>
        <div className="rounded-lg bg-white/70 p-2">
          <p className="font-bold opacity-60">Hiện tại</p>
          <p className="mt-1 font-semibold">{evaluation.currentDiseaseCode ?? "—"}</p>
          <p className="opacity-70">Confidence: {formatPercent(evaluation.currentConfidence)}</p>
        </div>
      </div>
      <p className="mt-2 rounded-lg bg-white/70 p-2 text-xs font-semibold">
        {RECOVERY_NEXT_ACTION[evaluation.outcome] ?? RECOVERY_NEXT_ACTION.UNCERTAIN}
      </p>
    </div>
  );
}

function RecoveryPanel({ treeId, treeCode, onSaved }: RecoveryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<RecoveryEvaluationResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !evaluation) {
      setEvaluating(true);
      setError(null);
      try {
        const result = await treeClient.evaluateRecovery(treeId);
        setEvaluation(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể đánh giá phục hồi.");
      } finally {
        setEvaluating(false);
      }
    }
  }

  async function confirm() {
    if (!notes.trim()) {
      setError("Vui lòng nhập ghi chú xác nhận phục hồi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await treeClient.updateHealthStatus(treeId, "RECOVERED");
      setSavedOk(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.");
    } finally {
      setSaving(false);
    }
  }

  const eligible = evaluation ? RECOVERY_OUTCOME_ELIGIBLE.has(evaluation.outcome) : false;

  if (savedOk) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
        <CheckCircle size={16} className="text-green-600 shrink-0" />
        <p className="text-sm font-semibold text-green-700">Xác nhận phục hồi đã lưu cho cây {treeCode}.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between"
        onClick={handleExpand}
      >
        <span className="text-xs font-extrabold text-green-700">XÁC NHẬN PHỤC HỒI</span>
        {expanded ? (
          <ChevronUp size={14} className="text-green-600" />
        ) : (
          <ChevronDown size={14} className="text-green-600" />
        )}
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3">
          {evaluating ? (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Loader2 size={12} className="animate-spin" />
              Đang đánh giá tình trạng phục hồi...
            </div>
          ) : evaluation ? (
            <RecoveryEvaluationCard evaluation={evaluation} eligible={eligible} />
          ) : null}

          {eligible ? (
            <>
              <p className="text-xs text-neutral-600">
                Xác nhận cây đã phục hồi sau điều trị. Backend sẽ kiểm tra lại evaluateRecovery trước khi cập nhật Tree Map.
              </p>
              <textarea
                className="w-full rounded-xl border border-neutral-200 p-2.5 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                rows={3}
                placeholder="Ghi chú xác nhận (bắt buộc)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </>
          ) : null}

          {error ? (
            <p className="text-xs font-semibold text-red-600">{error}</p>
          ) : null}

          {eligible ? (
            saving ? (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 size={14} className="animate-spin" />
                Đang lưu...
              </div>
            ) : (
              <button
                type="button"
                onClick={confirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
              >
                <CheckCircle size={14} />
                Gửi xác nhận phục hồi
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── Treatment panel (DISEASED/SUSPECTED → TREATING) ──────────────────────────

interface TreatmentPanelProps {
  treeId: string;
  treeCode: string;
  onSaved: () => void;
}

function TreatmentPanel({ treeId, treeCode, onSaved }: TreatmentPanelProps) {
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startTreatment() {
    setSaving(true);
    setError(null);
    try {
      await treeClient.updateHealthStatus(treeId, "TREATING");
      setSavedOk(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  }

  if (savedOk) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
        <CheckCircle size={16} className="text-orange-600 shrink-0" />
        <p className="text-sm font-semibold text-orange-700">Cây {treeCode} đã được đánh dấu đang điều trị.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-3">
      <p className="text-xs font-extrabold text-orange-700">BẮT ĐẦU ĐIỀU TRỊ</p>
      <p className="text-xs text-neutral-600">Đánh dấu cây đang trong quá trình điều trị bệnh.</p>
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
      {saving ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 size={14} className="animate-spin" />
          Đang lưu...
        </div>
      ) : (
        <button
          type="button"
          onClick={startTreatment}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700"
        >
          Bắt đầu điều trị
        </button>
      )}
    </div>
  );
}

// ── Care Plan Section ─────────────────────────────────────────────────────────

const PLAN_STATUS_LABEL: Record<string, string> = {
  PLANNED: "Đã lên kế hoạch",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const PLAN_STATUS_COLOR: Record<string, string> = {
  PLANNED: "text-blue-700 bg-blue-50",
  IN_PROGRESS: "text-orange-700 bg-orange-50",
  COMPLETED: "text-green-700 bg-green-50",
  CANCELLED: "text-neutral-500 bg-neutral-100",
};

interface CarePlanSectionProps {
  treeId: string;
  latestDiseaseCode: string | null | undefined;
  latestDiagnosisId?: string | null;
  onPlanCreated: () => void;
}

function CarePlanSection({ treeId, latestDiseaseCode, latestDiagnosisId, onPlanCreated }: CarePlanSectionProps) {
  const [plans, setPlans] = useState<TreeCarePlan[]>([]);
  const [recommendation, setRecommendation] = useState<TreeCareRecommendation | null>(null);
  const [planTasks, setPlanTasks] = useState<TreeCareTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEditRecommendation, setShowEditRecommendation] = useState(false);
  const [treatment, setTreatment] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [recommendationTasks, setRecommendationTasks] = useState<RecommendedCareTask[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      treeClient.listCarePlans(treeId).catch(() => []),
      treeClient.getLatestCareRecommendation(treeId).catch(() => null),
    ])
      .then(([planData, recommendationData]) => {
        setPlans(planData);
        setRecommendation(recommendationData);
        setRecommendationTasks(recommendationData?.tasks ?? []);
      })
      .catch(() => {
        setPlans([]);
        setRecommendation(null);
      })
      .finally(() => setLoading(false));
  }, [treeId]);

  async function createPlan() {
    if (!latestDiseaseCode) return;
    setSaving(true);
    setSaveError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const body: CreateCarePlanRequest = {
        diagnosisId: latestDiagnosisId ?? undefined,
        diseaseCode: latestDiseaseCode,
        treatment: treatment.trim() || undefined,
        startDate: today,
        followUpDate: followUpDate || undefined,
      };
      const created = await treeClient.createCarePlan(treeId, body);
      setPlans((prev) => [created, ...prev]);
      setShowCreate(false);
      setTreatment("");
      setFollowUpDate("");
      onPlanCreated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Tạo kế hoạch thất bại.");
    } finally {
      setSaving(false);
    }
  }

  const activePlan = plans.find((p) => p.status === "PLANNED" || p.status === "IN_PROGRESS");

  useEffect(() => {
    if (!activePlan?.id) {
      setPlanTasks([]);
      return;
    }
    treeClient.listCarePlanTasks(activePlan.id).then(setPlanTasks).catch(() => setPlanTasks([]));
  }, [activePlan?.id]);

  async function generateRecommendation() {
    setSaving(true);
    setSaveError(null);
    try {
      const draft = await treeClient.createCareRecommendation(treeId, {
        diagnosisId: latestDiagnosisId ?? undefined,
      });
      setRecommendation(draft);
      setRecommendationTasks(draft.tasks ?? []);
      setFollowUpDate(draft.followUpDate ?? "");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Không thể tạo đề xuất AI.");
    } finally {
      setSaving(false);
    }
  }

  async function saveRecommendationEdits() {
    if (!recommendation) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await treeClient.updateCareRecommendation(treeId, recommendation.id, {
        treatment: treatment.trim() || undefined,
        followUpDate: followUpDate || undefined,
        tasks: recommendationTasks,
      });
      setRecommendation(updated);
      setRecommendationTasks(updated.tasks ?? []);
      setShowEditRecommendation(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Không thể lưu chỉnh sửa.");
    } finally {
      setSaving(false);
    }
  }

  async function acceptRecommendation() {
    if (!recommendation) return;
    setSaving(true);
    setSaveError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const plan = await treeClient.acceptCareRecommendation(treeId, recommendation.id, {
        treatment: treatment.trim() || undefined,
        startDate: today,
        followUpDate: followUpDate || recommendation.followUpDate || undefined,
        tasks: recommendationTasks,
      });
      setPlans((prev) => [plan, ...prev.filter((item) => item.id !== plan.id)]);
      const refreshed = await treeClient.getLatestCareRecommendation(treeId).catch(() => null);
      setRecommendation(refreshed);
      setRecommendationTasks(refreshed?.tasks ?? recommendationTasks);
      setShowEditRecommendation(false);
      onPlanCreated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Không thể chấp nhận đề xuất.");
    } finally {
      setSaving(false);
    }
  }

  function updateDraftTask(index: number, patch: Partial<RecommendedCareTask>) {
    setRecommendationTasks((prev) => prev.map((task, idx) => idx === index ? { ...task, ...patch } : task));
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold text-blue-800">KẾ HOẠCH CHĂM SÓC</p>
        {latestDiseaseCode && !activePlan ? (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="text-xs font-bold text-blue-700 hover:underline"
          >
            {showCreate ? "Hủy" : "+ Tạo kế hoạch"}
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Loader2 size={12} className="animate-spin" />
          Đang tải...
        </div>
      ) : plans.length === 0 && !showCreate ? (
        <p className="text-xs text-neutral-400">Chưa có kế hoạch chăm sóc nào.</p>
      ) : null}

      {activePlan ? (
        <div className="rounded-lg border border-blue-200 bg-white p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-700">{activePlan.diseaseCode}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PLAN_STATUS_COLOR[activePlan.status] ?? ""}`}>
              {PLAN_STATUS_LABEL[activePlan.status] ?? activePlan.status}
            </span>
          </div>
          {activePlan.treatment ? (
            <p className="text-xs text-neutral-600">{activePlan.treatment}</p>
          ) : null}
          <div className="flex gap-3 text-[10px] text-neutral-500">
            <span>Bắt đầu: {activePlan.startDate}</span>
            {activePlan.followUpDate ? <span>Tái khám: {activePlan.followUpDate}</span> : null}
          </div>
          {planTasks.length ? (
            <div className="mt-2 space-y-1">
              {planTasks.map((task) => (
                <div key={task.id} className="rounded-md bg-blue-50 px-2 py-1 text-[11px] text-neutral-700">
                  <span className="font-bold">{task.title}</span>
                  {task.scheduledDate ? <span className="ml-2 text-neutral-500">{task.scheduledDate}</span> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!activePlan ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold text-emerald-800">AI ĐỀ XUẤT CHĂM SÓC</p>
            {recommendation?.status === "DRAFT" ? (
              <button
                type="button"
                onClick={() => setShowEditRecommendation((v) => !v)}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                {showEditRecommendation ? "Đóng chỉnh sửa" : "Chỉnh sửa"}
              </button>
            ) : null}
          </div>
          {!recommendation ? (
            <button
              type="button"
              onClick={generateRecommendation}
              disabled={!latestDiagnosisId || saving}
              className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              Tạo đề xuất từ AI/KB
            </button>
          ) : (
            <>
              <p className="text-xs text-neutral-700">
                <span className="font-bold">Bệnh:</span> {String(recommendation.recommendationSnapshot.vietnameseName ?? recommendation.diseaseCode)}
              </p>
              {typeof recommendation.recommendationSnapshot.summary === "string" ? (
                <p className="text-xs text-neutral-600">{recommendation.recommendationSnapshot.summary}</p>
              ) : null}
              <div className="space-y-1">
                {(recommendation.recommendationSnapshot.careActions as string[] | undefined)?.slice(0, 4).map((item, index) => (
                  <p key={`${item}-${index}`} className="text-xs text-neutral-700">• {item}</p>
                ))}
              </div>
              {showEditRecommendation ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full rounded-xl border border-emerald-200 p-2.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                    rows={3}
                    placeholder="Nội dung kế hoạch sau chỉnh sửa..."
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                  />
                  {recommendationTasks.map((task, index) => (
                    <div key={index} className="grid gap-1 rounded-lg bg-white p-2">
                      <input
                        className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-bold"
                        value={task.title ?? ""}
                        onChange={(e) => updateDraftTask(index, { title: e.target.value })}
                      />
                      <input
                        type="date"
                        className="rounded-lg border border-neutral-200 px-2 py-1 text-xs"
                        value={task.scheduledDate ?? ""}
                        onChange={(e) => updateDraftTask(index, { scheduledDate: e.target.value })}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={saveRecommendationEdits}
                    disabled={saving}
                    className="w-full rounded-xl border border-emerald-300 bg-white py-2 text-xs font-bold text-emerald-700"
                  >
                    Lưu chỉnh sửa
                  </button>
                </div>
              ) : null}
              <div className="flex gap-3 text-[10px] text-neutral-500">
                <span>Nguồn: {recommendation.recommendationSnapshot.source as string}</span>
                {recommendation.followUpDate ? <span>Tái kiểm tra: {recommendation.followUpDate}</span> : null}
              </div>
              {recommendation.status === "DRAFT" ? (
                <button
                  type="button"
                  onClick={acceptRecommendation}
                  disabled={saving}
                  className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  Chấp nhận kế hoạch
                </button>
              ) : (
                <p className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-emerald-700">
                  Đã chấp nhận thành kế hoạch chăm sóc.
                </p>
              )}
            </>
          )}
        </div>
      ) : null}

      {showCreate ? (
        <div className="space-y-2">
          <textarea
            className="w-full rounded-xl border border-neutral-200 p-2.5 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            rows={2}
            placeholder="Hướng điều trị (tùy chọn)..."
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
          />
          <div>
            <label className="text-[10px] font-bold text-neutral-500">Ngày tái khám (tùy chọn)</label>
            <input
              type="date"
              className="mt-0.5 w-full rounded-xl border border-neutral-200 p-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </div>
          {saveError ? <p className="text-xs font-semibold text-red-600">{saveError}</p> : null}
          {saving ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 size={14} className="animate-spin" />
              Đang tạo...
            </div>
          ) : (
            <button
              type="button"
              onClick={createPlan}
              disabled={!latestDiseaseCode}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              Tạo kế hoạch
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface TreeDetailPanelProps {
  treeId: string | null;
  onClose: () => void;
  onDiagnosisSaved?: () => void;
  season?: CultivationSeason | null;
  farmId?: string;
  zoneId?: string;
  onSeasonCreated?: (season: CultivationSeason) => void;
  onYieldSaved?: () => void;
  onRemoved?: () => void;
}

function DiagnosisHistoryDialog({ treeId, treeCode, onClose }: { treeId: string; treeCode: string; onClose: () => void }) {
  const [diagnoses, setDiagnoses] = useState<TreeDiagnosis[]>([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    treeClient.listDiagnoses(treeId, page, size)
      .then((response) => {
        if (!active) return;
        setDiagnoses(response.content ?? []);
        setTotalPages(Math.max(1, response.totalPages ?? 1));
        setTotalElements(response.totalElements ?? 0);
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof TreeApiError || caught instanceof Error ? caught.message : "Không thể tải lịch sử chẩn đoán.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [treeId, page, size]);

  return <div aria-modal="true" className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-0 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-labelledby="diagnosis-history-title">
    <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold tracking-[1px] text-neutral-500">LỊCH SỬ CHẨN ĐOÁN BỆNH</p><h2 className="mt-1 text-lg font-extrabold text-neutral-900" id="diagnosis-history-title">{treeCode}</h2><p className="mt-1 text-xs text-neutral-600">{totalElements} bản ghi</p></div><button aria-label="Đóng" className="grid size-9 place-items-center rounded-xl border border-neutral-200 text-neutral-500 hover:bg-neutral-50" onClick={onClose} type="button"><X size={16} /></button></div>
      {loading ? <div className="flex min-h-36 items-center justify-center gap-2 text-sm font-semibold text-neutral-500"><Loader2 className="animate-spin" size={16} />Đang tải lịch sử...</div> : null}
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {!loading && !error && diagnoses.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm font-semibold text-neutral-400">Chưa có lịch sử chẩn đoán.</p> : null}
      {!loading && !error && diagnoses.length ? <div className="mt-5 space-y-3">{diagnoses.map((diagnosis) => { const category = categoryFromCode(diagnosis.diseaseCode); return <article className="rounded-2xl border border-neutral-200 p-4" key={diagnosis.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${CAT_BADGE[category]}`}>{CAT_LABEL[category]}</span><p className="mt-2 text-sm font-bold text-neutral-800">{diagnosis.diseaseName || diagnosis.diseaseCode}</p><p className="mt-1 text-xs text-neutral-500">{new Date(diagnosis.diagnosedAt).toLocaleString("vi-VN")}</p></div>{diagnosis.confidence != null ? <span className="text-xs font-bold text-neutral-500">{Math.round(diagnosis.confidence * 100)}%</span> : null}</div>{diagnosis.imageUrl ? <a className="mt-3 block overflow-hidden rounded-xl border border-neutral-100" href={diagnosis.imageUrl} rel="noreferrer" target="_blank"><img alt={`Ảnh chẩn đoán ${diagnosis.diseaseName || diagnosis.diseaseCode}`} className="max-h-64 w-full object-contain bg-neutral-50" src={diagnosis.imageUrl} /></a> : null}{diagnosis.source ? <p className="mt-3 text-xs text-neutral-500">Nguồn: {diagnosis.source}</p> : null}</article>; })}</div> : null}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4"><label className="text-xs font-semibold text-neutral-600">Hiển thị <select className="ml-1 rounded-lg border border-neutral-200 bg-white px-2 py-1" onChange={(event) => { setLoading(true); setError(null); setSize(Number(event.target.value)); setPage(0); }} value={size}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select> bản ghi/trang</label><div className="flex items-center gap-2 text-xs font-semibold text-neutral-600"><button className="rounded-lg border border-neutral-200 px-3 py-1.5 disabled:opacity-40" disabled={page === 0 || loading} onClick={() => { setLoading(true); setError(null); setPage((current) => current - 1); }} type="button">Trước</button><span>{page + 1}/{totalPages}</span><button className="rounded-lg border border-neutral-200 px-3 py-1.5 disabled:opacity-40" disabled={page + 1 >= totalPages || loading} onClick={() => { setLoading(true); setError(null); setPage((current) => current + 1); }} type="button">Sau</button></div></div>
    </section>
  </div>;
}

export function TreeDetailPanel({ treeId, onClose, onDiagnosisSaved, season = null, farmId, zoneId, onSeasonCreated, onYieldSaved, onRemoved }: TreeDetailPanelProps) {
  const [tree, setTree] = useState<TreeDetail | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const [nextHealthStatus, setNextHealthStatus] = useState<TreeHealthStatus | "">("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [diagnoses, setDiagnoses] = useState<TreeDiagnosis[]>([]);
  const [progressEvaluation, setProgressEvaluation] = useState<RecoveryEvaluationResponse | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (id: string, active: { value: boolean }) => {
      setLoading(true);
      setError(null);
      Promise.all([treeClient.getTree(id), treeClient.listDiagnoses(id, 0, 20)])
        .then(([treeData, diagData]) => {
          if (!active.value) return;
          setTree(treeData);
          setDiagnoses(diagData.content ?? []);
          setProgressEvaluation(null);
        })
        .catch((caught) => {
          if (!active.value) return;
          const message =
            caught instanceof TreeApiError
              ? caught.message
              : caught instanceof Error
                ? caught.message
                : "Không thể tải chi tiết cây.";
          setError(message);
        })
        .finally(() => {
          if (active.value) setLoading(false);
        });
    },
    [],
  );

  useEffect(() => {
    if (!treeId) {
      queueMicrotask(() => {
        setTree(null);
        setDiagnoses([]);
      });
      return;
    }
    const active = { value: true };
    queueMicrotask(() => {
      if (active.value) load(treeId, active);
    });
    return () => {
      active.value = false;
    };
  }, [treeId, load]);

  useEffect(() => {
    if (!treeId || diagnoses.length < 2 || tree?.healthStatus === "RECOVERED") {
      queueMicrotask(() => setProgressEvaluation(null));
      return;
    }
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setProgressLoading(true);
      treeClient.evaluateRecovery(treeId)
        .then((result) => {
          if (active) setProgressEvaluation(result);
        })
        .catch(() => {
          if (active) setProgressEvaluation(null);
        })
        .finally(() => {
          if (active) setProgressLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [treeId, diagnoses.length, tree?.healthStatus]);

  function refresh() {
    if (!treeId) return;
    setNextHealthStatus("");
    setStatusEditorOpen(false);
    setLoading(true);
    setError(null);
    const active = { value: true };
    load(treeId, active);
    onDiagnosisSaved?.();
  }

  async function saveHealthStatus() {
    if (!tree || !nextHealthStatus || nextHealthStatus === tree.healthStatus) return;
    setStatusSaving(true);
    setStatusError(null);
    try {
      const updated = await treeClient.updateHealthStatus(tree.id, nextHealthStatus);
      setTree(updated);
      setNextHealthStatus("");
      setStatusEditorOpen(false);
      onDiagnosisSaved?.();
    } catch (caught) {
      setStatusError(caught instanceof Error ? caught.message : "Không thể cập nhật tình trạng cây.");
    } finally {
      setStatusSaving(false);
    }
  }

  async function removeTree() {
    if (!treeId || !tree) return;
    const confirmed = window.confirm(
      `Đã đốn cây ${tree.treeCode}?\n\nCây sẽ được xóa khỏi bản đồ và danh sách cây đang hoạt động. Lịch sử chẩn đoán/kế hoạch chăm sóc vẫn được giữ lại.`,
    );
    if (!confirmed) return;
    setRemoving(true);
    setError(null);
    try {
      await treeClient.removeTree(treeId);
      onRemoved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa cây khỏi bản đồ.");
    } finally {
      setRemoving(false);
    }
  }

  if (!treeId) return null;

  const health = tree?.healthStatus;
  const healthClass =
    health ? HEALTH_COLORS[health] : "text-neutral-500 bg-neutral-50 border-neutral-200";
  const needsTreatment = health === "DISEASED" || health === "SUSPECTED";

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 p-4">
        <div>
          <p className="text-xs font-extrabold tracking-wide text-neutral-400">CHI TIẾT CÂY</p>
          <h3 className="mt-0.5 text-base font-extrabold text-neutral-900">
            {loading ? "Đang tải..." : tree?.treeCode ?? "—"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-xl border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
          aria-label="Đóng"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm font-bold text-neutral-500">
            <Loader2 size={16} className="animate-spin" />
            Đang tải...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {tree ? (
          <>
            {/* Health badge */}
            <div className="flex items-center justify-between gap-3">
              {health ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${healthClass}`}
                >
                  {HEALTH_LABELS[health] ?? health}
                </span>
              ) : null}
              {tree.status !== "REMOVED" ? (
                <button
                  type="button"
                  onClick={removeTree}
                  disabled={removing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                >
                  {removing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Đã đốn cây
                </button>
              ) : (
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-500">
                  Đã xóa khỏi bản đồ
                </span>
              )}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <button
                aria-controls="tree-health-editor"
                aria-expanded={statusEditorOpen}
                className="flex w-full items-center justify-between gap-2 text-left text-sm font-bold text-[#2E5A44]"
                onClick={() => setStatusEditorOpen((current) => !current)}
                type="button"
              >
                Cập nhật tình trạng cây
                {statusEditorOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {statusEditorOpen ? <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3" id="tree-health-editor">
                <p className="text-xs text-neutral-600">Tình trạng hiện tại: <strong>{health ? HEALTH_LABELS[health] : "Chưa đánh giá"}</strong>. Chọn tình trạng mới cho cây này.</p>
                <label className="block text-xs font-bold text-neutral-600">Tình trạng mới
                  <select className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800" onChange={(event) => { setNextHealthStatus(event.target.value as TreeHealthStatus | ""); setStatusError(null); }} value={nextHealthStatus}>
                    <option value="">Chọn tình trạng</option>
                    {HEALTH_STATUS_OPTIONS.map((status) => <option disabled={status === health} key={status} value={status}>{HEALTH_LABELS[status]}{status === health ? " (hiện tại)" : ""}</option>)}
                  </select>
                </label>
                {nextHealthStatus === "RECOVERED" ? <RecoveryPanel key={tree.id} treeId={tree.id} treeCode={tree.treeCode} onSaved={refresh} /> : nextHealthStatus === "TREATING" && needsTreatment ? <TreatmentPanel key={tree.id} treeId={tree.id} treeCode={tree.treeCode} onSaved={refresh} /> : nextHealthStatus ? <button className="w-full rounded-lg bg-[#2E5A44] py-2 text-sm font-bold text-white disabled:opacity-50" disabled={statusSaving || nextHealthStatus === health} onClick={() => void saveHealthStatus()} type="button">{statusSaving ? "Đang lưu..." : "Lưu tình trạng cây"}</button> : null}
                {statusError ? <p className="rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">{statusError}</p> : null}
                <p className="text-xs text-neutral-500">Có thể dùng chẩn đoán lá bên dưới để cập nhật tình trạng bằng kết quả phân tích.</p>

              </div> : null}
            </div>

            {/* Keep yield information near the top of the selected tree. */}
            {zoneId && farmId && onSeasonCreated ? <YieldObservationPanel farmId={farmId} onSaved={refresh} onSeasonCreated={onSeasonCreated} onYieldSaved={onYieldSaved} season={season} treeId={tree.id} zoneId={zoneId} /> : null}

            {/* Care plan (DISEASED/TREATING/SUSPECTED) */}
            {health === "DISEASED" || health === "TREATING" || health === "SUSPECTED" ? (
              <CarePlanSection
                treeId={treeId}
                latestDiseaseCode={tree.latestDiseaseCode}
                latestDiagnosisId={diagnoses[0]?.id ?? null}
                onPlanCreated={refresh}
              />
            ) : null}

            {/* Embedded AI panel */}
            <AIPanel treeId={tree.id} treeCode={tree.treeCode} onSaved={refresh} />

            {progressLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-xs font-semibold text-neutral-500">
                <Loader2 size={12} className="animate-spin" />
                Đang đánh giá tiến triển...
              </div>
            ) : progressEvaluation ? (
              <div>
                <p className="mb-2 text-xs font-extrabold text-neutral-500">
                  ĐÁNH GIÁ TIẾN TRIỂN
                </p>
                <RecoveryEvaluationCard evaluation={progressEvaluation} />
              </div>
            ) : null}

            {/* Tree info */}
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
              <InfoRow label="Mã cây" value={tree.treeCode} />
              <InfoRow label="Biệt danh" value={tree.nickname} />
              <InfoRow label="Giống" value={tree.variety} />
              <InfoRow label="Ngày trồng" value={tree.plantedDate} />
              <InfoRow label="Vị trí X" value={tree.positionX?.toFixed(3)} />
              <InfoRow label="Vị trí Y" value={tree.positionY?.toFixed(3)} />
              <InfoRow label="Số lần chuẩn đoán" value={tree.diagnosisCount} />
              <InfoRow
                label="Lần cuối chuẩn đoán"
                value={
                  tree.latestDiagnosisAt
                    ? new Date(tree.latestDiagnosisAt).toLocaleString("vi-VN")
                    : null
                }
              />
            </dl>
            <TreeBarcode treeCode={tree.treeCode} />
            {tree.notes ? (
              <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                <p className="text-xs font-bold text-neutral-500">Ghi chú</p>
                <p className="mt-1 text-sm text-neutral-700">{tree.notes}</p>
              </div>
            ) : null}

            <button className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-bold text-[#2E5A44] hover:bg-emerald-50" onClick={() => setHistoryOpen(true)} type="button">Xem lịch sử chẩn đoán bệnh</button>
            {historyOpen ? <DiagnosisHistoryDialog onClose={() => setHistoryOpen(false)} treeCode={tree.treeCode} treeId={tree.id} /> : null}
          </>
        ) : null}
      </div>
    </aside>
  );
}
