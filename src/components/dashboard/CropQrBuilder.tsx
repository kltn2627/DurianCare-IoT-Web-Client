"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { cropLots } from "@/constants/durianMockData";
import {
  cultivationClient,
  CultivationApiError,
} from "@/lib/cultivation/client";
import type { ExportRelease, HarvestBatch } from "@/lib/cultivation/types";
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
  const [selectedCrop, setSelectedCrop] = useState<
    (typeof cropLots)[number] | null
  >(null);
  const [batches, setBatches] = useState<HarvestBatch[]>([]);
  const [releases, setReleases] = useState<ExportRelease[]>([]);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(
    null,
  );
  const [releaseForm, setReleaseForm] = useState({
    harvestBatchId: "",
    targetMarketCode: "",
    releaseCode: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const actorId = user?.userId ?? "";
  const canApproveExport = hasCultivationPermission(
    user?.role,
    "EXPORT_RELEASE_APPROVE",
  );
  const canReviewExport =
    hasCultivationPermission(user?.role, "EXPORT_RELEASE_REVIEW") ||
    canApproveExport;
  const safeBatches = Array.isArray(batches) ? batches : [];
  const safeReleases = Array.isArray(releases) ? releases : [];
  const selectedRelease = safeReleases[0] ?? null;

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
      const [nextBatches, nextReleases] = await Promise.all([
        cultivationClient.listHarvestBatches().catch(() => []),
        cultivationClient.listExportReleases().catch(() => []),
      ]);
      const normalizedBatches = Array.isArray(nextBatches) ? nextBatches : [];
      const normalizedReleases = Array.isArray(nextReleases) ? nextReleases : [];
      setBatches(normalizedBatches);
      setReleases(normalizedReleases);
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
                công khai.
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
        <div className="panel p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-2">
            {cropLots.map((crop) => (
              <article
                key={crop.id}
                className="rounded-2xl border border-[#e2e7e0] p-5"
              >
                <div className="flex items-start justify-between gap-7">
                  <span>
                    <small className="text-xs font-bold tracking-[1px] text-[#849087]">
                      Mã vụ mùa
                    </small>
                    <b className="mt-1 block text-sm">{crop.id}</b>
                  </span>
                  <span className="rounded-full bg-[#e9f2ea] px-2.5 py-1 text-xs font-bold text-[#3e7353]">
                    {crop.status}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-4 rounded-xl bg-[#f7f8f5] p-4 text-xs">
                  <span>
                    <small className="block text-[#849087]">Giống</small>
                    <b className="mt-1 block">{crop.variety}</b>
                  </span>
                  <span>
                    <small className="block text-[#849087]">Phân khu</small>
                    <b className="mt-1 block">{crop.zone}</b>
                  </span>
                  <span>
                    <small className="block text-[#849087]">Thu hoạch</small>
                    <b className="mt-1 block">{crop.harvestAt}</b>
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCrop(crop)}
                  disabled={
                    !crop.status.includes("Sẵn sàng") &&
                    !crop.status.includes("Sẵn sàng")
                  }
                  className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-[#2E5A44] py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#abb6ae]"
                >
                  <QrCode size={15} /> Mở QR truy xuất
                </button>
              </article>
            ))}
          </div>
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
              batch.batchCode,
              batch.cultivationSeasonId,
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
                        submittedBy: actorId,
                      }),
                    "Đã tạo hồ sơ xuất xưởng.",
                  );
                }}
                className="mt-4 grid gap-3"
              >
                <Field label="Lô thu hoạch ID">
                  <input
                    required
                    className={inputClass}
                    value={releaseForm.harvestBatchId}
                    onChange={(e) =>
                      setReleaseForm({
                        ...releaseForm,
                        harvestBatchId: e.target.value,
                      })
                    }
                  />
                </Field>
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
                  <button
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
                  {canApproveExport ? (
                    <button
                      onClick={() =>
                        void mutate(
                          () =>
                            cultivationClient.approveExportRelease(
                              release.id,
                              actorId,
                            ),
                          "Đã phê duyệt.",
                        )
                      }
                      className="rounded-lg bg-[#2E5A44] px-2 py-1 font-bold text-white"
                    >
                      Duyệt
                    </button>
                  ) : null}
                  {canApproveExport ? (
                    <button
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
                    }, "Đã tải snapshot truy xuất.")
                  : undefined
              }
              className="rounded-xl bg-[#2E5A44] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Tải snapshot
            </button>
          </div>
          {snapshot ? (
            <pre className="max-h-[520px] overflow-auto rounded-2xl bg-neutral-950 p-4 text-xs leading-5 text-neutral-100 scrollbar-thin">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          ) : (
            <EmptyState
              title="Chưa tải snapshot"
              description="Chọn hồ sơ xuất xưởng đầu tiên trong danh sách hoặc tạo hồ sơ mới rồi tải snapshot."
            />
          )}
        </div>
      ) : null}

      {selectedCrop ? (
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
                onClick={() => setSelectedCrop(null)}
                className="grid size-9 place-items-center rounded-xl bg-[#f2f4f1]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mx-auto my-6 w-fit rounded-2xl border border-[#e3e8e1] bg-white p-5 shadow-sm">
              <QRCodeSVG
                value={`/traceability/${selectedCrop.id}`}
                size={190}
                fgColor="#244B37"
                level="H"
              />
            </div>
            <div className="rounded-xl bg-[#f7f8f5] p-5 text-center">
              <b className="text-sm">{selectedCrop.id}</b>
              <p className="mt-1 text-sm text-[#7d8981]">
                {selectedCrop.variety} - {selectedCrop.zone} -{" "}
                {selectedCrop.trees} cây
              </p>
            </div>
            <Link
              href={`/traceability/${selectedCrop.id}`}
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-[#EED56D] py-4 text-xs font-bold text-[#2E5A44]"
            >
              <ExternalLink size={15} /> Mở trang truy xuất công khai
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
