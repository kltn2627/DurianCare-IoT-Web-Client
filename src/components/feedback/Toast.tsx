"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  return <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900 shadow-lg motion-safe:animate-in">
    <CheckCircle2 size={18} className="shrink-0" /><span>{message}</span>
    <button type="button" onClick={onClose} aria-label="Đóng thông báo" title="Đóng" className="shrink-0 rounded p-1 focus-visible:ring-2"><X size={16} /></button>
  </div>;
}
