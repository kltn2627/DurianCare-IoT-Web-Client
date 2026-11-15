"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export type ToastTone = "success" | "error";

export function Toast({ message, onClose, tone = "success" }: { message: string; onClose: () => void; tone?: ToastTone }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, tone === "error" ? 7000 : 5000);
    return () => window.clearTimeout(timer);
  }, [message, onClose, tone]);
  const error = tone === "error";
  return <div role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"} className={`fixed bottom-5 right-5 z-[60] flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg motion-safe:animate-in ${error ? "border-red-200 text-red-800" : "border-emerald-200 text-emerald-900"}`}>
    {error ? <AlertCircle size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}<span>{message}</span>
    <button type="button" onClick={onClose} aria-label="Đóng thông báo" title="Đóng" className="shrink-0 rounded p-1 focus-visible:ring-2"><X size={16} /></button>
  </div>;
}
