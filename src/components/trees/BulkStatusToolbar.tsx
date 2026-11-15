"use client";

import { CheckCircle2, Loader2, X } from "lucide-react";
import { BULK_STATUS_TARGETS, bulkConfirmMessage, bulkTargetLabel } from "@/lib/trees/bulkStatus";
import type { ManualTreeHealthStatus } from "@/lib/trees/types";

export type BulkNotice = { tone: "success" | "partial" | "error"; message: string } | null;

interface Props {
  target: ManualTreeHealthStatus;
  selectedCount: number;
  confirming: boolean;
  submitting: boolean;
  notice: BulkNotice;
  onTargetChange: (target: ManualTreeHealthStatus) => void;
  onClearSelection: () => void;
  onCancel: () => void;
  onRequestConfirm: () => void;
  onBackFromConfirm: () => void;
  onConfirm: () => void;
  /** Eligible trees among those currently shown by the map filter. */
  selectableVisibleCount: number;
  onSelectAllVisible: () => void;
}

const NOTICE_STYLES = {
  success: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-900",
  error: "bg-red-100 text-red-800",
} as const;

export function BulkStatusToolbar({
  target, selectedCount, confirming, submitting, notice,
  onTargetChange, onClearSelection, onCancel, onRequestConfirm, onBackFromConfirm, onConfirm,
  selectableVisibleCount, onSelectAllVisible,
}: Props) {
  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-[#2563eb]/30 bg-[#eff6ff] p-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-extrabold text-neutral-800">Đổi sang trạng thái:</span>
        {BULK_STATUS_TARGETS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={submitting || confirming}
            onClick={() => onTargetChange(option.value)}
            aria-pressed={target === option.value}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${
              target === option.value
                ? "bg-[#2563eb] text-white"
                : "border border-[#2563eb]/40 bg-white text-[#1d4ed8] hover:bg-[#dbeafe]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#2563eb]/40 bg-white p-3">
          <span className="text-sm font-extrabold text-neutral-900">
            {bulkConfirmMessage(selectedCount, target)}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onBackFromConfirm}
              disabled={submitting}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
            >
              Quay lại
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {submitting ? "Đang cập nhật..." : "Xác nhận đổi"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold text-[#1d4ed8]">
            Đã chọn {selectedCount} cây → {bulkTargetLabel(target)}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onSelectAllVisible}
              disabled={selectableVisibleCount === 0}
              className="rounded-xl border border-[#2563eb]/40 bg-white px-3 py-1.5 text-xs font-bold text-[#1d4ed8] hover:bg-[#dbeafe] disabled:opacity-50"
            >
              Chọn tất cả cây hợp lệ đang hiển thị ({selectableVisibleCount})
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              disabled={selectedCount === 0}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Bỏ chọn
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
            >
              <X size={13} /> Hủy
            </button>
            <button
              type="button"
              onClick={onRequestConfirm}
              disabled={selectedCount === 0}
              className="rounded-xl bg-[#2E5A44] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#25493a] disabled:opacity-50"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}

      {notice ? (
        <div role={notice.tone === "error" ? "alert" : "status"}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${NOTICE_STYLES[notice.tone]}`}>
          {notice.message}
        </div>
      ) : null}
    </div>
  );
}
