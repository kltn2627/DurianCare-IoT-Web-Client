"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Check,
  FileSearch,
  LoaderCircle,
  RefreshCcw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { authClient, ClientAuthError } from "@/lib/auth/client";
import type {
  EngineerApplicationDetail,
  EngineerApplicationSummary,
  ReviewEngineerApplicationRequest,
} from "@/lib/auth/types";
import { friendlyApiMessage } from "@/lib/feedback";

const statusFilters = [
  { value: "", label: "Tất cả" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" },
] as const;

export function AdminManagement() {
  const [applications, setApplications] = useState<EngineerApplicationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<EngineerApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  const selectedApplication = useMemo(
    () => applications.find((application) => application.applicationId === selectedId) ?? null,
    [applications, selectedId],
  );

  useEffect(() => {
    const loadApplications = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await authClient.listEngineerApplications(statusFilter || undefined);
        setApplications(response);
        setSelectedId((current) => response.some((item) => item.applicationId === current) ? current : response[0]?.applicationId ?? "");
      } catch (cause) {
        setError(
          friendlyApiMessage(
            cause instanceof ClientAuthError
              ? { status: cause.status, message: cause.message }
              : null,
            "auth",
            "Không thể tải danh sách hồ sơ kỹ sư.",
          ),
        );
      } finally {
        setLoading(false);
      }
    };

    void loadApplications();
  }, [statusFilter]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    const loadDetail = async () => {
      setDetailLoading(true);
      setError("");
      try {
        const response = await authClient.getEngineerApplication(selectedId);
        setDetail(response);
        setRejectionReason(response.rejectionReason ?? "");
      } catch (cause) {
        setError(
          friendlyApiMessage(
            cause instanceof ClientAuthError
              ? { status: cause.status, message: cause.message }
              : null,
            "auth",
            "Không thể tải chi tiết hồ sơ kỹ sư.",
          ),
        );
      } finally {
        setDetailLoading(false);
      }
    };

    void loadDetail();
  }, [selectedId]);

  const reload = async () => {
    setLoading(true);
    setDetailLoading(true);
    try {
      const response = await authClient.listEngineerApplications(statusFilter || undefined);
      setApplications(response);
      if (response.length === 0) {
        setSelectedId("");
        setDetail(null);
        return;
      }
      const nextSelected =
        response.find((item) => item.applicationId === selectedId)?.applicationId ??
        response[0].applicationId;
      setSelectedId(nextSelected);
    } finally {
      setLoading(false);
      setDetailLoading(false);
    }
  };

  const approve = async () => {
    if (!selectedId) return;
    setActionLoading("approve");
    setError("");
    try {
      await authClient.approveEngineerApplication(selectedId);
      setRejectionReason("");
      setDetail(null);
      await reload();
    } catch (cause) {
      setError(
        friendlyApiMessage(
          cause instanceof ClientAuthError
            ? { status: cause.status, message: cause.message }
            : null,
          "auth",
          "Không thể phê duyệt hồ sơ kỹ sư.",
        ),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async () => {
    if (!selectedId) return;
    setActionLoading("reject");
    setError("");
    try {
      const payload: ReviewEngineerApplicationRequest = rejectionReason.trim()
        ? { rejectionReason: rejectionReason.trim() }
        : {};
      await authClient.rejectEngineerApplication(selectedId, payload);
      setRejectionReason("");
      setDetail(null);
      await reload();
    } catch (cause) {
      setError(
        friendlyApiMessage(
          cause instanceof ClientAuthError
            ? { status: cause.status, message: cause.message }
            : null,
          "auth",
          "Không thể từ chối hồ sơ kỹ sư.",
        ),
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section id="engineer-approvals" className="panel scroll-mt-24 p-7 lg:p-8">
      <div className="flex items-center justify-between gap-5">
        <div className="flex items-center gap-6">
          <span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#795e11]">
            <FileSearch size={20} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold">Phê duyệt hồ sơ kỹ sư</h2>
            <p className="mt-1 text-[13px] text-[#7e8b83]">
              Duyệt thông tin chuyên môn, chứng chỉ đính kèm và quyết định phê duyệt/từ chối.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d8e1d8] px-4 py-2.5 text-[13px] font-bold text-neutral-700 transition hover:bg-[#f8fbf8]"
        >
          <RefreshCcw size={15} />
          Làm mới
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              statusFilter === filter.value
                ? "bg-[#2E5A44] text-white"
                : "border border-[#d8e1d8] bg-white text-neutral-700 hover:bg-[#f8fbf8]"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
        <div className="rounded-[24px] border border-[#e1e6df] bg-white p-4">
          <div className="flex items-center justify-between px-2 pb-4">
            <b className="text-sm text-[#203329]">Danh sách hồ sơ</b>
            <span className="text-xs text-neutral-500">{applications.length} hồ sơ</span>
          </div>

          <div className="max-h-[720px] space-y-3 overflow-auto pr-1">
            {loading ? (
              <LoadingState label="Đang tải danh sách hồ sơ..." />
            ) : applications.length === 0 ? (
              <EmptyState
                icon={<ShieldAlert size={18} />}
                title="Không có hồ sơ phù hợp"
                message="Không tìm thấy hồ sơ kỹ sư với bộ lọc hiện tại."
              />
            ) : (
              applications.map((application) => {
                const active = application.applicationId === selectedId;
                return (
                  <button
                    key={application.applicationId}
                    type="button"
                    onClick={() => setSelectedId(application.applicationId)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#b9cbbd] bg-[#f7faf7]"
                        : "border-[#e7ece6] bg-white hover:border-[#d0ddd2] hover:bg-[#fafdf9]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <b className="block text-sm text-[#203329]">{application.fullName}</b>
                        <small className="mt-1 block text-xs text-neutral-500">
                          {application.email}
                        </small>
                      </div>
                      <StatusBadge status={application.status} />
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-neutral-600">
                      <span>Chuyên môn: {application.specialization}</span>
                      <span>Nơi công tác: {application.workplace}</span>
                      <span>Kinh nghiệm: {application.yearsExperience} năm</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#e1e6df] bg-white p-5 lg:p-6">
          {!selectedApplication || detailLoading ? (
            <LoadingState label="Đang tải chi tiết hồ sơ..." />
          ) : detail ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-[#203329]">{detail.fullName}</h3>
                  <p className="mt-1 text-[13px] text-neutral-500">{detail.email}</p>
                </div>
                <StatusBadge status={detail.status} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard label="Nơi công tác" value={detail.workplace} />
                <InfoCard label="Chuyên môn" value={detail.specialization} />
                <InfoCard label="Kinh nghiệm" value={`${detail.yearsExperience} năm`} />
                <InfoCard label="Ngày nộp" value={formatDate(detail.createdAt)} />
              </div>

              <div className="rounded-2xl border border-[#e7ece6] bg-[#fafcf9] p-5">
                <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">
                  Giới thiệu chuyên môn
                </p>
                <p className="mt-3 text-sm leading-7 text-neutral-700">{detail.biography}</p>
              </div>

              <div className="rounded-2xl border border-[#e7ece6] bg-[#fafcf9] p-5">
                <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">
                  Tài liệu đính kèm
                </p>
                <div className="mt-4 space-y-3">
                  {detail.documents.length === 0 ? (
                    <p className="text-[13px] text-neutral-500">Chưa có tài liệu đính kèm.</p>
                  ) : (
                    detail.documents.map((document) => (
                      <a
                        key={document.documentId}
                        href={document.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[#e1e6df] bg-white px-4 py-3 transition hover:border-[#b9cbbd]"
                      >
                        <span className="min-w-0">
                          <b className="block truncate text-[13px] text-[#203329]">{document.fileName}</b>
                          <small className="mt-1 block text-xs text-neutral-500">
                            {document.contentType} • {(document.fileSize / (1024 * 1024)).toFixed(1)} MB
                          </small>
                        </span>
                        <BadgeCheck size={16} className="shrink-0 text-[#2E5A44]" />
                      </a>
                    ))
                  )}
                </div>
              </div>

              {detail.status === "REJECTED" ? (
                <div className="rounded-2xl border border-[#f2ddd6] bg-[#fff5f1] p-5">
                  <p className="text-xs font-bold uppercase tracking-[1.2px] text-[#9a5a46]">
                    Lý do từ chối
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[#8d5140]">
                    {detail.rejectionReason ?? "Chưa ghi nhận lý do."}
                  </p>
                </div>
              ) : null}

              {detail.status === "PENDING_REVIEW" ? (
                <div className="space-y-4 rounded-2xl border border-[#e7ece6] bg-white p-5">
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-neutral-700">
                      Ghi chú từ chối (không bắt buộc)
                    </span>
                    <textarea
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      rows={4}
                      maxLength={1000}
                      placeholder="Nhập lý do từ chối nếu cần..."
                      className="w-full rounded-2xl border border-[#dfe6df] px-4 py-3 text-[13px] outline-none transition focus:border-[#5d856c] focus:ring-4 focus:ring-[#e9f0ea]"
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void approve()}
                      disabled={actionLoading !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#254c39] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionLoading === "approve" ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      Phê duyệt
                    </button>
                    <button
                      type="button"
                      onClick={() => void reject()}
                      disabled={actionLoading !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e2cfc7] px-4 py-3 text-[13px] font-bold text-[#9a5a46] transition hover:bg-[#fff5f1] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionLoading === "reject" ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <X size={16} />
                      )}
                      Từ chối
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="text-xs text-neutral-500">
                <Link href="/dashboard/admin" className="font-bold text-[#2E5A44] hover:underline">
                  Quay lại bảng điều khiển
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Search size={18} />}
              title="Chưa chọn hồ sơ"
              message="Chọn một hồ sơ ở danh sách bên trái để xem chi tiết."
            />
          )}
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "APPROVED"
      ? "bg-[#e8f2ea] text-[#39704f]"
      : status === "REJECTED"
        ? "bg-[#f7e9e4] text-[#94523d]"
        : "bg-[#fbf1ca] text-[#7c6116]";
  return (
    <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${tone}`}>
      {status === "APPROVED"
        ? "Đã duyệt"
        : status === "REJECTED"
          ? "Đã từ chối"
          : "Chờ duyệt"}
    </span>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e7ece6] bg-white px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-[1.2px] text-neutral-400">{label}</p>
      <b className="mt-2 block text-sm text-[#203329]">{value}</b>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[#dfe6df] bg-[#fafcf9] px-4 py-10 text-center text-[13px] text-neutral-500">
      <LoaderCircle size={18} className="mr-2 animate-spin text-[#2E5A44]" />
      {label}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#dfe6df] bg-[#fafcf9] px-4 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-[#edf3ee] text-[#2E5A44]">
        {icon}
      </span>
      <b className="mt-4 text-sm text-[#203329]">{title}</b>
      <p className="mt-2 max-w-sm text-[13px] leading-6 text-neutral-500">{message}</p>
    </div>
  );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
