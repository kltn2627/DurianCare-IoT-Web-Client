"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { knowledgeClient, KnowledgeApiError } from "@/lib/knowledge/client";
import type {
  KnowledgeArticle,
  KnowledgeArticlePage,
  KnowledgeStatus,
} from "@/lib/knowledge/types";

const PAGE_SIZE = 10;
const FALLBACK_COVER_IMAGE = "/mock/knowledge-nutrition.svg";

type ReviewTab = "REVIEW" | "PUBLISHED" | "REJECTED" | "ALL";
type DialogState =
  | { type: "preview"; article: KnowledgeArticle }
  | { type: "approve"; article: KnowledgeArticle }
  | { type: "reject"; article: KnowledgeArticle }
  | null;

const EMPTY_PAGE: KnowledgeArticlePage = {
  articles: [],
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size: PAGE_SIZE,
};

const tabs: Array<{ value: ReviewTab; label: string; status?: KnowledgeStatus }> = [
  { value: "REVIEW", label: "Chờ duyệt", status: "REVIEW" },
  { value: "PUBLISHED", label: "Đã duyệt", status: "PUBLISHED" },
  { value: "REJECTED", label: "Từ chối", status: "REJECTED" },
  { value: "ALL", label: "Tất cả" },
];

const statusMeta: Record<KnowledgeStatus, { label: string; className: string }> = {
  DRAFT: { label: "Bản nháp", className: "bg-neutral-100 text-neutral-700 ring-neutral-200" },
  REVIEW: { label: "Chờ duyệt", className: "bg-amber-50 text-amber-700 ring-amber-100" },
  PUBLISHED: { label: "Đã duyệt", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  REJECTED: { label: "Từ chối", className: "bg-red-50 text-red-700 ring-red-100" },
};

function formatDate(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString("vi-VN");
  }
  return value;
}

function authorRoleLabel(role?: string | null) {
  if (role === "ADMIN") return "Quản trị viên";
  if (role === "ENGINEER") return "Kỹ sư";
  if (role === "EXPERT") return "Chuyên gia";
  if (role === "FARMER" || role === "OWNER") return "Chủ vườn";
  return "Tác giả";
}

function StatusBadge({ status }: { status: KnowledgeStatus }) {
  const meta = statusMeta[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function SummaryCard({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dde7de] bg-white p-4 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </p>
      <strong className={`mt-3 block text-3xl font-extrabold ${tone}`}>
        {count.toLocaleString("vi-VN")}
      </strong>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
      ))}
    </div>
  );
}

function ArticleIdentity({ article }: { article: KnowledgeArticle }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        role="img"
        aria-label={`Ảnh bìa ${article.title}`}
        className="size-16 shrink-0 rounded-xl bg-[#e9efe8] bg-cover bg-center"
        style={{
          backgroundImage: `url(${article.coverImage || FALLBACK_COVER_IMAGE})`,
        }}
      />
      <span className="min-w-0">
        <b className="line-clamp-2 text-sm font-extrabold text-neutral-950">
          {article.title}
        </b>
        <small className="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-neutral-500">
          {article.excerpt}
        </small>
      </span>
    </div>
  );
}

function ActionButtons({
  article,
  busy,
  onOpen,
}: {
  article: KnowledgeArticle;
  busy: boolean;
  onOpen: (dialog: DialogState) => void;
}) {
  if (article.status === "REVIEW") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOpen({ type: "preview", article })}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 text-xs font-extrabold text-neutral-700 hover:bg-neutral-50"
        >
          <Eye size={13} />
          Xem
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onOpen({ type: "approve", article })}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#2E5A44] px-3 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check size={13} />
          Duyệt
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onOpen({ type: "reject", article })}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-red-50 px-3 text-xs font-extrabold text-red-700 ring-1 ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X size={13} />
          Từ chối
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen({ type: "preview", article })}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 text-xs font-extrabold text-neutral-700 hover:bg-neutral-50"
    >
      <Eye size={13} />
      {article.status === "PUBLISHED" ? "Xem bài" : "Xem"}
    </button>
  );
}

function EmptyState({ tab }: { tab: ReviewTab }) {
  return (
    <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-neutral-200 bg-[#fbfcfa] p-8 text-center">
      <span>
        <FileText className="mx-auto text-neutral-300" size={34} />
        <b className="mt-4 block text-sm text-neutral-800">
          {tab === "REVIEW" ? "Không có bài viết chờ duyệt" : "Không có bài viết phù hợp"}
        </b>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          {tab === "REVIEW"
            ? "Các bài được kỹ sư gửi duyệt sẽ xuất hiện tại đây."
            : "Hãy thử tab, từ khóa hoặc trang khác."}
        </p>
      </span>
    </div>
  );
}

function PreviewDialog({
  article,
  onClose,
}: {
  article: KnowledgeArticle;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-3">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 p-4 sm:p-5">
          <span className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2E5A44]">
              {article.category}
            </p>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-neutral-950 sm:text-2xl">
              {article.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {article.excerpt}
            </p>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-neutral-200 text-neutral-500"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-128px)] overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <article className="min-w-0">
              <div
                role="img"
                aria-label={`Ảnh bìa ${article.title}`}
                className="aspect-[16/9] rounded-2xl bg-[#e9efe8] bg-cover bg-center"
                style={{
                  backgroundImage: `url(${article.coverImage || FALLBACK_COVER_IMAGE})`,
                }}
              />
              <div className="prose prose-sm mt-5 max-w-none whitespace-pre-wrap leading-7 text-neutral-800">
                {article.content}
              </div>
            </article>
            <aside className="space-y-3 rounded-2xl border border-[#dde7de] bg-[#f7faf7] p-4 text-sm">
              <StatusBadge status={article.status} />
              <dl className="space-y-3 text-neutral-600">
                <div>
                  <dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-neutral-400">Tác giả</dt>
                  <dd className="mt-1 font-bold text-neutral-900">{article.author}</dd>
                  <dd className="text-xs font-semibold text-neutral-500">{authorRoleLabel(article.authorRole)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-neutral-400">Ngày gửi</dt>
                  <dd className="mt-1 font-semibold">{formatDate(article.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-neutral-400">Cập nhật</dt>
                  <dd className="mt-1 font-semibold">{formatDate(article.updatedAt)}</dd>
                </div>
                {article.reviewedAt && (
                  <div>
                    <dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-neutral-400">Đã xử lý</dt>
                    <dd className="mt-1 font-semibold">{formatDate(article.reviewedAt)}</dd>
                  </div>
                )}
                {article.rejectionReason && (
                  <div className="rounded-xl bg-red-50 p-3 text-red-700">
                    <dt className="text-xs font-extrabold uppercase tracking-[0.12em]">Lý do từ chối</dt>
                    <dd className="mt-1 font-semibold leading-relaxed">{article.rejectionReason}</dd>
                  </div>
                )}
              </dl>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

export function KnowledgeReviewWorkspace() {
  const [tab, setTab] = useState<ReviewTab>("REVIEW");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [articlePage, setArticlePage] = useState<KnowledgeArticlePage>(EMPTY_PAGE);
  const [counts, setCounts] = useState<Record<ReviewTab, number>>({
    REVIEW: 0,
    PUBLISHED: 0,
    REJECTED: 0,
    ALL: 0,
  });
  const [loading, setLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const activeStatus = tabs.find((item) => item.value === tab)?.status;

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await knowledgeClient.listAdmin({
        status: activeStatus,
        search,
        page,
        size: PAGE_SIZE,
        sort: "updatedAt,desc",
      });
      setArticlePage(result);
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : "Không thể tải danh sách bài viết.",
      );
      setArticlePage(EMPTY_PAGE);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, page, search]);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const [review, published, rejected, all] = await Promise.all([
        knowledgeClient.listAdmin({ status: "REVIEW", page: 0, size: 1 }),
        knowledgeClient.listAdmin({ status: "PUBLISHED", page: 0, size: 1 }),
        knowledgeClient.listAdmin({ status: "REJECTED", page: 0, size: 1 }),
        knowledgeClient.listAdmin({ page: 0, size: 1 }),
      ]);
      setCounts({
        REVIEW: review.totalElements,
        PUBLISHED: published.totalElements,
        REJECTED: rejected.totalElements,
        ALL: all.totalElements,
      });
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const openDialog = (state: DialogState) => {
    setActionError(null);
    setRejectReason("");
    setDialog(state);
  };

  const refreshAfterAction = async () => {
    await Promise.all([loadArticles(), loadCounts()]);
  };

  const approveArticle = async (article: KnowledgeArticle) => {
    setActionBusy(true);
    setActionError(null);
    try {
      await knowledgeClient.approve(article.id);
      setDialog(null);
      setNotice("Bài viết đã được duyệt và xuất bản.");
      await refreshAfterAction();
    } catch (exception) {
      setActionError(
        exception instanceof KnowledgeApiError && exception.status === 400
          ? "Bài viết không còn ở trạng thái chờ duyệt. Danh sách sẽ được cập nhật lại."
          : exception instanceof Error
            ? exception.message
            : "Không thể duyệt bài viết.",
      );
      await refreshAfterAction();
    } finally {
      setActionBusy(false);
    }
  };

  const rejectArticle = async (article: KnowledgeArticle) => {
    const reason = rejectReason.trim();
    if (!reason) {
      setActionError("Vui lòng nhập lý do từ chối.");
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      await knowledgeClient.reject(article.id, reason);
      setDialog(null);
      setNotice("Bài viết đã bị từ chối và lý do đã được lưu.");
      await refreshAfterAction();
    } catch (exception) {
      setActionError(
        exception instanceof KnowledgeApiError && exception.status === 400
          ? "Bài viết không còn ở trạng thái chờ duyệt. Danh sách sẽ được cập nhật lại."
          : exception instanceof Error
            ? exception.message
            : "Không thể từ chối bài viết.",
      );
      await refreshAfterAction();
    } finally {
      setActionBusy(false);
    }
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  };

  const visibleRows = useMemo(() => articlePage.articles, [articlePage.articles]);
  const start = articlePage.totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, articlePage.totalElements);

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-[#dde7de] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <span>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2E5A44]">
              Admin Knowledge Review
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-950 sm:text-3xl">
              Quản lý kiến thức
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
              Xét duyệt và quản lý các bài kiến thức được gửi từ kỹ sư DurianCare.
            </p>
          </span>
          <button
            type="button"
            onClick={() => void refreshAfterAction()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-3 text-xs font-extrabold text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw size={14} />
            Làm mới
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Chờ duyệt" count={countsLoading ? 0 : counts.REVIEW} tone="text-amber-600" />
          <SummaryCard label="Đã duyệt" count={countsLoading ? 0 : counts.PUBLISHED} tone="text-emerald-700" />
          <SummaryCard label="Từ chối" count={countsLoading ? 0 : counts.REJECTED} tone="text-red-600" />
        </div>
      </section>

      <section className="rounded-[24px] border border-[#dde7de] bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((item) => {
              const active = tab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setTab(item.value);
                    setPage(0);
                  }}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-extrabold transition ${
                    active
                      ? "bg-[#2E5A44] text-white"
                      : "bg-[#f2f6f2] text-neutral-700 hover:bg-[#e8f0e9]"
                  }`}
                >
                  {item.label}
                  <span className={active ? "text-white/75" : "text-neutral-400"}>
                    {countsLoading ? "-" : counts[item.value].toLocaleString("vi-VN")}
                  </span>
                </button>
              );
            })}
          </div>
          <form onSubmit={submitSearch} className="relative min-w-0 lg:w-[360px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tiêu đề hoặc tác giả..."
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414]"
            />
          </form>
        </div>

        {notice && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <span>Không thể tải danh sách bài viết.</span>
            <button
              type="button"
              onClick={() => void loadArticles()}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs text-red-700"
            >
              <RefreshCw size={13} />
              Thử lại
            </button>
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <TableSkeleton />
          ) : visibleRows.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-neutral-100 lg:block">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="bg-[#f7faf7] text-xs font-extrabold uppercase tracking-[0.12em] text-neutral-500">
                    <tr>
                      <th className="w-[38%] px-4 py-3">Bài viết</th>
                      <th className="w-[18%] px-4 py-3">Tác giả</th>
                      <th className="w-[14%] px-4 py-3">Danh mục</th>
                      <th className="w-[12%] px-4 py-3">Trạng thái</th>
                      <th className="w-[10%] px-4 py-3">Ngày gửi</th>
                      <th className="w-[18%] px-4 py-3">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {visibleRows.map((article) => (
                      <tr key={article.id} className="align-top">
                        <td className="px-4 py-3">
                          <ArticleIdentity article={article} />
                        </td>
                        <td className="px-4 py-3">
                          <b className="line-clamp-2 text-sm text-neutral-900">{article.author}</b>
                          <small className="mt-1 block text-xs font-semibold text-neutral-500">
                            {authorRoleLabel(article.authorRole)}
                          </small>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-neutral-700">{article.category}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={article.status} />
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-neutral-500">
                          {formatDate(article.submittedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <ActionButtons article={article} busy={actionBusy} onOpen={openDialog} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {visibleRows.map((article) => (
                  <article key={article.id} className="rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm">
                    <ArticleIdentity article={article} />
                    <div className="mt-3 grid gap-2 text-xs font-semibold text-neutral-500 sm:grid-cols-2">
                      <span>Tác giả: <b className="text-neutral-800">{article.author}</b></span>
                      <span>Danh mục: <b className="text-neutral-800">{article.category}</b></span>
                      <span>Ngày gửi: <b className="text-neutral-800">{formatDate(article.submittedAt)}</b></span>
                      <StatusBadge status={article.status} />
                    </div>
                    <div className="mt-3">
                      <ActionButtons article={article} busy={actionBusy} onOpen={openDialog} />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>

        {articlePage.totalPages > 1 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
            <small className="text-xs font-semibold text-neutral-400">
              Hiển thị {start}-{end} của {articlePage.totalElements.toLocaleString("vi-VN")} bài viết
            </small>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                className="h-9 rounded-xl border border-neutral-200 px-3 text-xs font-extrabold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-xs font-bold text-neutral-500">
                {page + 1}/{articlePage.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= articlePage.totalPages - 1}
                onClick={() => setPage((value) => Math.min(articlePage.totalPages - 1, value + 1))}
                className="h-9 rounded-xl border border-neutral-200 px-3 text-xs font-extrabold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </section>

      {dialog?.type === "preview" && (
        <PreviewDialog article={dialog.article} onClose={() => setDialog(null)} />
      )}

      {dialog?.type === "approve" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-3">
          <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-extrabold text-neutral-950">Duyệt bài viết?</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Bài viết sẽ được xuất bản và hiển thị trong thư viện kiến thức DurianCare.
            </p>
            {actionError && (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {actionError}
              </p>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => setDialog(null)}
                className="h-11 rounded-xl border border-neutral-200 px-4 text-sm font-extrabold text-neutral-700"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void approveArticle(dialog.article)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionBusy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Duyệt bài
              </button>
            </div>
          </section>
        </div>
      )}

      {dialog?.type === "reject" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-3">
          <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-extrabold text-neutral-950">Từ chối bài viết</h2>
            <label className="mt-4 block">
              <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-neutral-500">
                Lý do từ chối
              </span>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Nêu rõ nội dung cần chỉnh sửa hoặc bổ sung..."
                rows={5}
                className="mt-2 w-full resize-none rounded-xl border border-neutral-200 p-3 text-sm leading-relaxed outline-none focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414]"
              />
            </label>
            {actionError && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {actionError}
              </p>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => setDialog(null)}
                className="h-11 rounded-xl border border-neutral-200 px-4 text-sm font-extrabold text-neutral-700"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionBusy || !rejectReason.trim()}
                onClick={() => void rejectArticle(dialog.article)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionBusy ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                Từ chối bài
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
