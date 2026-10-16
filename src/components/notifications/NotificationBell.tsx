"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Bell, CheckCheck, LoaderCircle, RefreshCw, X } from "lucide-react";
import { notificationClient, NotificationApiError } from "@/lib/notification/client";
import type { NotificationItem } from "@/lib/notification/types";
import { friendlyApiMessage } from "@/lib/feedback";
import { Toast } from "@/components/feedback/Toast";

export function NotificationBell({ count }: { count: number | null }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    notificationClient.list({ size: 5 }).then(result => { if (active) setItems(result.notifications); })
      .catch(cause => { if (active) setError(friendlyApiMessage(cause instanceof NotificationApiError ? cause : null, "notification", "Không thể tải thông báo.")); })
      .finally(() => { if (active) setLoading(false); });
    const closeOutside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const refresh = () => setRevision(value => value + 1);
    document.addEventListener("mousedown", closeOutside);
    window.addEventListener("duriancare:notifications-changed", refresh);
    return () => {
      active = false;
      document.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("duriancare:notifications-changed", refresh);
    };
  }, [open, revision]);

  async function markAll() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await notificationClient.markAllRead();
      setToast(result.updatedCount ? `Đã đọc ${result.updatedCount} thông báo.` : "Không còn thông báo chưa đọc.");
    } catch (cause) {
      setError(friendlyApiMessage(cause instanceof NotificationApiError ? cause : null, "notification", "Không thể cập nhật thông báo."));
    } finally { setBusy(false); }
  }

  return <div ref={root} className="relative" onKeyDown={event => {
    if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} type="button" aria-label="Thông báo" title="Thông báo" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} className="relative grid size-11 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 lg:size-14">
      <Bell size={23} />
      {count != null && count > 0 && <span className="absolute right-1 top-1 min-w-5 rounded-full bg-red-600 px-1 text-xs font-bold text-white">{count > 99 ? "99+" : count}</span>}
    </button>
    {open && <section id={panelId} aria-label="Thông báo gần đây" className="fixed left-3 right-3 top-20 z-50 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h2 className="text-base font-bold">Thông báo</h2>
        <button type="button" title="Đóng" aria-label="Đóng bảng thông báo" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="rounded p-2 hover:bg-neutral-100"><X size={16} /></button>
      </div>
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
        <span className="text-xs text-neutral-600">{count == null ? "" : `${count} chưa đọc`}</span>
        <button type="button" onClick={() => void markAll()} disabled={busy || count === 0 || loading} className="inline-flex items-center gap-2 rounded px-2 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-40"><CheckCheck size={16} />Đánh dấu tất cả đã đọc</button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading ? <div className="flex items-center gap-2 p-5 text-sm text-neutral-500"><LoaderCircle size={16} className="animate-spin" />Đang tải…</div> : error ? <div role="alert" className="p-4 text-sm text-red-700">{error}<button type="button" onClick={() => setRevision(value => value + 1)} className="mt-2 flex items-center gap-2 rounded border px-3 py-2"><RefreshCw size={14} />Thử lại</button></div> : items.length ? items.map(item => <Link key={item.id} href="/notifications" onClick={() => setOpen(false)} className={`block border-b border-neutral-100 px-4 py-3 hover:bg-neutral-50 ${item.isRead ? "" : "bg-emerald-50"}`}>
          <div className="flex items-start gap-2"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.isRead ? "bg-neutral-300" : "bg-emerald-600"}`} /><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{item.title}</h3><p className="mt-1 line-clamp-2 text-xs text-neutral-600">{item.message}</p><time dateTime={item.createdAt} className="mt-1 block text-xs text-neutral-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</time></div></div>
        </Link>) : <p className="p-6 text-center text-sm text-neutral-500">Chưa có thông báo.</p>}
      </div>
      <Link href="/notifications" onClick={() => setOpen(false)} className="block px-4 py-3 text-center text-sm font-semibold text-emerald-800 hover:bg-neutral-50">Xem tất cả</Link>
    </section>}
    {toast && <Toast message={toast} onClose={() => setToast(null)} />}
  </div>;
}
