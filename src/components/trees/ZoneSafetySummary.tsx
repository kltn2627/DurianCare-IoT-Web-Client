"use client";

import type { ZoneSafetySummary } from "@/lib/trees/types";

interface Props {
  summary: ZoneSafetySummary;
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-4">
      <span className="text-2xl font-extrabold" style={{ color }}>
        {value}
      </span>
      <span className="mt-1 text-center text-xs font-semibold text-neutral-500">{label}</span>
    </div>
  );
}

export function ZoneSafetySummaryCard({ summary }: Props) {
  const ratePercent =
    summary.safetyRate != null ? Math.round(summary.safetyRate) : null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-wide text-neutral-500">
            TỔNG QUAN AN TOÀN VÙNG TRỒNG
          </p>
          <h3 className="mt-0.5 text-base font-extrabold text-neutral-900">
            {summary.zoneName}
          </h3>
        </div>
        {ratePercent != null ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl px-5 py-3"
            style={{
              background:
                ratePercent >= 80
                  ? "#dcfce7"
                  : ratePercent >= 50
                    ? "#fef9c3"
                    : "#fee2e2",
            }}
          >
            <span
              className="text-3xl font-extrabold"
              style={{
                color:
                  ratePercent >= 80
                    ? "#16a34a"
                    : ratePercent >= 50
                      ? "#ca8a04"
                      : "#dc2626",
              }}
            >
              {ratePercent}%
            </span>
            <span className="text-xs font-semibold text-neutral-600">
              An toàn
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-neutral-100 px-5 py-3">
            <span className="text-sm font-bold text-neutral-400">N/A</span>
            <span className="text-xs font-semibold text-neutral-400">
              Chưa đánh giá
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Tổng cây" value={summary.totalTrees} color="#374151" />
        <Stat label="Đã đánh giá" value={summary.assessedTrees} color="#6366f1" />
        <Stat label="Khỏe mạnh" value={summary.safeTrees} color="#16a34a" />
        <Stat label="Cần chú ý" value={summary.attentionTrees} color="#dc2626" />
        <Stat label="Chưa đánh giá" value={summary.notAssessedTrees} color="#9ca3af" />
      </div>

      <p className="text-xs text-neutral-500">{summary.safetyRateLabel}</p>
    </div>
  );
}
