"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, RefreshCw } from "lucide-react";
import { treeClient, TreeApiError } from "@/lib/trees/client";
import type { TreeSummary, ZoneDetail, ZoneSafetySummary } from "@/lib/trees/types";
import { TreeMapCanvas } from "./TreeMapCanvas";
import { ZoneSafetySummaryCard } from "./ZoneSafetySummary";
import { TreeDetailPanel } from "./TreeDetailPanel";

const HEALTH_LABELS: Record<string, string> = {
  HEALTHY: "Khỏe mạnh",
  DISEASED: "Bệnh",
  TREATING: "Điều trị",
  SUSPECTED: "Nghi ngờ",
};

const HEALTH_BADGE: Record<string, string> = {
  HEALTHY: "bg-green-100 text-green-800",
  DISEASED: "bg-red-100 text-red-800",
  TREATING: "bg-orange-100 text-orange-800",
  SUSPECTED: "bg-orange-100 text-orange-800",
};

interface Props {
  farmId: string;
  zoneId: string;
}

export function ZoneTreesWorkspace({ farmId, zoneId }: Props) {
  const [zone, setZone] = useState<ZoneDetail | null>(null);
  const [trees, setTrees] = useState<TreeSummary[]>([]);
  const [safety, setSafety] = useState<ZoneSafetySummary | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      treeClient.getZone(zoneId),
      treeClient.listTrees(zoneId),
      treeClient.getZoneSafety(zoneId).catch(() => null),
    ])
      .then(([zoneData, treeData, safetyData]) => {
        if (!active) return;
        setZone(zoneData);
        setTrees(treeData);
        if (safetyData) setSafety(safetyData);
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
            </div>
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
