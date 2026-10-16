"use client";
import { FarmerInspectionDialog } from "@/components/dashboard/FarmerInspectionDialog";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ExternalLink,
  Loader2,
  PackageCheck,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  cultivationClient,
  CultivationApiError,
} from "@/lib/cultivation/client";
import type { ExportRelease, HarvestBatch, HarvestDispatchSnapshot } from "@/lib/cultivation/types";
import {
  exportStatusLabels,
  formatDateTime,
  riskLevelLabels,
} from "@/features/cultivation-calendar/labels";
import { hasCultivationPermission } from "@/features/cultivation-calendar/permissions";
import { selectTraceabilityRelease } from "@/lib/cultivation/releaseSelection";
import { batchDisplayName, displayQuantity, isSyntheticBatch, isSyntheticRelease, releaseDisplayName } from "@/lib/cultivation/presentation";

type ViewKey = "qr" | "harvest" | "export" | "traceability";

const inputClass =
  "h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-900 outline-none transition focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414]";

const releaseEligibleBatchStatuses = new Set(["APPROVED", "HARVESTED"]);

function isReleaseEligibleBatch(batch: HarvestBatch) {
  return releaseEligibleBatchStatuses.has(batch.status);
}

function batchOptionLabel(batch: HarvestBatch) {
  return [
    batch.batchCode,
    batch.cultivationSeasonId,
    batch.plotId,
    formatDateTime(batch.harvestedAt),
    batch.expectedDestinationMarket,
  ]
    .filter(Boolean)
    .join(" · ");
}

function batchMatchesSearch(batch: HarvestBatch, search: string) {
  const haystack = [
    batch.id,
    batch.batchCode,
    batch.cultivationSeasonId,
    batch.farmId,
    batch.plotId,
    batch.expectedDestinationMarket,
    batch.status,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(search.trim().toLowerCase());
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-neutral-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-neutral-200 bg-white/70 p-6 text-center">
      <span>
        <PackageCheck className="mx-auto text-neutral-300" size={26} />
        <b className="mt-3 block text-sm text-neutral-800">{title}</b>
        <p className="mt-1 max-w-md text-xs leading-5 text-neutral-500">
          {description}
        </p>
      </span>
    </div>
  );
}

function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  if (!rows.length)
    return (
      <EmptyState
        title={empty}
        description="Dữ liệu sẽ xuất hiện sau khi hệ thống có bản ghi phù hợp."
      />
    );
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 scrollbar-thin">
      <table className="min-w-full divide-y divide-neutral-200 text-left text-xs">
        <thead className="bg-neutral-50 text-neutral-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-bold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 bg-white">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 align-top text-neutral-700"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CropQrBuilder() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewKey>("qr");
  const [seasonNames, setSeasonNames] = useState<Record<string, string>>({});
  const [selectedQrRelease, setSelectedQrRelease] =
    useState<ExportRelease | null>(null);
  const [batches, setBatches] = useState<HarvestBatch[]>([]);
  const [releases, setReleases] = useState<ExportRelease[]>([]);
  const [dispatches, setDispatches] = useState<Record<string, HarvestDispatchSnapshot | null>>({});
  const [dispatchError, setDispatchError] = useState(false);
  const [verifiedData, setVerifiedData] = useState<"loading" | "none" | "available" | "error">("loading");
  const [batchSearch, setBatchSearch] = useState("");
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(
    null,
  );
  const [traceabilityReleaseId, setTraceabilityReleaseId] = useState<string | null>(null);
  const snapshotSequence = useRef(0);
  const [releaseForm, setReleaseForm] = useState({
    harvestBatchId: "",
    targetMarketCode: "",
    releaseCode: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inspectionReleaseId, setInspectionReleaseId] = useState<string | null>(null);

  const actorId = user?.userId ?? "";
  const canApproveExport = hasCultivationPermission(
    user?.role,
    "EXPORT_RELEASE_APPROVE",
  );
  const canReviewExport =
    hasCultivationPermission(user?.role, "EXPORT_RELEASE_REVIEW") ||
    canApproveExport;
  const safeBatches = useMemo(
    () => (Array.isArray(batches) ? batches : []),
    [batches],
  );
  const safeReleases = useMemo(
    () => (Array.isArray(releases) ? releases : []),
    [releases],
  );
  const selectedRelease = selectTraceabilityRelease(safeReleases, traceabilityReleaseId);
  const releasedQrReleases = safeReleases.filter(
    (release) => release.status === "RELEASED",
  );
  const eligibleBatches = safeBatches.filter(batch => !isSyntheticBatch(batch) && isReleaseEligibleBatch(batch));
  const visibleEligibleBatches = eligibleBatches.filter((batch) =>
    batchMatchesSearch(batch, batchSearch),
  );
  const selectedBatch = safeBatches.find(
    (batch) => batch.id === releaseForm.harvestBatchId,
  );

  const metrics = useMemo(() => {
    const ready = safeReleases.filter((release) =>
      ["APPROVED", "INSPECTED_PASSED", "RELEASED"].includes(release.status) && !isSyntheticRelease(release),
    ).length;
    const blocked = safeReleases.filter(
      (release) => release.status === "BLOCKED",
    ).length;
    const risky = safeBatches.filter((batch) =>
      ["HIGH", "CRITICAL"].includes(batch.chemicalRiskLevel),
    ).length;
    return { ready, blocked, risky };
  }, [safeBatches, safeReleases]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextBatches, nextReleases] = await Promise.all([
        cultivationClient.listHarvestBatches(),
        cultivationClient.listExportReleases(),
      ]);
      const normalizedBatches = Array.isArray(nextBatches) ? nextBatches : [];
      const normalizedReleases = Array.isArray(nextReleases) ? nextReleases : [];
      setBatches(normalizedBatches);
      setReleases(normalizedReleases);
      const catalogs = await Promise.allSettled([...new Set(normalizedBatches.map(batch => batch.farmId))].map(farmId => cultivationClient.listSeasons({farmId})));
      setSeasonNames(Object.fromEntries(catalogs.flatMap(result => result.status === "fulfilled" ? result.value.map(season => [season.id, season.name]) : [])));
      const dispatchResults = await Promise.allSettled(normalizedReleases.filter(release => release.status === "RELEASED").map(async release => {
        try { return [release.harvestBatchId, await cultivationClient.getHarvestDispatch(release.harvestBatchId)] as const; }
        catch (error) {
          if (error instanceof CultivationApiError && error.status === 404) return [release.harvestBatchId, null] as const;
          throw error;
        }
      }));
      setDispatchError(dispatchResults.some(result => result.status === "rejected"));
      setDispatches(Object.fromEntries(dispatchResults.flatMap(result => result.status === "fulfilled" ? [result.value] : [])));
      try {
        const summaries = await Promise.all([...new Set(normalizedBatches.map(batch => batch.farmId))].map(farmId => cultivationClient.dispatchSummary(farmId)));
        if (summaries.some(summary => !["NO_VERIFIED_DATA", "OPERATOR_CONFIRMED_RECORDS"].includes(summary.status))) throw new Error("Invalid dispatch summary");
        setVerifiedData(summaries.some(summary => summary.status === "OPERATOR_CONFIRMED_RECORDS") ? "available" : "none");
      } catch { setVerifiedData("error"); }
      const firstBatch = normalizedBatches.find(batch => isReleaseEligibleBatch(batch) && !isSyntheticBatch(batch));
      if (firstBatch && !releaseForm.harvestBatchId) {
        setReleaseForm((current) => ({
          ...current,
          harvestBatchId: firstBatch.id,
          targetMarketCode: firstBatch.expectedDestinationMarket,
        }));
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Không thể tải dữ liệu vụ mùa.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mutate = async (action: () => Promise<unknown>, success: string) => {
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      await refresh();
    } catch (caught) {
      const message =
        caught instanceof CultivationApiError || caught instanceof Error
          ? caught.message
          : "Không thể thực hiện thao tác.";
      setError(message);
    }
  };

  return (
    <section id="crops" className="space-y-4">
      <div className="panel p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]">
              <PackageCheck size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Vụ mùa, QR và xuất xưởng
              </h2>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Quản lý lô thu hoạch, hồ sơ xuất xưởng và snapshot truy xuất
                theo quyền truy cập nông trại.
              </p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-xs font-bold text-white disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            Tải lại
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-2 scrollbar-thin">
        {[
          ["qr", "QR truy xuất", QrCode],
          ["harvest", "Lô thu hoạch", PackageCheck],
          ["export", "Xuất xưởng", Truck],
          ["traceability", "Truy xuất", ShieldCheck],
        ].map(([key, label, Icon]) => {
          const TabIcon = Icon as typeof QrCode;
          return (
            <button
              key={String(key)}
              type="button"
              onClick={() => setView(key as ViewKey)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition ${view === key ? "bg-[#2E5A44] text-white" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"}`}
            >
              <TabIcon size={14} />
              {String(label)}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}
      {dispatchError ? <p role="alert" className="text-sm text-red-700">Không thể tải đầy đủ hồ sơ giao vận. Hãy tải lại dữ liệu.</p> : null}
      {verifiedData !== "none" ? <p role="status" className="text-sm text-neutral-600">{verifiedData === "error" ? "Không tải được báo cáo xuất xưởng đã xác minh. Vui lòng thử lại." : verifiedData === "available" ? "Có hồ sơ xuất xưởng được người có quyền xác nhận." : "Đang tải báo cáo xuất xưởng đã xác minh…"}</p> : null}

      {view === "qr" ? (
        <div className="panel p-5 sm:p-7">
          {releasedQrReleases.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {releasedQrReleases.map((release) => {
                const batch = safeBatches.find(
                  (item) => item.id === release.harvestBatchId,
                );
                return (
              <article
                key={release.id}
                className="rounded-2xl border border-[#e2e7e0] p-5"
              >
                <div className="flex items-start justify-between gap-7">
                  <span>
                    <small className="text-xs font-bold tracking-[1px] text-[#849087]">
                      Hồ sơ xuất xưởng
                    </small>
                    <b className="mt-1 block text-sm">
                      {releaseDisplayName(release)}
                    </b>
                  </span>
                  <span className="rounded-full bg-[#e9f2ea] px-2.5 py-1 text-xs font-bold text-[#3e7353]">
                    {exportStatusLabels[release.status]}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-4 rounded-xl bg-[#f7f8f5] p-4 text-xs">
                  <span>
                    <small className="block text-[#849087]">Mã lô</small>
                    <b className="mt-1 block">{batch ? batchDisplayName(batch, releases) : "Chưa tải thông tin lô"}</b>
                  </span>
                  <span>
                    <small className="block text-[#849087]">Mùa vụ</small>
                    <b className="mt-1 block">{batch ? seasonNames[batch.cultivationSeasonId] ?? "Chưa tải tên mùa vụ" : "Chưa tải"}</b>
                  </span>
                  <span>
                    <small className="block text-[#849087]">Thu hoạch</small>
                    <b className="mt-1 block">{formatDateTime(batch?.harvestedAt)}</b>
                  </span>
                </div>
                {dispatches[release.harvestBatchId] ? <p className="mt-3 text-sm text-neutral-700">Giao vận: {dispatches[release.harvestBatchId]?.status === "DELIVERED" ? "Đã giao hàng" : dispatches[release.harvestBatchId]?.status === "DISPATCHED" ? "Đã xuất xưởng" : "Bản nháp"} · {displayQuantity(dispatches[release.harvestBatchId]!.evidence.shippedQuantity, dispatches[release.harvestBatchId]!.evidence.quantityUnit)}</p> : <p className="mt-3 text-sm text-neutral-500">Chưa tải được hồ sơ giao vận.</p>}
                <button
                  onClick={() => setSelectedQrRelease(release)}
                  className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-[#2E5A44] py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#abb6ae]"
                >
                  <QrCode size={15} /> Mở QR truy xuất
                </button>
              </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Chưa có QR truy xuất"
              description="QR chỉ hiển thị cho hồ sơ xuất xưởng đã phát hành. Hồ sơ đang duyệt hoặc chưa đủ điều kiện được tách riêng khỏi trạng thái mùa vụ."
            />
          )}
        </div>
      ) : null}

      {view === "harvest" ? (
        <div className="panel p-5">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl bg-neutral-50 p-4">
              <small className="text-xs text-neutral-500">Lô thu hoạch</small>
              <b className="mt-1 block text-2xl">{safeBatches.length}</b>
            </article>
            <article className="rounded-2xl bg-neutral-50 p-4">
              <small className="text-xs text-neutral-500">Lô rủi ro</small>
              <b className="mt-1 block text-2xl">{metrics.risky}</b>
            </article>
            <article className="rounded-2xl bg-neutral-50 p-4">
              <small className="text-xs text-neutral-500">Hồ sơ sẵn sàng</small>
              <b className="mt-1 block text-2xl">{metrics.ready}</b>
            </article>
          </div>
          <DataTable
            headers={[
              "Mã lô",
              "Mùa vụ",
              "Ngày thu",
              "Sản lượng",
              "Thị trường",
              "Risk",
              "Trạng thái",
            ]}
            rows={safeBatches.map((batch) => [
              batchDisplayName(batch, releases),
              seasonNames[batch.cultivationSeasonId] ?? "Chưa tải tên mùa vụ",
              formatDateTime(batch.harvestedAt),
              displayQuantity(batch.quantity, batch.quantityUnit),
              batch.expectedDestinationMarket,
              riskLevelLabels[batch.chemicalRiskLevel],
              batch.status,
            ])}
            empty="Chưa có lô thu hoạch."
          />
        </div>
      ) : null}

      {view === "export" ? (
        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="panel p-5">
            <h3 className="text-sm font-bold">Tạo hồ sơ xuất xưởng</h3>
            {!canReviewExport ? (
              <EmptyState
                title="Chỉ được xem"
                description="Tài khoản hiện tại chưa có quyền tạo hồ sơ xuất xưởng."
              />
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void mutate(
                    () =>
                      cultivationClient.createExportRelease({
                        releaseCode:
                          releaseForm.releaseCode || `ER-${Date.now()}`,
                        harvestBatchId: releaseForm.harvestBatchId,
                        targetMarketCode: releaseForm.targetMarketCode,
                        submittedBy: actorId,
                      }),
                    "Đã tạo hồ sơ xuất xưởng.",
                  );
                }}
                className="mt-4 grid gap-3"
              >
                <Field label="Tìm lô thu hoạch">
                  <input
                    className={inputClass}
                    placeholder="Tìm theo mã lô, season, farm/khu hoặc thị trường"
                    value={batchSearch}
                    onChange={(e) => setBatchSearch(e.target.value)}
                  />
                </Field>
                <Field label="Lô thu hoạch đủ điều kiện">
                  <select
                    required
                    className={inputClass}
                    value={releaseForm.harvestBatchId}
                    onChange={(e) => {
                      const batch = eligibleBatches.find(
                        (item) => item.id === e.target.value,
                      );
                      setReleaseForm({
                        ...releaseForm,
                        harvestBatchId: e.target.value,
                        targetMarketCode:
                          batch?.expectedDestinationMarket ??
                          releaseForm.targetMarketCode,
                      });
                    }}
                    disabled={!eligibleBatches.length}
                  >
                    <option value="">
                      {eligibleBatches.length
                        ? "Chọn lô thu hoạch"
                        : "Không có lô APPROVED/HARVESTED"}
                    </option>
                    {visibleEligibleBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batchOptionLabel(batch)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs leading-5 text-neutral-500">
                    Chỉ gửi ID lô đã tồn tại trong hệ thống. Lô nháp, bị chặn hoặc đã hủy
                    không được dùng để tạo hồ sơ xuất xưởng.
                  </p>
                </Field>
                {selectedBatch ? (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-600">
                    <b className="block text-neutral-800">
                      {selectedBatch.batchCode}
                    </b>
                    Season {selectedBatch.cultivationSeasonId} · Khu{" "}
                    {selectedBatch.plotId} · Trạng thái {selectedBatch.status}
                  </div>
                ) : null}
                <Field label="Thị trường">
                  <input
                    required
                    className={inputClass}
                    value={releaseForm.targetMarketCode}
                    onChange={(e) =>
                      setReleaseForm({
                        ...releaseForm,
                        targetMarketCode: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Mã hồ sơ">
                  <input
                    className={inputClass}
                    value={releaseForm.releaseCode}
                    onChange={(e) =>
                      setReleaseForm({
                        ...releaseForm,
                        releaseCode: e.target.value,
                      })
                    }
                  />
                </Field>
                {!eligibleBatches.length ? (
                  <EmptyState
                    title="Chưa có lô đủ điều kiện"
                    description="Hãy tạo hoặc đăng ký lô thu hoạch hợp lệ trong tab Lô thu hoạch. Hệ thống sẽ chặn lô nháp, bị chặn hoặc đã hủy."
                  />
                ) : null}
                <button
                  disabled={!releaseForm.harvestBatchId || !eligibleBatches.length}
                  className="rounded-xl bg-[#2E5A44] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tạo hồ sơ
                </button>
              </form>
            )}
          </div>
          <div className="panel p-5">
            <DataTable
              headers={[
                "Mã hồ sơ",
                "Lo",
                "Thị trường",
                "Trạng thái",
                "Thao tác",
              ]}
              rows={safeReleases.map((release) => [
                releaseDisplayName(release),
                safeBatches.find(batch => batch.id === release.harvestBatchId) ? batchDisplayName(safeBatches.find(batch => batch.id === release.harvestBatchId)!, releases) : "Chưa tải thông tin lô",
                release.targetMarketCode,
                exportStatusLabels[release.status],
                <span key={release.id} className="flex flex-wrap gap-2">
                  <button
                    disabled={isSyntheticRelease(release) || release.status !== "DRAFT"}
                    onClick={() =>
                      void mutate(
                        () =>
                          cultivationClient.submitExportRelease(
                            release.id,
                            actorId,
                          ),
                        "Đã gửi duyệt.",
                      )
                    }
                    className="rounded-lg bg-neutral-100 px-2 py-1 font-bold"
                  >
                    Gửi duyệt
                  </button>
                  {canApproveExport && !isSyntheticRelease(release) ? (
                    <button
                      disabled={!["DRAFT","UNDER_REVIEW","INSPECTION_PENDING","NOT_ELIGIBLE","BLOCKED"].includes(release.status)}
                      onClick={() => setInspectionReleaseId(release.id)}
                      className="rounded-lg bg-[#2E5A44] px-2 py-1 font-bold text-white"
                    >
                      Tự kiểm tra
                    </button>
                  ) : null}
                  {canApproveExport && !isSyntheticRelease(release) ? (
                    <button
                      disabled={!["APPROVED","INSPECTED_PASSED"].includes(release.status)}
                      onClick={() =>
                        void mutate(
                          () =>
                            cultivationClient.releaseExportRelease(
                              release.id,
                              actorId,
                            ),
                          "Đã phát hành.",
                        )
                      }
                      className="rounded-lg bg-emerald-600 px-2 py-1 font-bold text-white"
                    >
                      Phát hành
                    </button>
                  ) : null}
                </span>,
              ])}
              empty="Chưa có hồ sơ xuất xưởng."
            />
          </div>
        </div>
      ) : null}

      {view === "traceability" ? (
        <div className="panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Snapshot truy xuất</h3>
              <p className="mt-1 text-xs text-neutral-500">
                {selectedRelease ? releaseDisplayName(selectedRelease) : "Chưa chọn hồ sơ"}
              </p>
            </div>
            <button
              disabled={!selectedRelease}
              onClick={() =>
                selectedRelease
                  ? void mutate(async () => {
                      const sequence = ++snapshotSequence.current;
                      setSnapshot(null);
                      const result = await cultivationClient.traceability(
                        selectedRelease.id,
                      );
                      if (sequence !== snapshotSequence.current) return;
                      if (result.releaseId !== selectedRelease.id) throw new Error("Hồ sơ truy xuất trả về không khớp lựa chọn. Vui lòng tải lại.");
                      setSnapshot(result.snapshot);
                    }, "Đã tải snapshot truy xuất.")
                  : undefined
              }
              className="rounded-xl bg-[#2E5A44] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Tải snapshot
            </button>
          </div>
          {snapshot ? (
            <details><summary className="cursor-pointer text-sm">Thông tin kỹ thuật và nguồn dữ liệu</summary><pre className="mt-3 max-h-[520px] overflow-auto rounded border border-neutral-200 p-4 text-xs leading-5 scrollbar-thin">
              {JSON.stringify(snapshot, null, 2)}
            </pre></details>
          ) : (
            <EmptyState
              title="Chưa tải snapshot"
              description="Chọn hồ sơ qua QR hoặc tải snapshot của hồ sơ đang chọn."
            />
          )}
        </div>
      ) : null}

      {selectedQrRelease ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#183226aa] p-5 backdrop-blur-sm">
          <div className="w-full max-w-[440px] rounded-[24px] bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold tracking-[1.4px] text-[#8b968f]">
                  PROTOCOL & QR BUILDER
                </span>
                <h3 className="mt-2 text-xl font-extrabold">
                  Mã truy xuất đã sẵn sàng
                </h3>
              </div>
              <button
                onClick={() => setSelectedQrRelease(null)}
                className="grid size-9 place-items-center rounded-xl bg-[#f2f4f1]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mx-auto my-6 w-fit rounded-2xl border border-[#e3e8e1] bg-white p-5 shadow-sm">
              <QRCodeSVG
                value={`${typeof window === "undefined" ? "" : window.location.origin}/api/backend/v1/export-releases/${encodeURIComponent(selectedQrRelease.id)}/traceability`}
                size={190}
                fgColor="#244B37"
                level="H"
              />
            </div>
            <div className="rounded-xl bg-[#f7f8f5] p-5 text-center">
              <b className="text-sm">{releaseDisplayName(selectedQrRelease)}</b>
              <p className="mt-1 text-sm text-[#7d8981]">
                {exportStatusLabels[selectedQrRelease.status]}
              </p>
              <details className="mt-3 text-xs"><summary>Thông tin kỹ thuật</summary><p className="break-all">{selectedQrRelease.releaseCode}<br />{selectedQrRelease.harvestBatchId}</p></details>
            </div>
            <button
              type="button"
              onClick={() => {
                snapshotSequence.current += 1;
                setTraceabilityReleaseId(selectedQrRelease.id);
                setSnapshot(null);
                setView("traceability");
                setSelectedQrRelease(null);
              }}
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-[#EED56D] py-4 text-xs font-bold text-[#2E5A44]"
            >
              <ExternalLink size={15} /> Xem snapshot đã xác thực
            </button>
          </div>
        </div>
      ) : null}
      {inspectionReleaseId ? <FarmerInspectionDialog releaseId={inspectionReleaseId} onClose={()=>setInspectionReleaseId(null)} onSaved={refresh}/> : null}
    </section>
  );
}
