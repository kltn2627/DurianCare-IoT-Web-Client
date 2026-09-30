"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
import { treeClient, TreeApiError } from "@/lib/trees/client";
import { predictLeafDisease } from "@/lib/ai/client";
import type { PredictionData } from "@/lib/ai/types";
import type { TreeDetail, TreeDiagnosis } from "@/lib/trees/types";
import type { DiseaseCategory } from "@/lib/labels";
import { knowledgeClient } from "@/lib/knowledge/client";
import type { KnowledgeArticle } from "@/lib/knowledge/types";

// ── Display helpers ───────────────────────────────────────────────────────────

const HEALTH_LABELS: Record<string, string> = {
  HEALTHY: "Khỏe mạnh",
  DISEASED: "Bệnh",
  TREATING: "Đang điều trị",
  SUSPECTED: "Nghi ngờ",
};

const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: "text-green-700 bg-green-50 border-green-200",
  DISEASED: "text-red-700 bg-red-50 border-red-200",
  TREATING: "text-orange-700 bg-orange-50 border-orange-200",
  SUSPECTED: "text-yellow-700 bg-yellow-50 border-yellow-200",
};

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

const CAT_DOT: Record<DiseaseCategory, string> = {
  HEALTHY: "bg-green-500",
  DISEASE: "bg-red-500",
  PEST: "bg-amber-400",
  LOW_CONFIDENCE: "bg-neutral-400",
  INVALID_IMAGE: "bg-neutral-300",
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
    const diseaseName = prediction?.recommendation?.vietnameseName ?? prediction?.predictedDisease ?? "";
    if (!diseaseName) return;
    knowledgeClient
      .list({ search: diseaseName, size: 2, status: "PUBLISHED" })
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

function RecoveryPanel({ treeId, treeCode, onSaved }: RecoveryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!notes.trim()) {
      setError("Vui lòng nhập ghi chú xác nhận phục hồi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await treeClient.saveDiagnosis(treeId, {
        imageUrl: "RECOVERY_VERIFICATION_NO_IMAGE",
        diseaseCode: "RECOVERED_BY_FARMER",
        diseaseName: "Phục hồi (xác nhận bởi nông dân)",
        confidence: null,
        boundingBox: null,
        source: "RECOVERY_VERIFICATION",
      });
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
        onClick={() => setExpanded((v) => !v)}
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
          <p className="text-xs text-neutral-600">
            Xác nhận cây đã phục hồi sau điều trị. Ghi chú bắt buộc để tạo bằng chứng.
          </p>
          <textarea
            className="w-full rounded-xl border border-neutral-200 p-2.5 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
            rows={3}
            placeholder="Ghi chú xác nhận (bắt buộc)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {error ? (
            <p className="text-xs font-semibold text-red-600">{error}</p>
          ) : null}
          {saving ? (
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
}

export function TreeDetailPanel({ treeId, onClose }: TreeDetailPanelProps) {
  const [tree, setTree] = useState<TreeDetail | null>(null);
  const [diagnoses, setDiagnoses] = useState<TreeDiagnosis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (id: string, active: { value: boolean }) => {
      setLoading(true);
      setError(null);
      Promise.all([
        treeClient.getTree(id),
        treeClient.listDiagnoses(id, 0, 20),
      ])
        .then(([treeData, diagData]) => {
          if (!active.value) return;
          setTree(treeData);
          setDiagnoses(diagData.content ?? []);
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
      setTree(null);
      setDiagnoses([]);
      return;
    }
    const active = { value: true };
    load(treeId, active);
    return () => {
      active.value = false;
    };
  }, [treeId, load]);

  function refresh() {
    if (!treeId) return;
    const active = { value: true };
    load(treeId, active);
  }

  if (!treeId) return null;

  const health = tree?.healthStatus;
  const healthClass =
    health ? HEALTH_COLORS[health] : "text-neutral-500 bg-neutral-50 border-neutral-200";
  const needsRecovery =
    health === "DISEASED" || health === "TREATING" || health === "SUSPECTED";

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
            {health ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${healthClass}`}
              >
                {HEALTH_LABELS[health] ?? health}
              </span>
            ) : null}

            {/* Recovery confirmation */}
            {needsRecovery ? (
              <RecoveryPanel treeId={treeId} treeCode={tree.treeCode} onSaved={refresh} />
            ) : null}

            {/* Embedded AI panel */}
            <AIPanel treeId={treeId} treeCode={tree.treeCode} onSaved={refresh} />

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

            {tree.notes ? (
              <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                <p className="text-xs font-bold text-neutral-500">Ghi chú</p>
                <p className="mt-1 text-sm text-neutral-700">{tree.notes}</p>
              </div>
            ) : null}

            {/* Diagnosis timeline */}
            <div>
              <p className="mb-2 text-xs font-extrabold text-neutral-500">
                LỊCH SỬ CHUẨN ĐOÁN ({diagnoses.length})
              </p>
              {diagnoses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 p-3 text-xs font-semibold text-neutral-400">
                  Chưa có lịch sử chuẩn đoán.
                </div>
              ) : (
                <div className="space-y-0">
                  {diagnoses.map((d, idx) => {
                    const cat = categoryFromCode(d.diseaseCode);
                    const isLast = idx === diagnoses.length - 1;
                    return (
                      <div key={d.id} className="flex gap-3">
                        {/* Timeline spine */}
                        <div className="flex w-4 flex-col items-center">
                          <div className={`mt-1.5 size-2.5 shrink-0 rounded-full ${CAT_DOT[cat]}`} />
                          {!isLast ? (
                            <div className="w-0.5 flex-1 bg-neutral-200 my-0.5" />
                          ) : null}
                        </div>
                        {/* Entry */}
                        <div className={`rounded-xl border border-neutral-100 bg-neutral-50 p-3 flex-1 ${isLast ? "" : "mb-2"}`}>
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${CAT_BADGE[cat]}`}>
                              {CAT_LABEL[cat]}
                            </span>
                            {d.confidence != null ? (
                              <span className="text-xs text-neutral-500">
                                {Math.round(d.confidence * 100)}%
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs font-bold text-neutral-700">{d.diseaseCode}</p>
                          {d.diseaseName ? (
                            <p className="mt-0.5 text-xs text-neutral-500">{d.diseaseName}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-neutral-400">
                            {new Date(d.diagnosedAt).toLocaleString("vi-VN")}
                          </p>
                          {d.source ? (
                            <p className="mt-0.5 text-[10px] italic text-neutral-300">{d.source}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}
