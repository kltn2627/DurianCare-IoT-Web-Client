"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, Plus, RefreshCw, Search, X } from "lucide-react";
import { treeClient, TreeApiError } from "@/lib/trees/client";
import type { TreeSummary, ZoneDetail, ZoneSafetySummary } from "@/lib/trees/types";
import { cultivationClient } from "@/lib/cultivation/client";
import type { CultivationSeason, CultivationSeasonStatus, SeasonYieldHistory, ZoneYieldForecast } from "@/lib/cultivation/types";
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
          (bỏ qua cây đã tồn tại). Mã cây duy nhất sẽ được backend cấp theo khu canh tác.
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
  const [now] = useState(() => new Date());
  const today = now.toISOString().slice(0, 10);
  const todayStart = new Date(today).getTime();
  const end = season.endDate ?? null;
  const daysLeft = end
    ? Math.ceil((new Date(end).getTime() - todayStart) / 86_400_000)
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
      ? Math.ceil((new Date(safeHarvestDate).getTime() - todayStart) / 86_400_000)
      : null;
  const status = season.effectiveStatus ?? season.status ?? getSeasonStatus(season, today);
  const statusLabel = seasonStatusLabels[status];

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
          <p className="mt-1 text-xs font-bold text-green-800">{statusLabel}</p>
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

function BulkYieldEntryDialog({ trees, season, zoneId, currentFruitCounts, onClose, onSaved }: { trees: TreeSummary[]; season: CultivationSeason; zoneId: string; currentFruitCounts: Record<string, number>; onClose: () => void; onSaved: () => void }) {
  const [draftCounts, setDraftCounts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const matchingTrees = trees.filter((tree) => tree.treeCode.toLowerCase().includes(search.trim().toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(matchingTrees.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const visibleTrees = matchingTrees.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
  const selectedTrees = trees.filter((tree) => selected[tree.id]);

  const save = async () => {
    if (!selectedTrees.length) {
      setError("Chọn ít nhất một cây để cập nhật.");
      return;
    }
    if (selectedTrees.some((tree) => draftCounts[tree.id]?.trim() === "" || draftCounts[tree.id] == null)) {
      setError("Nhập số trái cho tất cả cây đã chọn.");
      return;
    }
    const entries = selectedTrees.map((tree) => ({ tree, fruitCount: Number(draftCounts[tree.id]) }));
    if (entries.some(({ fruitCount }) => !Number.isInteger(fruitCount) || fruitCount < 0)) {
      setError("Số trái của mỗi cây phải là số nguyên từ 0 trở lên.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const results = await Promise.allSettled(entries.map(({ tree, fruitCount }) =>
      cultivationClient.createTreeYieldObservation(tree.id, { seasonId: season.id, zoneId, fruitCount }),
    ));
    const failed = results.filter((result) => result.status === "rejected").length;
    const saved = results.length - failed;
    if (saved) {
      const failedIds = new Set(entries.filter((_, index) => results[index].status === "rejected").map(({ tree }) => tree.id));
      setDraftCounts((current) => Object.fromEntries(Object.entries(current).filter(([treeId]) => failedIds.has(treeId))));
      setSelected((current) => Object.fromEntries(Object.entries(current).filter(([treeId]) => failedIds.has(treeId))));
      onSaved();
    }
    if (failed) {
      setError(`Đã lưu ${saved}/${entries.length} cây. ${failed} cây chưa lưu được; kiểm tra lại các ô còn giữ giá trị.`);
    } else {
      setNotice(`Đã ghi nhận số trái cho ${saved} cây.`);
    }
    setSaving(false);
  };

  return <div aria-modal="true" className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-0 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-labelledby="bulk-yield-title">
    <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold tracking-[1px] text-emerald-700">CẬP NHẬT SỐ LƯỢNG TRÁI</p><h2 className="mt-1 text-lg font-extrabold text-neutral-900" id="bulk-yield-title">{season.name}</h2><p className="mt-1 text-xs text-neutral-600">Số hiện tại lấy từ lần ghi nhận mới nhất của từng cây; dữ liệu chưa lưu vẫn được giữ khi đổi trang.</p></div><button aria-label="Đóng" className="grid size-9 place-items-center rounded-xl border border-neutral-200 text-neutral-500 hover:bg-neutral-50" onClick={onClose} type="button"><X size={16} /></button></div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="relative block max-w-sm flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={15} /><input className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600" onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Tìm theo mã cây" value={search} /></label><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">{selectedTrees.length} cây đã chọn</span></div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-200"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-neutral-50 text-xs font-bold text-neutral-500"><tr><th className="w-12 p-3 text-center">Chọn</th><th className="p-3">Mã cây</th><th className="p-3">Số trái hiện tại</th><th className="p-3">Số trái mới</th></tr></thead><tbody>{visibleTrees.map((tree) => { const hasCurrent = Object.prototype.hasOwnProperty.call(currentFruitCounts, tree.id); return <tr className="border-t border-neutral-100" key={tree.id}><td className="p-3 text-center"><input aria-label={`Chọn ${tree.treeCode}`} checked={Boolean(selected[tree.id])} className="size-4 accent-[#2E5A44]" onChange={(event) => setSelected((current) => ({ ...current, [tree.id]: event.target.checked }))} type="checkbox" /></td><td className="p-3 font-bold text-neutral-800">{tree.treeCode}</td><td className="p-3 text-neutral-600">{hasCurrent ? currentFruitCounts[tree.id] : "Chưa ghi nhận"}</td><td className="p-3"><input className="w-32 rounded-lg border border-emerald-200 px-2.5 py-1.5 outline-none focus:border-emerald-600 disabled:bg-neutral-100" disabled={!selected[tree.id]} inputMode="numeric" min="0" onChange={(event) => { setDraftCounts((current) => ({ ...current, [tree.id]: event.target.value })); setSelected((current) => ({ ...current, [tree.id]: true })); }} placeholder="Số nguyên ≥ 0" type="number" value={draftCounts[tree.id] ?? ""} /></td></tr>; })}</tbody></table></div>
      {matchingTrees.length === 0 ? <p className="py-6 text-center text-sm font-semibold text-neutral-400">Không tìm thấy mã cây phù hợp.</p> : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><label className="text-xs font-semibold text-neutral-600">Hiển thị <select className="ml-1 rounded-lg border border-neutral-200 bg-white px-2 py-1" onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} value={pageSize}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select> cây/trang</label><div className="flex items-center gap-2 text-xs font-semibold text-neutral-600"><button aria-label="Trang trước" className="grid size-8 place-items-center rounded-lg border border-neutral-200 disabled:opacity-40" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} type="button"><ChevronLeft size={15} /></button><span>Trang {currentPage + 1}/{totalPages}</span><button aria-label="Trang sau" className="grid size-8 place-items-center rounded-lg border border-neutral-200 disabled:opacity-40" disabled={currentPage + 1 >= totalPages} onClick={() => setPage(currentPage + 1)} type="button"><ChevronRight size={15} /></button></div></div>
      {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p> : null}{notice ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{notice}</p> : null}
      <div className="mt-5 flex justify-end gap-3"><button className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-700" onClick={onClose} type="button">Hủy</button><button className="rounded-xl bg-[#2E5A44] px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={saving || !selectedTrees.length} onClick={() => void save()} type="button">{saving ? "Đang ghi nhận..." : `Lưu ${selectedTrees.length} cây`}</button></div>
    </section>
  </div>;
}

function YieldForecastCard({ season, zoneId, refreshKey }: { season: CultivationSeason; zoneId: string; refreshKey: number }) {
  const [forecast, setForecast] = useState<ZoneYieldForecast | null>(null);
  const [history, setHistory] = useState<SeasonYieldHistory[]>([]);
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      cultivationClient.getYieldForecast(season.id, zoneId),
      cultivationClient.getSeasonYieldHistory(season.id, zoneId),
    ]).then(([nextForecast, nextHistory]) => {
      setForecast(nextForecast);
      setHistory(nextHistory);
      setWeight(nextForecast.defaultAverageFruitWeightKg == null ? "" : String(nextForecast.defaultAverageFruitWeightKg));
      setPrice(nextForecast.expectedPricePerKg == null ? "" : String(nextForecast.expectedPricePerKg));
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Không thể tải dự kiến sản lượng."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* season/zone are identity inputs */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season.id, zoneId, refreshKey]);

  const save = async () => {
    const nextWeight = weight.trim() === "" ? null : Number(weight);
    const nextPrice = price.trim() === "" ? null : Number(price);
    if ((nextWeight != null && (!Number.isFinite(nextWeight) || nextWeight <= 0)) || (nextPrice != null && (!Number.isFinite(nextPrice) || nextPrice < 0))) {
      setError("Khối lượng TB phải lớn hơn 0 và giá dự kiến không được âm.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await cultivationClient.updateYieldForecastSettings(season.id, zoneId, {
        defaultAverageFruitWeightKg: nextWeight,
        expectedPricePerKg: nextPrice,
        currencyCode: "VND",
      });
      load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể lưu thiết lập dự báo.");
    } finally {
      setSaving(false);
    }
  };

  const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
  const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: forecast?.currencyCode || "VND", maximumFractionDigits: 0 });
  return <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-extrabold tracking-[1px] text-emerald-700">DỰ KIẾN SẢN LƯỢNG</p><h2 className="mt-1 text-base font-extrabold text-neutral-900">{season.name}</h2></div><button className="text-xs font-bold text-[#2E5A44] underline" disabled={loading} onClick={load} type="button">Tải lại</button></div>
    {loading ? <div className="mt-4 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="animate-spin" size={15} />Đang tính từ dữ liệu thực tế...</div> : null}
    {error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p> : null}
    {forecast && !loading ? <><p className="mt-3 text-xs font-bold text-emerald-800">MÙA HIỆN TẠI · DỰ KIẾN</p><div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Đã ghi nhận" value={`${forecast.observedTrees}/${forecast.totalTrees} cây`} /><Metric label="Tổng số trái đã nhập" value={number.format(forecast.totalFruitCount)} /><Metric label="Sản lượng dự kiến" value={forecast.forecastableTrees ? `${number.format(forecast.estimatedYieldKg)} kg` : "Chưa đủ dữ liệu"} /><Metric label="Doanh thu dự kiến" value={forecast.estimatedRevenue == null ? "Chưa có giá" : money.format(forecast.estimatedRevenue)} /></div>
      {forecast.unobservedTrees > 0 ? <p className="mt-3 text-xs text-amber-800">Còn {forecast.unobservedTrees} cây chưa ghi nhận số trái; chúng không được cộng vào tổng dự báo.</p> : null}
      {forecast.unforecastableObservedTrees > 0 ? <p className="mt-1 text-xs text-amber-800">Có {forecast.unforecastableObservedTrees} cây đã ghi nhận nhưng chưa có khối lượng TB/trái.</p> : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" inputMode="decimal" onChange={(event) => setWeight(event.target.value)} placeholder="Khối lượng TB (kg/trái)" value={weight} /><input className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" inputMode="decimal" onChange={(event) => setPrice(event.target.value)} placeholder="Giá dự kiến (VND/kg)" value={price} /><button className="rounded-xl bg-[#2E5A44] px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={saving} onClick={save} type="button">{saving ? "Đang lưu..." : "Lưu"}</button></div>
      {forecast.historyAvailable ? <div className="mt-4 border-t border-emerald-200 pt-3 text-xs text-neutral-700"><b>So sánh dự kiến hiện tại với thực tế lịch sử</b><div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Vụ trước (thực tế)" value={forecast.previousSeasonActualYieldKg == null ? "Chưa có" : `${number.format(forecast.previousSeasonActualYieldKg)} kg`} /><Metric label="TB sản lượng thực tế" value={forecast.historicalAverageYieldKg == null ? "Chưa có" : `${number.format(forecast.historicalAverageYieldKg)} kg`} /><Metric label="TB khối lượng/trái lịch sử" value={forecast.historicalAverageFruitWeightKg == null ? "Chưa đủ dữ liệu" : `${number.format(forecast.historicalAverageFruitWeightKg)} kg/trái`} /><Metric label="Chênh lệch với TB thực tế" value={forecast.differenceFromHistoricalAveragePercent == null ? "Chưa đủ dữ liệu" : `${forecast.differenceFromHistoricalAveragePercent > 0 ? "+" : ""}${number.format(forecast.differenceFromHistoricalAveragePercent)}%`} /></div>{forecast.suggestedAverageFruitWeightKg != null ? <div className="mt-3 flex flex-wrap items-center gap-3"><span>Mùa trước/trung bình lịch sử: {number.format(forecast.suggestedAverageFruitWeightKg)} kg/trái</span><button className="rounded-lg border border-emerald-300 bg-white px-3 py-2 font-bold text-emerald-800" disabled={saving} onClick={async () => { setSaving(true); try { await cultivationClient.updateYieldForecastSettings(season.id, zoneId, { defaultAverageFruitWeightKg: forecast.suggestedAverageFruitWeightKg, expectedPricePerKg: forecast.expectedPricePerKg, currencyCode: forecast.currencyCode || "VND" }); load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể lưu khối lượng gợi ý."); } finally { setSaving(false); } }} type="button">Dùng làm khối lượng ước tính</button></div> : null}</div> : <p className="mt-4 text-xs text-neutral-500">Chưa có dữ liệu mùa vụ trước.</p>}
      {history.length ? <div className="mt-4 overflow-x-auto border-t border-emerald-200 pt-3"><p className="mb-2 text-xs font-extrabold text-neutral-700">CÁC MÙA ĐÃ KẾT THÚC · THỰC TẾ</p><table className="w-full min-w-[640px] text-left text-xs"><thead><tr className="text-neutral-500"><th className="py-2">Mùa vụ</th><th>Khối lượng thu hoạch</th><th>Số trái</th><th>Kg/trái</th><th>Doanh thu thực ghi nhận</th><th>Ngày thu cuối</th></tr></thead><tbody>{history.map((item) => <tr key={item.seasonId} className="border-t border-emerald-100"><td className="py-2 font-bold">{item.seasonName} · Đã kết thúc</td><td>{item.actualYieldKg == null ? "Chưa có" : `${number.format(item.actualYieldKg)} kg`}</td><td>{item.actualFruitCount == null ? "Chưa có" : number.format(item.actualFruitCount)}</td><td>{item.actualAverageFruitWeightKg == null ? "Chưa đủ dữ liệu" : `${number.format(item.actualAverageFruitWeightKg)} kg`}</td><td>{item.actualRevenue == null ? "Chưa ghi nhận" : money.format(item.actualRevenue)}</td><td>{item.finalHarvestDate || "—"}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-xs text-neutral-500">Chưa có dữ liệu mùa vụ trước.</p>}
    </> : null}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-emerald-100 bg-white p-3"><p className="text-[11px] font-semibold text-neutral-500">{label}</p><p className="mt-1 text-sm font-extrabold text-neutral-900">{value}</p></div>;
}

const seasonStatusLabels: Record<CultivationSeasonStatus, string> = {
  PREPARING: "Đang chuẩn bị",
  IN_PROGRESS: "Đang diễn ra",
  ENDED: "Đã kết thúc",
};

function getSeasonStatus(season: CultivationSeason, today: string): CultivationSeasonStatus {
  if (season.endDate && season.endDate < today) return "ENDED";
  if (season.startDate > today) return "PREPARING";
  return "IN_PROGRESS";
}

// ── ZoneTreesWorkspace ────────────────────────────────────────────────────────

interface Props {
  farmId: string;
  zoneId: string;
}

export function ZoneTreesWorkspace({ farmId, zoneId }: Props) {
  const searchParams = useSearchParams();
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
  const [yieldRefreshKey, setYieldRefreshKey] = useState(0);
  const [currentFruitCounts, setCurrentFruitCounts] = useState<Record<string, number>>({});
  const [bulkYieldOpen, setBulkYieldOpen] = useState(false);
  const [treeListOpen, setTreeListOpen] = useState(false);

  const load = () => {
    let active = true;
    setLoading(true);
    setError(null);
    setZone(null);
    setTrees([]);
    setSafety(null);
    setSelectedTreeId(null);
    setActiveSeason(null);
    setSafeHarvestDate(undefined);
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      treeClient.getZone(zoneId),
      treeClient.listTrees(zoneId),
      treeClient.getZoneSafety(zoneId).catch(() => null),
      cultivationClient.listSeasons({ farmId, plotId: zoneId }).catch(() => [] as CultivationSeason[]),
    ])
      .then(([zoneData, treeData, safetyData, seasons]) => {
        if (!active) return;
        if (zoneData.id !== zoneId || zoneData.farmId !== farmId) {
          throw new Error("Khu canh tác không khớp trang trại.");
        }
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
  }, [zoneId, farmId]);

  useEffect(() => {
    const requestedTreeId = searchParams.get("treeId");
    setSelectedTreeId(current => {
      const candidate = requestedTreeId || current;
      return candidate && trees.some(tree => tree.id === candidate) ? candidate : null;
    });
  }, [searchParams, trees]);

  const activeSeasonId = activeSeason?.id;

  useEffect(() => {
    let active = true;
    if (!activeSeasonId) {
      setCurrentFruitCounts({});
      return () => { active = false; };
    }
    cultivationClient.getYieldForecast(activeSeasonId, zoneId)
      .then((forecast) => {
        if (!active) return;
        const latestCounts: Record<string, number> = {};
        for (const tree of forecast.trees ?? []) {
          if (tree.fruitCount != null) latestCounts[tree.treeId] = tree.fruitCount;
        }
        setCurrentFruitCounts(latestCounts);
      })
      .catch(() => { if (active) setCurrentFruitCounts({}); });
    return () => { active = false; };
  }, [activeSeasonId, zoneId, yieldRefreshKey]);

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
        href="/dashboard/client/farms"
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

      {bulkYieldOpen && activeSeason ? <BulkYieldEntryDialog currentFruitCounts={currentFruitCounts} onClose={() => setBulkYieldOpen(false)} onSaved={() => setYieldRefreshKey((current) => current + 1)} season={activeSeason} trees={trees} zoneId={zoneId} /> : null}

      {/* Safety summary */}
      {safety ? <ZoneSafetySummaryCard summary={safety} /> : null}

      {/* Tree map + detail panel */}
      {zone ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          {/* Map */}
          <div className="panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-extrabold text-neutral-900">
                Bản đồ cây ({trees.length} cây)
              </h2>
              <div className="flex flex-wrap gap-2"><button
                  type="button"
                  disabled={!activeSeason || !trees.length}
                  onClick={() => setBulkYieldOpen(true)}
                  className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-[#2E5A44] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >Cập nhật số lượng trái hàng loạt</button><button
                  type="button"
                  onClick={() => { setGeneratingTrees(true); setGenerateSuccess(null); }}
                  className="flex items-center gap-1.5 rounded-xl bg-[#2E5A44] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#25493a] transition-colors"
                >
                  <Plus size={14} />
                  Tạo cây tự động
                </button></div>
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
              fruitCounts={currentFruitCounts}
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
              key={selectedTreeId}
              treeId={selectedTreeId}
              farmId={farmId}
              season={activeSeason}
              zoneId={zoneId}
              onSeasonCreated={(season) => {
                setActiveSeason(season);
                setSafeHarvestDate(undefined);
              }}
              onYieldSaved={() => setYieldRefreshKey((current) => current + 1)}
              onClose={() => setSelectedTreeId(null)}
              onDiagnosisSaved={() => {
                treeClient.listTrees(zoneId).then(setTrees).catch(() => {});
                treeClient.getZoneSafety(zoneId).then((s) => { if (s) setSafety(s); }).catch(() => {});
              }}
              onRemoved={() => {
                setSelectedTreeId(null);
                treeClient.listTrees(zoneId).then(setTrees).catch(() => {});
                treeClient.getZone(zoneId).then(setZone).catch(() => {});
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

      {activeSeason ? <details className="panel group"><summary className="cursor-pointer list-none p-4 text-sm font-extrabold text-[#2E5A44]"><span className="inline-flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full border border-emerald-200 text-xs transition-transform group-open:rotate-45">+</span>Xem dự kiến sản lượng và dữ liệu mùa vụ</span></summary><div className="border-t border-neutral-100 p-4 pt-0"><YieldForecastCard refreshKey={yieldRefreshKey} season={activeSeason} zoneId={zoneId} /></div></details> : null}

      {/* Tree list table */}
      {zone ? (
        <div className="panel p-5">
          <button
            aria-controls="zone-tree-list"
            aria-expanded={treeListOpen}
            className="flex w-full items-center justify-between gap-3 text-left text-sm font-extrabold text-[#2E5A44]"
            onClick={() => setTreeListOpen((current) => !current)}
            type="button"
          >
            <span>Danh sách cây ({trees.length})</span>
            {treeListOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {treeListOpen ? <div className="mt-4" id="zone-tree-list">{trees.length === 0 ? (
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
          )}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
