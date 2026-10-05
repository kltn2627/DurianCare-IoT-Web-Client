"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  PackageCheck,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  cultivationClient,
  farmZoneClient,
  CultivationApiError,
} from "@/lib/cultivation/client";
import type {
  ComplianceAssessment,
  CultivationSeason,
  ExportRelease,
  FarmCatalog,
  HarvestBatch,
} from "@/lib/cultivation/types";
import {
  exportStatusLabels,
  formatDateTime,
  riskLevelLabels,
} from "@/features/cultivation-calendar/labels";
import { hasCultivationPermission } from "@/features/cultivation-calendar/permissions";

type ViewKey = "qr" | "harvest" | "export" | "traceability";

const inputClass =
  "h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-900 outline-none transition focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414]";

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
        description="Dữ liệu sẽ xuất hiện sau khi backend có bản ghi phù hợp."
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
  const [batches, setBatches] = useState<HarvestBatch[]>([]);
  const [farms, setFarms] = useState<FarmCatalog[]>([]);
  const [seasons, setSeasons] = useState<CultivationSeason[]>([]);
  const [releases, setReleases] = useState<ExportRelease[]>([]);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(
    null,
  );
  const [snapshotStatus, setSnapshotStatus] = useState<string | null>(null);
  const [latestAssessment, setLatestAssessment] = useState<ComplianceAssessment | null>(null);
  const [releaseForm, setReleaseForm] = useState({
    harvestBatchId: "",
    targetMarketCode: "",
    releaseCode: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canApproveExport = hasCultivationPermission(
    user?.role,
    "EXPORT_RELEASE_APPROVE",
  );
  const canReviewExport =
    hasCultivationPermission(user?.role, "EXPORT_RELEASE_REVIEW") ||
    canApproveExport;
  const safeBatches = useMemo(() => Array.isArray(batches) ? batches : [], [batches]);
  const safeReleases = useMemo(() => Array.isArray(releases) ? releases : [], [releases]);
  const selectedRelease = safeReleases[0] ?? null;
  const farmById = useMemo(() => new Map(farms.map((farm) => [farm.id, farm])), [farms]);
  const seasonById = useMemo(() => new Map(seasons.map((season) => [season.id, season])), [seasons]);

  const metrics = useMemo(() => {
    const ready = safeReleases.filter((release) =>
      ["APPROVED", "RELEASED"].includes(release.status),
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
      const [nextBatches, nextReleases, nextFarms] = await Promise.all([
        cultivationClient.listHarvestBatches(),
        cultivationClient.listExportReleases(),
        farmZoneClient.listFarms(),
      ]);
      const normalizedBatches = Array.isArray(nextBatches) ? nextBatches : [];
      const normalizedReleases = Array.isArray(nextReleases) ? nextReleases : [];
      const normalizedFarms = Array.isArray(nextFarms) ? nextFarms : [];
      const seasonScopes = Array.from(
        new Map(
          normalizedBatches.map((batch) => [
            `${batch.farmId}:${batch.plotId}`,
            { farmId: batch.farmId, plotId: batch.plotId },
          ]),
        ).values(),
      );
      const seasonsByScope = await Promise.all(
        seasonScopes.map(({ farmId, plotId }) =>
          cultivationClient.listSeasons(farmId, plotId),
        ),
      );
      setBatches(normalizedBatches);
      setReleases(normalizedReleases);
      setFarms(normalizedFarms);
      setSeasons(seasonsByScope.flat());
      const firstBatch = normalizedBatches[0];
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
                được xác thực.
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
          ["qr", "QR công khai", QrCode],
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

      {view === "qr" ? (
        <EmptyState
          title="Chưa có QR công khai cho dữ liệu canonical"
          description="Backend hiện chỉ cung cấp snapshot truy xuất qua hồ sơ ExportRelease đã xác thực, chưa có mã/token hoặc endpoint truy xuất công khai. Màn hình không tạo QR từ tên hay ID lô để tránh dẫn đến một URL không được backend hỗ trợ."
        />
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
              "Trang trại",
              "Khu canh tác",
              "Mùa vụ",
              "Ngày thu",
              "Sản lượng",
              "Thị trường",
              "Risk",
              "Trạng thái",
            ]}
            rows={safeBatches.map((batch) => [
              batch.batchCode,
              farmById.get(batch.farmId)?.name ?? `Farm ${batch.farmId}`,
              farmById.get(batch.farmId)?.zones.find((zone) => zone.id === batch.plotId)?.name ?? `Zone ${batch.plotId}`,
              seasonById.get(batch.cultivationSeasonId)?.name ?? `Season ${batch.cultivationSeasonId}`,
              formatDateTime(batch.harvestedAt),
              `${batch.quantity} ${batch.quantityUnit}`,
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
                      }),
                    "Đã tạo hồ sơ xuất xưởng.",
                  );
                }}
                className="mt-4 grid gap-3"
              >
                <Field label="Lô thu hoạch">
                  <select
                    required
                    className={inputClass}
                    value={releaseForm.harvestBatchId}
                    onChange={(e) =>
                      setReleaseForm({
                        ...releaseForm,
                        harvestBatchId: e.target.value,
                        targetMarketCode: safeBatches.find((batch) => batch.id === e.target.value)?.expectedDestinationMarket ?? "",
                      })
                    }
                  >
                    <option value="">Chọn lô thu hoạch</option>
                    {safeBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchCode} · {batch.id}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Thị trường">
                  <input
                    required
                    readOnly
                    className={inputClass}
                    value={releaseForm.targetMarketCode}
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
                <button className="rounded-xl bg-[#2E5A44] px-4 py-2 text-xs font-bold text-white">
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
                release.releaseCode,
                release.harvestBatchId,
                release.targetMarketCode,
                exportStatusLabels[release.status],
                <span key={release.id} className="flex flex-wrap gap-2">
                  {release.status === "DRAFT" ? <button
                    onClick={() =>
                      void mutate(
                        () => cultivationClient.submitExportRelease(release.id),
                        "Đã gửi duyệt.",
                      )
                    }
                    className="rounded-lg bg-neutral-100 px-2 py-1 font-bold"
                  >
                    Gửi duyệt
                  </button> : null}
                  {canApproveExport && release.status === "UNDER_REVIEW" ? (
                    <button
                      onClick={() =>
                        void mutate(
                          () =>
                            cultivationClient.approveExportRelease(release.id),
                          "Đã phê duyệt.",
                        )
                      }
                      className="rounded-lg bg-[#2E5A44] px-2 py-1 font-bold text-white"
                    >
                      Duyệt
                    </button>
                  ) : null}
                  {canApproveExport && release.status === "APPROVED" ? (
                    <button
                      onClick={() =>
                        void mutate(
                          async () => {
                            try {
                              const assessment = await cultivationClient.assessExportRelease(
                                release.harvestBatchId, release.targetMarketCode,
                              );
                              setLatestAssessment(assessment);
                              if (!assessment.eligibleForExportRelease) {
                                throw new Error(`Compliance hiện tại không đạt: ${assessment.blockingReasons.join(", ") || assessment.warnings.join(", ")}`);
                              }
                              await cultivationClient.releaseExportRelease(release.id);
                            } catch (caught) {
                              const latest = await cultivationClient.assessExportRelease(
                                release.harvestBatchId, release.targetMarketCode,
                              ).catch(() => null);
                              if (latest) setLatestAssessment(latest);
                              throw caught;
                            }
                          },
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
            {latestAssessment ? <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700">
              <b>Compliance mới nhất:</b> {latestAssessment.eligibleForExportRelease ? "Đủ điều kiện" : "Chưa đủ điều kiện"}
              <div>Blocker: {latestAssessment.blockingReasons.join(", ") || "Không có"}</div>
              <div>Cảnh báo: {latestAssessment.warnings.join(", ") || "Không có"}</div>
            </div> : null}
          </div>
        </div>
      ) : null}

      {view === "traceability" ? (
        <div className="panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Snapshot truy xuất</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Snapshot phát hành được hiển thị riêng trong Vụ mùa & QR.
              </p>
            </div>
            <button
              disabled={!selectedRelease}
              onClick={() =>
                selectedRelease
                  ? void mutate(async () => {
                      const result = await cultivationClient.traceability(
                        selectedRelease.id,
                      );
                      setSnapshot(result.snapshot);
                      setSnapshotStatus(result.status);
                    }, "Đã tải snapshot truy xuất.")
                  : undefined
              }
              className="rounded-xl bg-[#2E5A44] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Tải snapshot
            </button>
          </div>
          {snapshot ? (
            <><p className="mb-2 text-xs font-bold text-neutral-700">Trạng thái hiện tại: {snapshotStatus}</p>
            <pre className="max-h-[520px] overflow-auto rounded-2xl bg-neutral-950 p-4 text-xs leading-5 text-neutral-100 scrollbar-thin">
              {JSON.stringify(snapshot, null, 2)}
            </pre></>
          ) : (
            <EmptyState
              title="Chưa tải snapshot"
              description="Chọn hồ sơ xuất xưởng đầu tiên trong danh sách hoặc tạo hồ sơ mới rồi tải snapshot."
            />
          )}
        </div>
      ) : null}

    </section>
  );
}
