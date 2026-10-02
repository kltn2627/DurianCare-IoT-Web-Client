"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { treeClient, TreeApiError } from "@/lib/trees/client";
import type { TreeSummary, ZoneDetail, ZoneSafetySummary } from "@/lib/trees/types";
import { cultivationClient } from "@/lib/cultivation/client";
import type { CultivationSeason } from "@/lib/cultivation/types";
import { TreeMapCanvas } from "./TreeMapCanvas";
import { ZoneSafetySummaryCard } from "./ZoneSafetySummary";
import { TreeDetailPanel } from "./TreeDetailPanel";

const HEALTH_LABELS: Record<string, string> = {
  HEALTHY: "Khỏe mạnh",
  DISEASED: "Bệnh",
  TREATING: "Điều trị",
  SUSPECTED: "Nghi ngờ",
  RECOVERED: "Đã hồi phục",
};

const HEALTH_BADGE: Record<string, string> = {
  HEALTHY: "bg-green-100 text-green-800",
  DISEASED: "bg-red-100 text-red-800",
  TREATING: "bg-orange-100 text-orange-800",
  SUSPECTED: "bg-orange-100 text-orange-800",
  RECOVERED: "bg-cyan-100 text-cyan-800",
};

// ── Generate Trees inline form ────────────────────────────────────────────────

interface GenerateFormProps {
  zoneId: string;
  defaultRows?: number | null;
  defaultTreesPerRow?: number | null;
  onGenerated: (count: number) => void;
  onCancel: () => void;
}

function GenerateTreesForm({
  zoneId,
  defaultRows,
  defaultTreesPerRow,
  onGenerated,
  onCancel,
}: GenerateFormProps) {
  const [rows, setRows] = useState(defaultRows ? String(defaultRows) : "");
  const [treesPerRow, setTreesPerRow] = useState(
    defaultTreesPerRow ? String(defaultTreesPerRow) : "",
  );
  const [variety, setVariety] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseInt(rows, 10);
    const t = parseInt(treesPerRow, 10);
    if (!r || r < 1 || !t || t < 1) {
      setErr("Số hàng và số cây/hàng phải >= 1.");
      return;
    }
    if (r * t > 10000) {
      setErr("Tổng số cây không được vượt quá 10 000.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const result = await treeClient.generateTrees(zoneId, {
        rows: r,
        treesPerRow: t,
        variety: variety.trim() || null,
      });
      onGenerated(result.generated);
    } catch (caught) {
      setErr(
        caught instanceof TreeApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Tạo cây thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-[#2E5A44]/40 bg-[#f0f7f1] p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="font-bold text-[#2E5A44] text-sm">Tạo cây tự động theo lưới</p>
        <button type="button" onClick={onCancel} className="text-neutral-400 hover:text-neutral-600">
          <X size={16} />
        </button>
      </div>
      {err ? (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">{err}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-neutral-600 mb-1 block">Số hàng *</label>
          <input
            required
            type="number"
            min="1"
            max="500"
            placeholder="VD: 5"
            value={rows}
            onChange={(e) => setRows(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2E5A44]"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-neutral-600 mb-1 block">Cây mỗi hàng *</label>
          <input
            required
            type="number"
            min="1"
            max="500"
            placeholder="VD: 5"
            value={treesPerRow}
            onChange={(e) => setTreesPerRow(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2E5A44]"
          />
        </div>
      </div>
      <input
        placeholder="Giống cây (tùy chọn)"
        value={variety}
        onChange={(e) => setVariety(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2E5A44]"
      />
      {rows && treesPerRow && parseInt(rows) > 0 && parseInt(treesPerRow) > 0 ? (
        <p className="text-xs text-neutral-500">
          Sẽ tạo tối đa{" "}
          <strong className="text-[#2E5A44]">
            {parseInt(rows) * parseInt(treesPerRow)} cây
          </strong>{" "}
          (bỏ qua mã đã tồn tại). Mã cây: H01-C01 → H{String(parseInt(rows)).padStart(2, "0")}-C{String(parseInt(treesPerRow)).padStart(2, "0")}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[#2E5A44] px-4 py-2 text-sm font-bold text-white disabled:opacity-60 hover:bg-[#25493a]"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          Tạo cây
        </button>
      </div>
    </form>
  );
}

// ── ActiveSeasonBanner ───────────────────────────────────────────────────────

function ActiveSeasonBanner({
  season,
  safeHarvestDate,
}: {
  season: CultivationSeason;
  safeHarvestDate: string | null | undefined;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const end = season.endDate ?? null;
  const daysLeft = end
    ? Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000)
    : null;
  const endLabel = end
    ? new Date(end).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Không xác định";

  const daysColor =
    daysLeft == null ? "text-neutral-500" :
    daysLeft <= 14   ? "text-red-600" :
    daysLeft <= 30   ? "text-amber-600" : "text-green-700";
  const daysBg =
    daysLeft == null ? "bg-neutral-100" :
    daysLeft <= 14   ? "bg-red-100" :
    daysLeft <= 30   ? "bg-amber-50" : "bg-green-100";

  const isSafeNow = safeHarvestDate != null && safeHarvestDate <= today;
  const safeLabel = safeHarvestDate
    ? new Date(safeHarvestDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;
  const daysUntilSafe =
    safeHarvestDate && safeHarvestDate > today
      ? Math.ceil((new Date(safeHarvestDate).getTime() - Date.now()) / 86_400_000)
      : null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <Calendar size={16} className="mt-0.5 shrink-0 text-[#2E5A44]" />
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-neutral-900">{season.name}</p>
          {season.crop ? (
            <p className="text-xs text-green-800">
              {season.crop}{season.variety ? ` — ${season.variety}` : ""}
            </p>
          ) : null}
          <p className="mt-0.5 text-xs text-neutral-500">Thu hoạch dự kiến: {endLabel}</p>
          {safeHarvestDate !== undefined ? (
            isSafeNow ? (
              <p className="mt-1 text-xs font-bold text-green-700">✓ Đủ điều kiện thu hoạch (từ {safeLabel})</p>
            ) : daysUntilSafe != null ? (
              <p className="mt-1 text-xs font-bold text-amber-700">⚠ Còn {daysUntilSafe} ngày đến ngày an toàn ({safeLabel})</p>
            ) : (
              <p className="mt-1 text-xs text-neutral-400">Chưa có dữ liệu hóa chất</p>
            )
          ) : null}
        </div>
      </div>
      {daysLeft != null ? (
        <div className={`shrink-0 rounded-xl px-4 py-2 text-center ${daysBg}`}>
          <p className={`text-2xl font-black leading-none ${daysColor}`}>{daysLeft}</p>
          <p className={`text-[10px] font-bold ${daysColor}`}>ngày</p>
        </div>
      ) : null}
    </div>
  );
}

// ── ZoneTreesWorkspace ────────────────────────────────────────────────────────

interface Props {
  farmId: string;
  zoneId: string;
}

export function ZoneTreesWorkspace({ farmId, zoneId }: Props) {
  const [zone, setZone] = useState<ZoneDetail | null>(null);
  const [trees, setTrees] = useState<TreeSummary[]>([]);
  const [safety, setSafety] = useState<ZoneSafetySummary | null>(null);
  const [activeSeason, setActiveSeason] = useState<CultivationSeason | null>(null);
  const [safeHarvestDate, setSafeHarvestDate] = useState<string | null | undefined>(undefined);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingTrees, setGeneratingTrees] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

  const load = () => {
    let active = true;
    setLoading(true);
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      treeClient.getZone(zoneId),
      treeClient.listTrees(zoneId),
      treeClient.getZoneSafety(zoneId).catch(() => null),
      cultivationClient.listSeasons({ farmId, plotId: zoneId }).catch(() => [] as CultivationSeason[]),
    ])
      .then(([zoneData, treeData, safetyData, seasons]) => {
        if (!active) return;
        setZone(zoneData);
        setTrees(treeData);
        if (safetyData) setSafety(safetyData);
        const current =
          seasons.find(
            (s) => s.startDate <= today && (!s.endDate || s.endDate >= today),
          ) ?? null;
        setActiveSeason(current);
        if (current) {
          cultivationClient.getSafeHarvestDate(current.id)
            .then((res) => {
              if (!active) return;
              const resp = res as { earliestSafeHarvestDate?: string | null } | string | null;
              const date =
                typeof resp === "object" && resp !== null
                  ? (resp.earliestSafeHarvestDate ?? null)
                  : null;
              setSafeHarvestDate(date);
            })
            .catch(() => { if (active) setSafeHarvestDate(null); });
        } else {
          setSafeHarvestDate(undefined);
        }
      })
      .catch((caught) => {
        if (!active) return;
        const message = caught instanceof TreeApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Không thể tải dữ liệu vùng trồng.";
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  };

  useEffect(() => {
    return load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="panel p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-extrabold tracking-[1px] text-neutral-500">
              BẢN ĐỒ CÂY
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-neutral-900 sm:text-2xl">
              {zone?.name ?? "Đang tải vùng..."}
            </h1>
            {zone?.code ? (
              <p className="mt-1 text-sm text-neutral-500">Mã vùng: {zone.code}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-bold text-neutral-700 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Tải lại
            </button>
          </div>
        </div>
      </div>

      <Link
        href={`/dashboard/client/farms/${encodeURIComponent(farmId)}`}
        className="inline-flex items-center gap-2 text-sm font-bold text-[#2E5A44]"
      >
        <ArrowLeft size={15} />
        Quay lại trang trại
      </Link>

      {loading && !zone ? (
        <div className="panel grid min-h-48 place-items-center p-7 text-sm font-bold text-neutral-600">
          <span className="inline-flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Đang tải dữ liệu...
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {/* Active season banner */}
      {activeSeason ? (
        <ActiveSeasonBanner season={activeSeason} safeHarvestDate={safeHarvestDate} />
      ) : null}

      {/* Safety summary */}
      {safety ? <ZoneSafetySummaryCard summary={safety} /> : null}

      {/* Tree map + detail panel */}
      {zone ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          {/* Map */}
          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-neutral-900">
                Bản đồ cây ({trees.length} cây)
              </h2>
              <button
                type="button"
                onClick={() => { setGeneratingTrees(true); setGenerateSuccess(null); }}
                className="flex items-center gap-1.5 rounded-xl bg-[#2E5A44] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#25493a] transition-colors"
              >
                <Plus size={14} />
                Tạo cây tự động
              </button>
            </div>
            {generateSuccess ? (
              <div className="mb-3 rounded-xl bg-green-100 px-3 py-2 text-xs font-semibold text-green-800">
                {generateSuccess}
              </div>
            ) : null}
            {generatingTrees ? (
              <div className="mb-4">
                <GenerateTreesForm
                  zoneId={zoneId}
                  defaultRows={zone.rowCount}
                  defaultTreesPerRow={zone.treesPerRow}
                  onGenerated={(count) => {
                    setGeneratingTrees(false);
                    setGenerateSuccess(`Đã tạo ${count} cây thành công. Đang tải lại...`);
                    treeClient.listTrees(zoneId).then(setTrees).catch(() => {});
                  }}
                  onCancel={() => setGeneratingTrees(false)}
                />
              </div>
            ) : null}
            <TreeMapCanvas
              trees={trees}
              selectedTreeId={selectedTreeId}
              onTreeClick={(tree) =>
                setSelectedTreeId(tree.id === selectedTreeId ? null : tree.id)
              }
            />
          </div>

          {/* Detail panel */}
          {selectedTreeId ? (
            <TreeDetailPanel
              treeId={selectedTreeId}
              onClose={() => setSelectedTreeId(null)}
              onDiagnosisSaved={() => {
                treeClient.listTrees(zoneId).then(setTrees).catch(() => {});
                treeClient.getZoneSafety(zoneId).then((s) => { if (s) setSafety(s); }).catch(() => {});
              }}
            />
          ) : (
            <div className="hidden rounded-2xl border border-dashed border-neutral-200 p-6 text-center text-sm font-semibold text-neutral-400 xl:flex xl:flex-col xl:items-center xl:justify-center xl:gap-2">
              <span>Chọn một cây trên bản đồ để xem chi tiết</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Tree list table */}
      {zone ? (
        <div className="panel p-5">
          <h2 className="mb-4 text-sm font-extrabold text-neutral-900">
            Danh sách cây
          </h2>
          {trees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm font-semibold text-neutral-400">
              Chưa có cây nào trong vùng này.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs font-bold text-neutral-500">
                    <th className="py-3 pr-4">Mã cây</th>
                    <th className="py-3 pr-4">Biệt danh</th>
                    <th className="py-3 pr-4">Giống</th>
                    <th className="py-3 pr-4">Tình trạng sức khỏe</th>
                    <th className="py-3 pr-4">Số lần chuẩn đoán</th>
                    <th className="py-3">Lần cuối chuẩn đoán</th>
                  </tr>
                </thead>
                <tbody>
                  {trees.map((tree) => (
                    <tr
                      key={tree.id}
                      onClick={() =>
                        setSelectedTreeId(
                          tree.id === selectedTreeId ? null : tree.id,
                        )
                      }
                      className={`cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50 ${tree.id === selectedTreeId ? "bg-[#f0f7f1]" : ""}`}
                    >
                      <td className="py-3 pr-4 font-bold text-neutral-900">
                        {tree.treeCode}
                      </td>
                      <td className="py-3 pr-4 text-neutral-700">
                        {tree.nickname ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-neutral-700">
                        {tree.variety ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {tree.healthStatus ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${HEALTH_BADGE[tree.healthStatus] ?? "bg-neutral-100 text-neutral-600"}`}
                          >
                            {HEALTH_LABELS[tree.healthStatus] ?? tree.healthStatus}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">Chưa đánh giá</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-neutral-700">
                        {tree.diagnosisCount}
                      </td>
                      <td className="py-3 text-neutral-500 text-xs">
                        {tree.latestDiagnosisAt
                          ? new Date(tree.latestDiagnosisAt).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
