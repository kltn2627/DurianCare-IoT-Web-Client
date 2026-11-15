"use client";

import { useEffect, useId, useRef } from "react";
import { LoaderCircle } from "lucide-react";

/**
 * Modal confirmation used instead of window.confirm(). While `busy` the confirm button is disabled and
 * shows a spinner, so a second click cannot send the request twice; Escape / backdrop / "Hủy" cancel.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previousFocus.current?.focus?.();
  }, [open]);

  if (!open) return null;
  const confirmClass = tone === "danger"
    ? "bg-red-700 hover:bg-red-800 focus-visible:ring-red-200"
    : "bg-[#2E5A44] hover:bg-[#244a37] focus-visible:ring-[#2E5A4430]";
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
    onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}
    onKeyDown={event => { if (event.key === "Escape" && !busy) onCancel(); }}>
    <section role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
      className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
      <h2 id={titleId} className="text-base font-bold text-neutral-900">{title}</h2>
      <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-neutral-600">{description}</p>
      <div className="mt-5 flex justify-end gap-3">
        <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy}
          className="h-10 rounded-xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:opacity-50">
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} aria-busy={busy}
          className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}>
          {busy && <LoaderCircle size={14} className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </section>
  </div>;
}
