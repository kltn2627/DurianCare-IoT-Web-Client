"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Filter,
  LoaderCircle,
  Search,
  Sparkles,
  Table2,
  Tag,
  ThermometerSun,
  X,
} from "lucide-react";
import { searchDocuments, SearchApiError } from "@/lib/search/client";
import type {
  SearchDocumentType,
  SearchResponse,
  SearchSortBy,
  SearchSortDirection,
} from "@/lib/search/types";
import { friendlyApiMessage } from "@/lib/feedback";

type SearchFilters = {
  query: string;
  type: SearchDocumentType | "";
  page: number;
  size: number;
  sortBy: SearchSortBy;
  sortDirection: SearchSortDirection;
};

export interface SearchWorkspaceProps {
  initialQuery?: string;
  initialType?: SearchDocumentType | "";
  initialPage?: number;
  initialSize?: number;
  initialSortBy?: SearchSortBy;
  initialSortDirection?: SearchSortDirection;
}

const DEFAULT_SIZE = 10;

const SORT_LABELS: Record<`${SearchSortBy}:${SearchSortDirection}`, string> = {
  "updatedAt:desc": "Cập nhật mới nhất",
  "updatedAt:asc": "Cập nhật cũ nhất",
  "title:asc": "Tiêu đề A-Z",
  "title:desc": "Tiêu đề Z-A",
};

const TYPE_LABELS: Record<SearchDocumentType, string> = {
  ARTICLE: "Bài viết",
  DISEASE: "Bệnh hại",
};

const TYPE_OPTIONS: Array<{ label: string; value: SearchDocumentType | "" }> = [
  { label: "Tất cả", value: "" },
  { label: "Bài viết", value: "ARTICLE" },
  { label: "Bệnh hại", value: "DISEASE" },
];

const SORT_OPTIONS: Array<{
  label: string;
  sortBy: SearchSortBy;
  sortDirection: SearchSortDirection;
}> = [
  { label: "Cập nhật mới nhất", sortBy: "updatedAt", sortDirection: "desc" },
  { label: "Cập nhật cũ nhất", sortBy: "updatedAt", sortDirection: "asc" },
  { label: "Tiêu đề A-Z", sortBy: "title", sortDirection: "asc" },
  { label: "Tiêu đề Z-A", sortBy: "title", sortDirection: "desc" },
];

function buildPageWindow(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }
  const start = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function highlightType(type: string) {
  return TYPE_LABELS[type as SearchDocumentType] ?? type;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
      <div className="h-3 w-24 rounded-full bg-neutral-200" />
      <div className="mt-4 h-4 w-3/4 rounded-full bg-neutral-200" />
      <div className="mt-3 h-3 w-full rounded-full bg-neutral-200" />
      <div className="mt-2 h-3 w-5/6 rounded-full bg-neutral-200" />
    </div>
  );
}

export function SearchWorkspace({
  initialQuery = "",
  initialType = "",
  initialPage = 0,
  initialSize = DEFAULT_SIZE,
  initialSortBy = "updatedAt",
  initialSortDirection = "desc",
}: SearchWorkspaceProps) {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? initialQuery;
  const urlType = searchParams.get("type");
  const urlPage = Number(searchParams.get("page") ?? initialPage);
  const urlSize = Number(searchParams.get("size") ?? initialSize);
  const urlSortBy = searchParams.get("sortBy");
  const urlSortDirection = searchParams.get("sortDirection");

  const [draftQuery, setDraftQuery] = useState(urlQuery);
  const [filters, setFilters] = useState<SearchFilters>({
    query: urlQuery,
    type:
      urlType === "ARTICLE" || urlType === "DISEASE"
        ? urlType
        : initialType ?? "",
    page: Number.isFinite(urlPage) && urlPage >= 0 ? urlPage : initialPage ?? 0,
    size: Number.isFinite(urlSize) && urlSize > 0 ? urlSize : initialSize ?? DEFAULT_SIZE,
    sortBy: urlSortBy === "title" ? "title" : initialSortBy ?? "updatedAt",
    sortDirection: urlSortDirection === "asc" ? "asc" : initialSortDirection ?? "desc",
  });
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(initialQuery));
  const [error, setError] = useState<string | null>(null);
  const [searchTouched, setSearchTouched] = useState(Boolean(initialQuery));

  const clearResults = () => {
    setDraftQuery("");
    setFilters((current) => ({ ...current, query: "", page: 0 }));
    setData(null);
    setError(null);
    setLoading(false);
    setSearchTouched(false);
  };

  const runSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      clearResults();
      return;
    }
    setLoading(true);
    setError(null);
    setSearchTouched(true);
    setFilters((current) => ({ ...current, query: trimmed, page: 0 }));
  };

  useEffect(() => {
    const trimmed = draftQuery.trim();
    if (!trimmed) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      if (trimmed !== filters.query.trim()) {
        setLoading(true);
        setError(null);
        setSearchTouched(true);
        setFilters((current) => ({ ...current, query: trimmed, page: 0 }));
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [draftQuery, filters.query]);

  useEffect(() => {
    if (!filters.query.trim()) return;

    const controller = new AbortController();

    void searchDocuments(filters, controller.signal)
      .then((response) => {
        setData(response);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(
          friendlyApiMessage(
            cause instanceof SearchApiError
              ? { status: cause.status, message: cause.message }
              : null,
            "search",
            "Không thể tải dữ liệu tìm kiếm.",
          ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters]);

  const pageWindow = useMemo(
    () => buildPageWindow(data?.page ?? filters.page, data?.totalPages ?? 0),
    [data?.page, data?.totalPages, filters.page],
  );

  const totalLabel = data
    ? `${data.totalElements.toLocaleString("vi-VN")} kết quả`
    : "0 kết quả";
  const hasQuery = Boolean(filters.query.trim());
  const hasResults = Boolean(data && data.results.length > 0);

  return (
    <main className="min-h-screen bg-[#f6f8f4] text-neutral-900">
      <section className="grid-pattern border-b border-[#dde5de] bg-[#284d3a] text-white">
        <div className="mx-auto max-w-[1500px] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#eed56d]">
                <Sparkles size={12} />
                Search module
              </p>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Tìm kiếm tri thức và dữ liệu vận hành
              </h1>
              <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[#d0ddd4]">
                Tra cứu bài viết, hồ sơ bệnh hại và nội dung vận hành đã được backend chuẩn
                hóa. Hỗ trợ phân trang, sắp xếp và lọc theo loại tài liệu.
              </p>
            </div>
            <Link
              href="/dashboard/client"
              className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[.07] px-4 py-3 text-xs font-bold text-white transition-all duration-200 hover:bg-white/[.12] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#eed56d33] lg:inline-flex"
            >
              <ArrowLeft size={15} />
              Quay lại dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_340px]">
          <div className="space-y-5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                runSearch(draftQuery);
              }}
              className="panel overflow-hidden p-5 sm:p-6"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
                <label className="relative block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-bold text-neutral-700">
                    <Search size={13} className="text-[#2E5A44]" />
                    Từ khóa
                  </span>
                  <input
                    value={draftQuery}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDraftQuery(value);
                      if (!value.trim()) {
                        clearResults();
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        clearResults();
                      }
                    }}
                    placeholder="Ví dụ: Phytophthora, kỹ thuật xử lý hoa, bệnh lá..."
                    className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 pr-20 text-[13px] text-neutral-900 outline-none transition-all duration-200 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
                  />
                  {draftQuery ? (
                    <button
                      type="button"
                      onClick={clearResults}
                      className="absolute right-3 top-10 rounded-lg px-2 py-1 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44]"
                    >
                      Xoá
                    </button>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-bold text-neutral-700">
                    <Filter size={13} className="text-[#2E5A44]" />
                    Loại tài liệu
                  </span>
                  <select
                    value={filters.type}
                    onChange={(event) => {
                      setLoading(true);
                      setError(null);
                      setFilters((current) => ({
                        ...current,
                        type: event.target.value as SearchDocumentType | "",
                        page: 0,
                      }));
                    }}
                    className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] outline-none transition-all duration-200 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option.value || "ALL"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-bold text-neutral-700">
                    <ArrowUpDown size={13} className="text-[#2E5A44]" />
                    Sắp xếp
                  </span>
                  <select
                    value={`${filters.sortBy}:${filters.sortDirection}`}
                    onChange={(event) => {
                      setLoading(true);
                      setError(null);
                      const [sortBy, sortDirection] = event.target.value.split(
                        ":",
                      ) as [SearchSortBy, SearchSortDirection];
                      setFilters((current) => ({
                        ...current,
                        sortBy,
                        sortDirection,
                        page: 0,
                      }));
                    }}
                    className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] outline-none transition-all duration-200 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
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

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-bold text-neutral-700">
                    <Table2 size={13} className="text-[#2E5A44]" />
                    Kích thước trang
                  </span>
                  <select
                    value={filters.size}
                    onChange={(event) => {
                      setLoading(true);
                      setError(null);
                      setFilters((current) => ({
                        ...current,
                        size: Number(event.target.value),
                        page: 0,
                      }));
                    }}
                    className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] outline-none transition-all duration-200 hover:border-neutral-300 focus-visible:border-[#5d806b] focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
                  >
                    {[10, 20, 50].map((value) => (
                      <option key={value} value={value}>
                        {value} mục
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                <p className="text-xs leading-relaxed text-neutral-500">
                  Tìm kiếm tự động sau khi dừng gõ, nhưng vẫn hỗ trợ bấm Enter để tìm ngay.
                </p>
                <div className="flex items-center gap-2">
                  {hasQuery ? (
                    <button
                      type="button"
                      onClick={clearResults}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-bold text-neutral-700 transition-all duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200"
                    >
                      Xoá bộ lọc
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-5 text-xs font-bold text-white transition-all duration-200 hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430]"
                  >
                    <Search size={15} />
                    Tìm kiếm
                  </button>
                </div>
              </div>
            </form>

            <section className="panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6f7f74]">
                    Kết quả tìm kiếm
                  </p>
                  <h2 className="mt-1 text-lg font-extrabold tracking-tight text-neutral-900">
                    {loading ? "Đang truy vấn..." : totalLabel}
                  </h2>
                </div>
                {data ? (
                  <div className="flex items-center gap-2 rounded-full bg-[#f3f7f1] px-3 py-2 text-xs font-semibold text-[#4f6759]">
                    <Tag size={12} className="text-[#2E5A44]" />
                    {SORT_LABELS[`${data.sortBy}:${data.sortDirection}` as const]}
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="px-5 py-10 sm:px-6">
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-[13px] leading-relaxed text-red-700">
                    {error}
                  </div>
                </div>
              ) : loading && !data ? (
                <div className="space-y-3 px-5 py-6 sm:px-6">
                  {Array.from({ length: 4 }, (_, index) => (
                    <SkeletonCard key={index} />
                  ))}
                  <div className="flex items-center justify-center gap-3 py-2 text-[#2E5A44]">
                    <LoaderCircle size={18} className="animate-spin" />
                    <span className="text-[13px] font-semibold">Đang tải kết quả...</span>
                  </div>
                </div>
              ) : hasResults ? (
                <div className="divide-y divide-neutral-100">
                  {data!.results.map((result) => (
                    <article
                      key={result.id}
                      className="group px-5 py-5 transition-colors duration-200 hover:bg-[#fafcf8] sm:px-6"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#edf3ee] px-2.5 py-1 text-xs font-bold text-[#2E5A44]">
                              <Sparkles size={11} />
                              {highlightType(result.type)}
                            </span>
                            <span className="text-xs font-medium text-neutral-400">
                              Cập nhật {formatUpdatedAt(result.updatedAt)}
                            </span>
                          </div>
                          <h3 className="text-base font-extrabold tracking-tight text-neutral-900 group-hover:text-[#2E5A44]">
                            {result.title}
                          </h3>
                          <p className="max-w-4xl text-[13px] leading-relaxed text-neutral-500">
                            {result.content}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <span className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600">
                            ID: {result.id}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-[320px] place-items-center px-5 py-10 text-center sm:px-6">
                  <span>
                    <ThermometerSun className="mx-auto text-neutral-300" size={30} />
                    <b className="mt-4 block text-[13px] text-neutral-800">
                      {searchTouched ? "Không tìm thấy kết quả" : "Bắt đầu tìm kiếm"}
                    </b>
                    <p className="mt-2 max-w-md text-xs leading-relaxed text-neutral-500">
                      {searchTouched
                        ? "Thử đổi từ khóa, bộ lọc hoặc kiểu sắp xếp để tìm được nội dung phù hợp hơn."
                        : "Nhập từ khóa để tìm trong kho tài liệu, sau đó lọc thêm theo loại và sắp xếp."}
                    </p>
                    {searchTouched ? (
                      <button
                        type="button"
                        onClick={clearResults}
                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#244a37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4430]"
                      >
                        <X size={14} />
                        Xoá tìm kiếm
                      </button>
                    ) : null}
                  </span>
                </div>
              )}

              {data && data.totalPages > 0 ? (
                <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-xs text-neutral-500">
                    Trang {data.page + 1} / {data.totalPages} • {data.numberOfElements} mục trên
                    trang
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!data.hasPrevious}
                      onClick={() => {
                        setLoading(true);
                        setError(null);
                        setFilters((current) => ({
                          ...current,
                          page: Math.max(0, current.page - 1),
                        }));
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-xs font-semibold text-neutral-700 transition-all duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowLeft size={14} />
                      Trước
                    </button>

                    {pageWindow.map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => {
                          setLoading(true);
                          setError(null);
                          setFilters((current) => ({ ...current, page }));
                        }}
                        className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4418] ${
                          page === data.page
                            ? "bg-[#2E5A44] text-white"
                            : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        {page + 1}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={!data.hasNext}
                      onClick={() => {
                        setLoading(true);
                        setError(null);
                        setFilters((current) => ({
                          ...current,
                          page: Math.min(data.totalPages - 1, current.page + 1),
                        }));
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

          <aside className="space-y-5">
            <section className="panel p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#e9f0ea] text-[#2E5A44]">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h2 className="text-[15px] font-bold tracking-tight text-neutral-900">
                    Bộ lọc hiện tại
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    Mọi tham số đang được gửi đúng sang endpoint tìm kiếm.
                  </p>
                </div>
              </div>

              <dl className="mt-5 space-y-3">
                {[
                  ["Từ khóa", filters.query || "Chưa nhập"],
                  ["Loại", filters.type ? TYPE_LABELS[filters.type] : "Tất cả"],
                  [
                    "Sắp xếp",
                    SORT_LABELS[`${filters.sortBy}:${filters.sortDirection}` as const],
                  ],
                  ["Kích thước", `${filters.size} mục/trang`],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3"
                  >
                    <dt className="text-xs font-semibold text-neutral-500">{label}</dt>
                    <dd className="max-w-[180px] text-right text-xs font-semibold text-neutral-900">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="panel p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#fbf2cb] text-[#7f6415]">
                  <Filter size={18} />
                </span>
                <div>
                  <h2 className="text-[15px] font-bold tracking-tight text-neutral-900">
                    Gợi ý lọc nhanh
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    Các kiểu truy vấn phổ biến cho kiến thức canh tác và bệnh hại.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {[
                  "Phytophthora",
                  "xử lý ra hoa nghịch vụ",
                  "bệnh lá",
                  "dinh dưỡng kali",
                ].map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => {
                      setDraftQuery(keyword);
                      runSearch(keyword);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left text-xs font-semibold text-neutral-700 transition-all duration-200 hover:border-[#c7d7ca] hover:bg-[#f8faf7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
                  >
                    <span>{keyword}</span>
                    <Sparkles size={12} className="text-[#2E5A44]" />
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
