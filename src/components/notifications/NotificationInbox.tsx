"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Clock3,
  Filter,
  Inbox,
  LoaderCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { friendlyApiMessage } from "@/lib/feedback";
import { Toast, type ToastTone } from "@/components/feedback/Toast";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { notificationSource, notificationTypeLabel } from "@/lib/notification/presentation";
import { notificationTargetUrl } from "@/lib/notification/target";
import { notificationClient, NotificationApiError } from "@/lib/notification/client";
import type {
  NotificationItem,
  NotificationPageResponse,
  NotificationSortBy,
  NotificationSortDirection,
} from "@/lib/notification/types";

type ViewMode = "ALL" | "UNREAD";

const SORT_OPTIONS: Array<{
  label: string;
  sortBy: NotificationSortBy;
  sortDirection: NotificationSortDirection;
}> = [
  { label: "Mới nhất", sortBy: "createdAt", sortDirection: "desc" },
  { label: "Cũ nhất", sortBy: "createdAt", sortDirection: "asc" },
  { label: "Tiêu đề A-Z", sortBy: "title", sortDirection: "asc" },
  { label: "Tiêu đề Z-A", sortBy: "title", sortDirection: "desc" },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function notificationTone(type: string) {
  const normalized = type.toUpperCase();
  if (normalized.includes("ALERT")) return "bg-red-50 text-red-700";
  if (normalized.includes("SYSTEM")) return "bg-amber-50 text-amber-700";
  if (normalized.includes("AI")) return "bg-[#edf3ee] text-[#2E5A44]";
  return "bg-neutral-100 text-neutral-600";
}

function NotificationSkeleton() {
  return (
    <article className="animate-pulse rounded-[22px] border border-neutral-100 bg-white p-4">
      <div className="flex items-start gap-4">
        <div className="mt-1 size-10 rounded-xl bg-neutral-200" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-4 w-36 rounded-full bg-neutral-200" />
            <div className="h-4 w-20 rounded-full bg-neutral-200" />
          </div>
          <div className="h-3 w-full rounded-full bg-neutral-200" />
          <div className="h-3 w-5/6 rounded-full bg-neutral-200" />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-neutral-100 pt-4">
        <div className="h-10 w-28 rounded-xl bg-neutral-100" />
        <div className="h-10 w-20 rounded-xl bg-neutral-100" />
      </div>
    </article>
  );
}

function NotificationCard({
  item,
  onMarkRead,
  onOpen,
  onDelete,
  busy,
}: {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  onOpen: (item: NotificationItem) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const targetUrl = notificationTargetUrl(item);
  const source = notificationSource(item);

  return (
    <article
      className={`rounded-[22px] border p-4 transition-all duration-200 ${
        item.isRead ? "border-neutral-100 bg-white" : "border-[#dbe8de] bg-[#f8fbf7]"
      }`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`mt-1 grid size-10 shrink-0 place-items-center rounded-xl ${
            item.isRead ? "bg-neutral-100 text-neutral-500" : "bg-[#2E5A44] text-[#EED56D]"
          }`}
        >
          <Bell size={18} />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight text-neutral-900">
              {item.title}
            </h3>
            {!item.isRead ? (
              <span className="rounded-full bg-[#eed56d] px-2 py-1 text-xs font-bold text-[#2E5A44]">
                Chưa đọc
              </span>
            ) : null}
            <span
              className={`rounded-full px-2 py-1 text-xs font-bold ${notificationTone(
                item.type,
              )}`}
            >
              {notificationTypeLabel(item.type)}
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-neutral-600">{item.message}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={12} />
              {formatDate(item.createdAt)}
            </span>
            {source ? (
              <span className="inline-flex items-center gap-1">
                <Inbox size={12} />
                {source}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 pt-4">
        {targetUrl ? (
          <button
            type="button"
            onClick={() => onOpen(item)}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <ExternalLink size={14} />}
            Mở
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onMarkRead(item.id)}
          disabled={busy || item.isRead}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-xs font-semibold text-neutral-700 transition-all duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
          {item.isRead ? "Đã đọc" : "Đánh dấu đã đọc"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-100 px-4 text-xs font-semibold text-red-700 transition-all duration-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Xoá
        </button>
      </div>
    </article>
  );
}

export function NotificationInbox() {
  const router = useRouter();
  const [mode, setMode] = useState<ViewMode>("UNREAD");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState<NotificationSortBy>("createdAt");
  const [sortDirection, setSortDirection] =
    useState<NotificationSortDirection>("desc");
  const [data, setData] = useState<NotificationPageResponse | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [confirmMarkAll, setConfirmMarkAll] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInbox() {
      try {
        const [pageResult, countResult] = await Promise.all([
          mode === "UNREAD"
            ? notificationClient.unread({ page, size, sortBy, sortDirection })
            : notificationClient.list({ page, size, sortBy, sortDirection }),
          notificationClient.count(),
        ]);

        if (!active) return;
        setData(pageResult);
        setUnreadCount(countResult.count);
        setError(null);
      } catch (cause) {
        if (!active) return;
        setData(null);
        setError(
          friendlyApiMessage(
            cause instanceof NotificationApiError
              ? { status: cause.status, message: cause.message }
              : null,
            "notification",
            "Không thể tải hộp thư thông báo.",
          ),
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    setLoading(true);
    void loadInbox();

    return () => {
      active = false;
    };
  }, [mode, page, size, sortBy, sortDirection, refreshSeed]);

  const totalLabel = useMemo(() => {
    if (!data) return "0 thông báo";
    return `${data.totalElements.toLocaleString("vi-VN")} thông báo`;
  }, [data]);

  const pageWindow = useMemo(() => {
    if (!data) return [];
    if (data.totalPages <= 7) {
      return Array.from({ length: data.totalPages }, (_, index) => index);
    }
    const start = Math.max(0, Math.min(data.page - 2, data.totalPages - 5));
    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [data]);

  const refresh = () => {
    setRefreshSeed((current) => current + 1);
  };

  const changeMode = (nextMode: ViewMode) => {
    setPage(0);
    setMode(nextMode);
  };

  // Action failures keep the list on screen and explain the problem in an error toast.
  const actionFailed = (cause: unknown, fallback: string) => {
    setToast({
      tone: "error",
      message: friendlyApiMessage(
        cause instanceof NotificationApiError
          ? { status: cause.status, message: cause.message }
          : null,
        "notification",
        fallback,
      ),
    });
  };

  const markRead = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await notificationClient.markRead(id);
      setToast({ tone: "success", message: "Đã đánh dấu thông báo là đã đọc." });
      refresh();
    } catch (cause) {
      actionFailed(cause, "Không thể cập nhật thông báo. Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  };

  const openNotification = async (item: NotificationItem) => {
    const targetUrl = notificationTargetUrl(item);
    if (!targetUrl || busyId) return;
    setBusyId(item.id);
    try {
      if (!item.isRead) {
        await notificationClient.markRead(item.id);
      }
      router.push(targetUrl);
    } catch (cause) {
      actionFailed(cause, "Không thể mở thông báo. Vui lòng thử lại.");
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    if (busyId) return;
    setBusyId("__all__");
    try {
      const result = await notificationClient.markAllRead();
      setToast({
        tone: "success",
        message: result.updatedCount > 0
          ? "Đã đánh dấu tất cả thông báo là đã đọc."
          : "Không còn thông báo chưa đọc.",
      });
      setConfirmMarkAll(false);
      setPage(0);
      refresh();
    } catch (cause) {
      setConfirmMarkAll(false);
      actionFailed(cause, "Không thể cập nhật thông báo. Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  };

  const removeNotification = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await notificationClient.delete(id);
      setToast({ tone: "success", message: "Đã xóa thông báo." });
      setPendingDelete(null);
      setPage(0);
      refresh();
    } catch (cause) {
      setPendingDelete(null);
      actionFailed(cause, "Không thể xóa thông báo. Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Xóa thông báo này?"
        description="Thông báo sẽ được xóa khỏi hộp thư của bạn và không thể khôi phục."
        confirmLabel="Xóa"
        tone="danger"
        busy={pendingDelete !== null && busyId === pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => { if (pendingDelete) void removeNotification(pendingDelete); }}
      />
      <ConfirmDialog
        open={confirmMarkAll}
        title="Xác nhận đánh dấu tất cả đã đọc"
        description="Bạn có chắc muốn đánh dấu toàn bộ thông báo là đã đọc không?"
        busy={busyId === "__all__"}
        onCancel={() => setConfirmMarkAll(false)}
        onConfirm={() => void markAllRead()}
      />
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 py-4">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-neutral-900"><Bell size={24} />Thông báo</h1>
        <span className="text-sm text-neutral-600">{loading ? "Đang tải…" : `${unreadCount} chưa đọc`}</span>
      </section>

      <section className="space-y-5">
        <div className="space-y-5">
          <div className="panel overflow-hidden p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-2xl bg-neutral-100 p-1">
                {(["UNREAD", "ALL"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => changeMode(item)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                      mode === item
                        ? "bg-white text-[#2E5A44] shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    {item === "UNREAD" ? "Chưa đọc" : "Tất cả"}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2">
                  <Filter size={14} className="text-[#2E5A44]" />
                  <select
                    value={`${sortBy}:${sortDirection}`}
                    onChange={(event) => {
                      const [nextSortBy, nextSortDirection] = event.target.value.split(
                        ":",
                      ) as [NotificationSortBy, NotificationSortDirection];
                      setPage(0);
                      setSortBy(nextSortBy);
                      setSortDirection(nextSortDirection);
                    }}
                    className="bg-transparent text-xs font-semibold text-neutral-700 outline-none"
                  >
                    {SORT_OPTIONS.map((option) => {
                      const key = `${option.sortBy}:${option.sortDirection}` as const;
                      return (
                        <option key={key} value={key}>
                          {option.label}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2">
                  <Search size={14} className="text-[#2E5A44]" />
                  <select
                    value={size}
                    onChange={(event) => {
                      setPage(0);
                      setSize(Number(event.target.value));
                    }}
                    className="bg-transparent text-xs font-semibold text-neutral-700 outline-none"
                  >
                    {[10, 20, 50, 100].map((value) => (
                      <option key={value} value={value}>
                        {value}/trang
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
              <p className="text-xs leading-relaxed text-neutral-500">
                {loading ? "Đang tải hộp thư…" : totalLabel}
              </p>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-xs font-semibold text-neutral-700 transition-all duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : undefined} />
                Làm mới
              </button>
            </div>
          </div>

          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6f7f74]">
                  Danh sách thông báo
                </p>
                <h2 className="mt-1 text-lg font-extrabold tracking-tight text-neutral-900">
                  {loading ? "Đang tải..." : totalLabel}
                </h2>
              </div>
              {mode === "UNREAD" ? (
                <button
                  type="button"
                  onClick={() => setConfirmMarkAll(true)}
                  disabled={busyId !== null || unreadCount === 0 || loading}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-xs font-bold text-white transition-all duration-200 hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
                >
                  {busyId === "__all__" ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <CheckCheck size={14} />
                  )}
                  Đánh dấu tất cả đã đọc
                </button>
              ) : null}
            </div>

            {error ? (
              <div className="px-5 py-10 sm:px-6">
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-[13px] leading-relaxed text-red-700">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={refresh}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    <RefreshCw size={14} />
                    Thử lại
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="space-y-3 px-4 py-4 sm:px-5">
                {Array.from({ length: 4 }, (_, index) => (
                  <NotificationSkeleton key={index} />
                ))}
                <div className="flex items-center justify-center gap-3 py-2 text-[#2E5A44]">
                  <LoaderCircle size={18} className="animate-spin" />
                  <span className="text-[13px] font-semibold">Đang tải hộp thư...</span>
                </div>
              </div>
            ) : data && data.notifications.length > 0 ? (
              <div className="space-y-3 p-4 sm:p-5">
                {data.notifications.map((item) => (
                  <NotificationCard
                    key={item.id}
                    item={item}
                    busy={busyId !== null}
                    onMarkRead={markRead}
                    onOpen={openNotification}
                    onDelete={setPendingDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="grid min-h-[340px] place-items-center px-5 py-10 text-center sm:px-6">
                <span>
                  <Inbox className="mx-auto text-neutral-300" size={32} />
                  <b className="mt-4 block text-[13px] text-neutral-800">
                    {mode === "UNREAD"
                      ? "Không còn thông báo chưa đọc"
                      : "Chưa có thông báo nào"}
                  </b>
                </span>
              </div>
            )}

            {data && data.totalPages > 0 ? (
              <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-xs text-neutral-500">
                  Trang {data.page + 1} / {data.totalPages} • {data.numberOfElements} mục
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!data.hasPrevious}
                    onClick={() => {
                      setPage((current) => Math.max(0, current - 1));
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-xs font-semibold text-neutral-700 transition-all duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft size={14} />
                    Trước
                  </button>

                  {pageWindow.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4418] ${
                        item === data.page
                          ? "bg-[#2E5A44] text-white"
                          : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      {item + 1}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={!data.hasNext}
                    onClick={() => {
                      setPage((current) => Math.min(data.totalPages - 1, current + 1));
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-xs font-semibold text-neutral-700 transition-all duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sau
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>

      </section>
    </div>
  );
}
