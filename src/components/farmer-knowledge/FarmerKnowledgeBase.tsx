"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Eye,
  Leaf,
  PenLine,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { knowledgeClient } from "@/lib/knowledge/client";
import type {
  KnowledgeArticle,
  KnowledgeArticlePage,
  KnowledgeCategoryCount,
  KnowledgeSort,
} from "@/lib/knowledge/types";

const FALLBACK_COVER_IMAGE = "/mock/knowledge-nutrition.svg";
const PAGE_SIZE = 9;

const EMPTY_PAGE: KnowledgeArticlePage = {
  articles: [],
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size: PAGE_SIZE,
};

const sortOptions: Array<{ label: string; value: KnowledgeSort }> = [
  { label: "Mới nhất", value: "publishedAt,desc" },
  { label: "Xem nhiều nhất", value: "views,desc" },
];

function roleLabel(role?: string | null) {
  if (role === "ADMIN") return "Admin";
  if (role === "ENGINEER" || role === "EXPERT") return "Kỹ sư";
  return "DurianCare";
}

function formatCount(value: number) {
  return value.toLocaleString("vi-VN");
}

function createHrefForRole(role?: string | null) {
  if (role === "ADMIN") return "/dashboard/admin/knowledge/create";
  return "/dashboard/engineer/knowledge/create";
}

function myArticlesHrefForRole(role?: string | null) {
  if (role === "ADMIN") return "/dashboard/admin/knowledge/my-articles";
  return "/dashboard/engineer/knowledge/my-articles";
}

function canWriteKnowledge(role?: string | null) {
  return role === "ADMIN" || role === "ENGINEER";
}

function categoryKey(value: string) {
  return value.trim().toLocaleLowerCase("vi-VN");
}

function mergeCategoryCounts(categories: KnowledgeCategoryCount[]) {
  const merged = new Map<string, KnowledgeCategoryCount>();
  categories.forEach((item) => {
    const categoryName = item.category.trim();
    if (!categoryName || categoryKey(categoryName) === categoryKey("Tất cả")) return;
    const key = categoryKey(categoryName);
    const existing = merged.get(key);
    merged.set(key, {
      category: existing?.category ?? categoryName,
      count: (existing?.count ?? 0) + item.count,
    });
  });
  return Array.from(merged.values());
}

function ArticleCard({ article }: { article: KnowledgeArticle }) {
  const coverImage = article.coverImage || FALLBACK_COVER_IMAGE;
  return (
    <Link
      href={`/dashboard/client/knowledge/${article.slug}`}
      className="group flex min-h-full flex-col overflow-hidden rounded-2xl border border-[#dde7de] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#b7c8ba] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4420]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[#e9efe8]">
        <div
          role="img"
          aria-label={`Ảnh bìa ${article.title}`}
          className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-[1.025]"
          style={{ backgroundImage: `url(${coverImage})` }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1.5 text-xs font-extrabold text-[#2E5A44] shadow-sm">
          {article.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 text-base font-extrabold leading-snug tracking-tight text-neutral-950 transition-colors group-hover:text-[#2E5A44]">
          {article.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-600">
          {article.excerpt}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-neutral-500">
          <span>{article.author}</span>
          <span className="rounded-full bg-[#edf3ee] px-2 py-1 text-[#2E5A44]">
            {roleLabel(article.authorRole)}
          </span>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4 text-xs font-semibold text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} />
            {article.publishedAt || "Chưa cập nhật"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye size={13} />
            {formatCount(article.views)} lượt xem
          </span>
        </div>
      </div>
    </Link>
  );
}

function ArticleSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
      <div className="aspect-[16/9] animate-pulse bg-neutral-100" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-100" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-neutral-100" />
        <div className="h-16 animate-pulse rounded bg-neutral-100" />
        <div className="h-8 animate-pulse rounded bg-neutral-100" />
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-xl bg-neutral-100" />
      ))}
    </div>
  );
}

function CompactArticleList({
  title,
  icon,
  articles,
}: {
  title: string;
  icon: ReactNode;
  articles: KnowledgeArticle[];
}) {
  return (
    <section className="rounded-2xl border border-[#dde7de] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-extrabold text-neutral-950">{title}</h2>
      </div>
      <div className="space-y-3">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/dashboard/client/knowledge/${article.slug}`}
            className="group grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-xl p-1 transition hover:bg-[#f6faf6]"
          >
            <div
              role="img"
              aria-label={`Ảnh bìa ${article.title}`}
              className="aspect-square rounded-xl bg-[#e9efe8] bg-cover bg-center"
              style={{
                backgroundImage: `url(${article.coverImage || FALLBACK_COVER_IMAGE})`,
              }}
            />
            <span className="min-w-0">
              <b className="line-clamp-2 text-xs leading-relaxed text-neutral-900 group-hover:text-[#2E5A44]">
                {article.title}
              </b>
              <small className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-neutral-400">
                <Eye size={11} />
                {formatCount(article.views)}
              </small>
            </span>
          </Link>
        ))}
        {articles.length === 0 && (
          <p className="rounded-xl bg-neutral-50 px-3 py-4 text-xs font-semibold text-neutral-400">
            Chưa có dữ liệu.
          </p>
        )}
      </div>
    </section>
  );
}

export function FarmerKnowledgeBase() {
  const { user } = useAuth();
  const writer = canWriteKnowledge(user?.role);
  const [queryInput, setQueryInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [sort, setSort] = useState<KnowledgeSort>("publishedAt,desc");
  const [page, setPage] = useState(0);
  const [articlePage, setArticlePage] = useState<KnowledgeArticlePage>(EMPTY_PAGE);
  const [categoryCounts, setCategoryCounts] = useState<KnowledgeCategoryCount[]>([]);
  const [recentArticles, setRecentArticles] = useState<KnowledgeArticle[]>([]);
  const [popularArticles, setPopularArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarError, setSidebarError] = useState<string | null>(null);

  const visibleCategoryCounts = useMemo(
    () => mergeCategoryCounts(categoryCounts),
    [categoryCounts],
  );

  const categoryTabs = useMemo(
    () => [
      { category: "Tất cả", count: categoryCounts.reduce((sum, item) => sum + item.count, 0) },
      ...visibleCategoryCounts,
    ],
    [categoryCounts, visibleCategoryCounts],
  );

  useEffect(() => {
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    if (!requestedCategory) return;
    setCategory(requestedCategory);
    setPage(0);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(queryInput.trim());
      setPage(0);
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [queryInput]);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await knowledgeClient.list({
        search,
        category,
        page,
        size: PAGE_SIZE,
        sort,
      });
      setArticlePage(result);
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : "Không thể tải thư viện kiến thức.",
      );
      setArticlePage(EMPTY_PAGE);
    } finally {
      setLoading(false);
    }
  }, [category, page, search, sort]);

  const loadSidebar = useCallback(async () => {
    setSidebarLoading(true);
    setSidebarError(null);
    try {
      const [categories, popular, recent] = await Promise.all([
        knowledgeClient.categories(),
        knowledgeClient.popular(5),
        knowledgeClient.recent(5),
      ]);
      setCategoryCounts(categories);
      setPopularArticles(popular.articles);
      setRecentArticles(recent.articles);
    } catch (exception) {
      setSidebarError(
        exception instanceof Error
          ? exception.message
          : "Không thể tải dữ liệu phụ.",
      );
    } finally {
      setSidebarLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    void loadSidebar();
  }, [loadSidebar]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(queryInput.trim());
    setPage(0);
  };

  const clearFilters = () => {
    setQueryInput("");
    setSearch("");
    setCategory("Tất cả");
    setSort("publishedAt,desc");
    setPage(0);
  };

  const selectCategory = (value: string) => {
    setCategory(value);
    setPage(0);
  };

  const start = articlePage.totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, articlePage.totalElements);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[24px] bg-[#244a37] text-white shadow-sm">
        <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#EED56D]">
              <BookOpenText size={14} />
              DURIANCARE KNOWLEDGE LIBRARY
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Thư viện kiến thức về sầu riêng
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#dce8df]">
              Cập nhật kiến thức, kinh nghiệm và kỹ thuật canh tác từ đội ngũ
              kỹ sư DurianCare, giúp bạn chăm sóc vườn sầu riêng hiệu quả hơn.
            </p>
            <form onSubmit={submitSearch} className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
              <label className="relative block">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#789183]"
                />
                <input
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Tìm kiếm bài viết (ví dụ: Phytophthora, Kali, cắt tỉa, sâu bệnh...)"
                  className="h-12 w-full rounded-2xl border border-white/15 bg-white pl-11 pr-4 text-sm font-semibold text-neutral-900 shadow-sm outline-none placeholder:text-neutral-400 focus-visible:ring-4 focus-visible:ring-[#EED56D]/25"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#EED56D] px-4 text-sm font-extrabold text-[#244a37] transition hover:bg-[#f3dc7d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25"
              >
                <Search size={16} />
                Tìm kiếm
              </button>
            </form>
          </div>
          <div className="hidden min-h-52 overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-4 xl:block">
            <div
              role="img"
              aria-label="Sổ tay kiến thức sầu riêng"
              className="h-full min-h-44 rounded-2xl bg-cover bg-center"
              style={{ backgroundImage: `url(${FALLBACK_COVER_IMAGE})` }}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px] xl:items-start">
        <main className="min-w-0 rounded-[24px] border border-[#dde7de] bg-white p-3 shadow-sm sm:p-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {sidebarLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <span key={index} className="h-10 w-28 shrink-0 animate-pulse rounded-xl bg-neutral-100" />
              ))
            ) : (
              categoryTabs.map((item) => {
                const active = category === item.category;
                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => selectCategory(item.category)}
                    className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-extrabold transition ${
                      active
                        ? "bg-[#2E5A44] text-white"
                        : "bg-[#f2f6f2] text-neutral-700 hover:bg-[#e8f0e9]"
                    }`}
                  >
                    {item.category}
                    <span className={active ? "text-white/75" : "text-neutral-400"}>
                      {formatCount(item.count)}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-3 grid gap-3 border-y border-neutral-100 py-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative block">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Tìm kiếm bài viết..."
                className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414]"
              />
            </label>
            <label className="relative block">
              <SlidersHorizontal
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as KnowledgeSort);
                  setPage(0);
                }}
                className="h-11 w-full appearance-none rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm font-bold outline-none focus:border-[#2E5A44] focus:ring-4 focus:ring-[#2E5A4414]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <span>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#75867a]">
                Thư viện đã kiểm duyệt
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-neutral-950">
                {category === "Tất cả" ? "Tất cả bài viết" : category}
              </h2>
            </span>
            <small className="text-xs font-semibold text-neutral-400">
              {articlePage.totalElements > 0
                ? `Hiển thị ${start}-${end} của ${formatCount(articlePage.totalElements)} bài viết`
                : "0 bài viết"}
            </small>
          </div>

          {error && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              <span>Không thể tải thư viện kiến thức.</span>
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
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                  <ArticleSkeleton key={index} />
                ))}
              </div>
            ) : articlePage.articles.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {articlePage.articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-neutral-200 bg-[#fbfcfa] p-6 text-center">
                <span>
                  <Sprout className="mx-auto text-neutral-300" size={34} />
                  <b className="mt-4 block text-sm text-neutral-800">
                    Không tìm thấy bài viết phù hợp
                  </b>
                  <p className="mt-2 text-sm text-neutral-500">
                    Hãy thử từ khóa hoặc danh mục khác.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#2E5A44] px-4 text-xs font-extrabold text-white"
                  >
                    Xóa bộ lọc
                  </button>
                </span>
              </div>
            )}
          </div>

          {articlePage.totalPages > 1 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-neutral-100 pt-4">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                className="grid size-10 place-items-center rounded-xl border border-neutral-200 text-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Trang trước"
              >
                <ArrowLeft size={15} />
              </button>
              {Array.from({ length: articlePage.totalPages }).slice(0, 7).map((_, index) => {
                const active = page === index;
                return (
                  <button
                    type="button"
                    key={index}
                    onClick={() => setPage(index)}
                    className={`grid size-10 place-items-center rounded-xl border text-sm font-extrabold ${
                      active
                        ? "border-[#2E5A44] bg-[#2E5A44] text-white"
                        : "border-neutral-200 bg-white text-neutral-600"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
              {articlePage.totalPages > 7 && (
                <span className="grid size-10 place-items-center text-sm font-bold text-neutral-400">
                  ...
                </span>
              )}
              <button
                type="button"
                disabled={page >= articlePage.totalPages - 1}
                onClick={() =>
                  setPage((value) => Math.min(articlePage.totalPages - 1, value + 1))
                }
                className="grid size-10 place-items-center rounded-xl border border-neutral-200 text-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Trang sau"
              >
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </main>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#dde7de] bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Leaf size={16} className="text-[#2E5A44]" />
              <h2 className="text-sm font-extrabold text-neutral-950">
                Chủ đề nổi bật
              </h2>
            </div>
            {sidebarLoading ? (
              <SidebarSkeleton />
            ) : (
              <div className="space-y-2">
                {visibleCategoryCounts.slice(0, 6).map((item) => (
                  <button
                    type="button"
                    key={item.category}
                    onClick={() => selectCategory(item.category)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold text-neutral-700 transition hover:bg-[#f4f8f5] hover:text-[#2E5A44]"
                  >
                    <span>{item.category}</span>
                    <small className="rounded-full bg-[#edf3ee] px-2 py-1 text-xs text-[#2E5A44]">
                      {formatCount(item.count)} bài
                    </small>
                  </button>
                ))}
                {visibleCategoryCounts.length === 0 && (
                  <p className="rounded-xl bg-neutral-50 px-3 py-4 text-xs font-semibold text-neutral-400">
                    Chưa có chủ đề.
                  </p>
                )}
              </div>
            )}
          </section>

          {sidebarError && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
              {sidebarError}
            </div>
          )}

          {sidebarLoading ? (
            <section className="rounded-2xl border border-[#dde7de] bg-white p-4 shadow-sm">
              <SidebarSkeleton />
            </section>
          ) : (
            <CompactArticleList
              title="Bài viết được quan tâm"
              icon={<TrendingUp size={16} className="text-[#2E5A44]" />}
              articles={popularArticles.slice(0, 5)}
            />
          )}

          {sidebarLoading ? (
            <section className="rounded-2xl border border-[#dde7de] bg-white p-4 shadow-sm">
              <SidebarSkeleton />
            </section>
          ) : (
            <CompactArticleList
              title="Bài viết mới"
              icon={<BookOpenText size={16} className="text-[#2E5A44]" />}
              articles={recentArticles.slice(0, 5)}
            />
          )}

          {writer && (
            <section className="rounded-2xl border border-[#f0df9d] bg-[#fff6d9] p-4 shadow-sm">
              <PenLine size={18} className="text-[#9b7a16]" />
              <h2 className="mt-3 text-sm font-extrabold text-neutral-950">
                Bạn là kỹ sư?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Chia sẻ kiến thức và kinh nghiệm để giúp cộng đồng nông hộ phát triển.
              </p>
              <Link
                href={createHrefForRole(user?.role)}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-xs font-extrabold text-white transition hover:bg-[#244a37]"
              >
                <PenLine size={14} />
                Viết bài kiến thức
              </Link>
              <Link
                href={myArticlesHrefForRole(user?.role)}
                className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#2E5A44] px-4 text-xs font-extrabold text-[#2E5A44] transition hover:bg-white/60"
              >
                Bài viết của tôi
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
