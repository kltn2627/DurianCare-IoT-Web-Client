"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpenText,
  Clock3,
  Eye,
  Leaf,
  RotateCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sprout,
} from "lucide-react";
import { knowledgeClient } from "@/lib/knowledge/client";
import { knowledgeCategories } from "@/lib/knowledge/categories";
import type { KnowledgeStatus } from "@/lib/knowledge/types";
import type { FarmerKnowledgeArticle } from "./types";

const FALLBACK_COVER_IMAGE = "/mock/knowledge-nutrition.svg";

type KnowledgeStatusTab = "mine" | "review" | "published";

const statusTabs: Array<{ key: KnowledgeStatusTab; label: string }> = [
  { key: "mine", label: "Bài đăng kiến thức" },
  { key: "review", label: "Chờ duyệt" },
  { key: "published", label: "Đã duyệt" },
];

const statusMeta: Record<KnowledgeStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Bản nháp",
    className: "bg-neutral-100 text-neutral-600",
  },
  REVIEW: {
    label: "Chờ duyệt",
    className: "bg-amber-50 text-amber-700",
  },
  PUBLISHED: {
    label: "Đã duyệt",
    className: "bg-emerald-50 text-emerald-700",
  },
  REJECTED: {
    label: "Bị từ chối",
    className: "bg-red-50 text-red-700",
  },
};

const farmerCategories = [
  "Tất cả",
  "Dinh dưỡng",
  "Sâu bệnh",
  "Kỹ thuật canh tác",
  "Kỹ thuật bón phân nghịch vụ",
  "Kỹ thuật cắt tỉa",
].filter((category) => knowledgeCategories.includes(category));

function SubmissionPanel({
  onSubmitted,
}: {
  onSubmitted: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(
    farmerCategories.find((item) => item !== "Táº¥t cáº£") ?? "Dinh dưỡng",
  );
  const [author, setAuthor] = useState("Nông hộ DurianCare");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !excerpt.trim() || !content.trim()) return;
    setSaving(true);
    setNotice(null);
    try {
      await knowledgeClient.save({
        title,
        category,
        author,
        excerpt,
        content,
        status: "REVIEW",
        featured: false,
        coverFile,
        tags: [category],
      });
      setTitle("");
      setExcerpt("");
      setContent("");
      setCoverFile(null);
      setNotice("Bài kiến thức đã được gửi tới Admin chờ duyệt.");
      await onSubmitted();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Không thể gửi bài kiến thức.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[22px] border border-neutral-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <span>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#75867a]">
            Gửi bài cộng đồng
          </p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-neutral-900">
            Chia sẻ một bài kiến thức
          </h2>
        </span>
        <BookOpenText size={18} className="text-[#2E5A44]" />
      </div>

      {notice && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          {notice}
        </div>
      )}

      <form onSubmit={submit} className="mt-4 grid gap-3 lg:grid-cols-2">
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Tiêu đề bài viết"
          className="h-11 rounded-xl border border-neutral-200 px-3 text-xs outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 rounded-xl border border-neutral-200 px-3 text-xs outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
          >
            {farmerCategories
              .filter((item) => item !== "Táº¥t cáº£")
              .map((item) => (
                <option key={item}>{item}</option>
              ))}
          </select>
          <input
            required
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="Tên tác giả"
            className="h-11 rounded-xl border border-neutral-200 px-3 text-xs outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4414]"
          />
        </div>
        <textarea
          required
          rows={3}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          placeholder="Tóm tắt ngắn để Admin xem nhanh"
          className="resize-none rounded-xl border border-neutral-200 p-3 text-xs leading-relaxed outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4414] lg:col-span-2"
        />
        <textarea
          required
          rows={6}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Nội dung bài viết như bài báo, kinh nghiệm canh tác, quy trình xử lý..."
          className="resize-y rounded-xl border border-neutral-200 p-3 text-xs leading-relaxed outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4414] lg:col-span-2"
        />
        <label className="flex h-11 items-center rounded-xl border border-dashed border-neutral-300 px-3 text-xs font-bold text-neutral-600 transition-all hover:border-[#799583] hover:bg-[#f4f8f5] lg:col-span-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
            className="hidden"
          />
          {coverFile ? coverFile.name : "Đính kèm ảnh bìa JPG, PNG hoặc WEBP"}
        </label>
        <button
          type="submit"
          disabled={saving || !title.trim() || !excerpt.trim() || !content.trim()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-xs font-extrabold text-white transition-all hover:bg-[#244a37] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 lg:col-start-2"
        >
          {saving ? "Đang gửi..." : "Gửi Admin duyệt"}
          <ArrowUpRight size={14} />
        </button>
      </form>
    </section>
  );
}

function ArticleCard({ article }: { article: FarmerKnowledgeArticle }) {
  const coverImage = article.coverImage || FALLBACK_COVER_IMAGE;
  return (
    <Link
      href={`/dashboard/client/knowledge/${article.slug}`}
      className="group overflow-hidden rounded-[22px] border border-neutral-100 bg-white shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-1 hover:border-[#bdcbbf] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4420]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[#e9efe8]">
        <div
          role="img"
          aria-label={`Ảnh bìa bài viết ${article.title}`}
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.035]"
          style={{ backgroundImage: `url(${coverImage})` }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-white/25 bg-white/90 px-2.5 py-1.5 text-xs font-bold text-[#2E5A44] backdrop-blur-sm">
          {article.category}
        </span>
        {article.featured && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#EED56D] px-2.5 py-1.5 text-xs font-extrabold text-[#2E5A44]">
            <Sparkles size={10} />
            Nên đọc
          </span>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3 text-xs font-medium text-neutral-400">
          <span className="inline-flex items-center gap-1">
            <Clock3 size={10} />
            {article.readingTime}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye size={10} />
            {article.views.toLocaleString("vi-VN")}
          </span>
        </div>
        <h2 className="mt-3 line-clamp-2 text-[15px] font-extrabold tracking-tight text-neutral-900 transition-colors duration-200 group-hover:text-[#2E5A44]">
          {article.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-neutral-500">
          {article.excerpt}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <span className="min-w-0">
            <small className="block text-xs text-neutral-400">
              Biên soạn bởi
            </small>
            <b className="mt-1 block truncate text-xs text-neutral-700">
              {article.author}
            </b>
          </span>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf3ee] text-[#2E5A44] transition-all duration-200 group-hover:bg-[#2E5A44] group-hover:text-[#EED56D]">
            <ArrowUpRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function MyArticleStatusCard({ article }: { article: FarmerKnowledgeArticle }) {
  const meta = statusMeta[article.status];
  const coverImage = article.coverImage || FALLBACK_COVER_IMAGE;
  const body = (
    <article className="grid gap-3 rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm sm:grid-cols-[112px_1fr]">
      <div
        role="img"
        aria-label={`Ảnh bìa ${article.title}`}
        className="min-h-28 rounded-xl bg-cover bg-center"
        style={{ backgroundImage: `url(${coverImage})` }}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${meta.className}`}>
            {meta.label}
          </span>
          <small className="text-xs text-neutral-400">
            Cập nhật {article.updatedAt || "chưa có thời gian"}
          </small>
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-extrabold text-neutral-900">
          {article.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500">
          {article.excerpt}
        </p>
        {article.reviewedAt && (
          <small className="mt-2 block text-xs font-semibold text-neutral-400">
            Duyệt lúc {new Date(article.reviewedAt).toLocaleString("vi-VN")}
          </small>
        )}
        {article.rejectionReason && (
          <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {article.rejectionReason}
          </p>
        )}
      </div>
    </article>
  );

  if (article.status === "PUBLISHED") {
    return <Link href={`/dashboard/client/knowledge/${article.slug}`}>{body}</Link>;
  }
  return body;
}

export function FarmerKnowledgeBase() {
  const [articles, setArticles] = useState<FarmerKnowledgeArticle[]>([]);
  const [myArticles, setMyArticles] = useState<FarmerKnowledgeArticle[]>([]);
  const [query, setQuery] = useState("");
  const [statusTab, setStatusTab] = useState<KnowledgeStatusTab>("mine");
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [myArticlesLoading, setMyArticlesLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [myArticlesError, setMyArticlesError] = useState<string | null>(null);
  const loadPublishedArticles = async () => {
    setLibraryError(null);
    setLibraryLoading(true);
    try {
      const result = await knowledgeClient.list("PUBLISHED");
      setArticles(result.articles as FarmerKnowledgeArticle[]);
    } catch (error) {
      setLibraryError(
        error instanceof Error ? error.message : "Không thể tải thư viện kiến thức.",
      );
    } finally {
      setLibraryLoading(false);
    }
  };
  const loadMyArticles = async () => {
    setMyArticlesError(null);
    setMyArticlesLoading(true);
    try {
      const result = await knowledgeClient.listMine();
      setMyArticles(result.articles as FarmerKnowledgeArticle[]);
    } catch (error) {
      setMyArticlesError(
        error instanceof Error ? error.message : "Không thể tải bài đăng kiến thức.",
      );
    } finally {
      setMyArticlesLoading(false);
    }
  };

  useEffect(() => {
    void loadPublishedArticles();
    void loadMyArticles();
  }, []);
  const [category, setCategory] = useState("Tất cả");

  const visibleArticles = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return articles.filter((article) => {
      const matchesCategory =
        category === "Tất cả" ||
        article.category === category ||
        (category === "Kỹ thuật bón phân nghịch vụ" &&
          article.tags.includes("Nghịch vụ"));
      const matchesQuery =
        !normalized ||
        article.title.toLocaleLowerCase("vi").includes(normalized) ||
        article.excerpt.toLocaleLowerCase("vi").includes(normalized) ||
        article.tags.some((tag) =>
          tag.toLocaleLowerCase("vi").includes(normalized),
        );
      return matchesCategory && matchesQuery;
    });
  }, [articles, category, query]);

  const featured = articles.find((article) => article.featured) ?? articles[0];
  const statusArticles = myArticles.filter((article) => {
    if (statusTab === "review") return article.status === "REVIEW";
    if (statusTab === "published") return article.status === "PUBLISHED";
    return true;
  });
  const statusCounts: Record<KnowledgeStatusTab, number> = {
    mine: myArticles.length,
    review: myArticles.filter((article) => article.status === "REVIEW").length,
    published: myArticles.filter((article) => article.status === "PUBLISHED").length,
  };

  return (
    <div className="space-y-5">
      <section className="grid-pattern overflow-hidden rounded-[26px] bg-[#294f3b] p-6 text-white sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_380px] lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#EED56D]">
              <BookOpenText size={13} />
              VietGAP knowledge library
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Cẩm nang canh tác dành cho chủ vườn
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#d0ddd4] sm:text-xs">
              Quy trình thực địa được kỹ sư DurianCare biên soạn theo từng giai
              đoạn sinh trưởng, giống cây và rủi ro tại vườn.
            </p>
          </div>
          <label className="relative block">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#789183]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm Phytophthora, Kali, cắt tỉa..."
              className="h-12 w-full rounded-2xl border border-white/15 bg-white px-11 text-xs text-neutral-900 shadow-sm outline-none transition-all duration-200 placeholder:text-neutral-400 hover:border-white/40 focus-visible:ring-4 focus-visible:ring-[#EED56D]/25"
            />
          </label>
        </div>
      </section>

      <SubmissionPanel
        onSubmitted={async () => {
          setStatusTab("review");
          await loadMyArticles();
        }}
      />

      <section className="rounded-[22px] border border-neutral-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#75867a]">
              Theo dõi bài đăng
            </p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-neutral-900">
              Trạng thái kiến thức của tôi
            </h2>
          </span>
          <button
            type="button"
            onClick={() => void loadMyArticles()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            <RotateCw size={14} />
            Tải lại
          </button>
        </div>
        <div className="mt-4 grid gap-2 rounded-2xl bg-neutral-50 p-1 sm:grid-cols-3">
          {statusTabs.map((tab) => {
            const active = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusTab(tab.key);
                  void loadMyArticles();
                }}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-extrabold transition-all ${
                  active
                    ? "bg-[#2E5A44] text-white shadow-sm"
                    : "text-neutral-600 hover:bg-white"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    active ? "bg-white/15 text-white" : "bg-white text-neutral-400"
                  }`}
                >
                  {statusCounts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
        {myArticlesError && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            {myArticlesError}
          </div>
        )}
        <div className="mt-4 grid gap-3">
          {myArticlesLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl bg-neutral-100"
              />
            ))
          ) : statusArticles.length > 0 ? (
            statusArticles.map((article) => (
              <MyArticleStatusCard key={article.id} article={article} />
            ))
          ) : (
            <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 text-center">
              <span>
                <Sprout className="mx-auto text-neutral-300" size={28} />
                <b className="mt-3 block text-xs text-neutral-700">
                  Chưa có bài trong mục này
                </b>
                <p className="mt-1 text-xs text-neutral-400">
                  Bài mới gửi sẽ xuất hiện ở mục Chờ duyệt.
                </p>
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[22px] border border-neutral-100 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
            <SlidersHorizontal size={15} className="text-[#2E5A44]" />
            <span>
              <b className="block text-xs text-neutral-900">Danh mục</b>
              <small className="mt-0.5 block text-xs text-neutral-400">
                Lọc theo nhu cầu tại vườn
              </small>
            </span>
          </div>
          <div className="mt-3 space-y-1">
            {farmerCategories.map((item) => {
              const active = category === item;
              const count =
                item === "Tất cả"
                  ? articles.length
                  : articles.filter(
                      (article) =>
                        article.category === item ||
                        (item === "Kỹ thuật bón phân nghịch vụ" &&
                          article.tags.includes("Nghịch vụ")),
                    ).length;
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] ${
                    active
                      ? "bg-[#edf3ee] text-[#2E5A44]"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <span>{item}</span>
                  <span
                    className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-xs ${
                      active
                        ? "bg-white text-[#2E5A44]"
                        : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl bg-[#2E5A44] p-4 text-white">
            <Leaf size={18} className="text-[#EED56D]" />
            <b className="mt-4 block text-xs">Nguyên tắc VietGAP</b>
            <p className="mt-2 text-xs leading-relaxed text-[#d4dfd7]">
              Ghi chép đúng vật tư, thời gian cách ly và người thực hiện sau mỗi
              công việc.
            </p>
          </div>
        </aside>

        <main className="min-w-0">
          {libraryError && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
              <span>{libraryError}</span>
              <button
                type="button"
                onClick={() => void loadPublishedArticles()}
                className="rounded-lg bg-white px-3 py-1.5 text-red-700"
              >
                Thử lại
              </button>
            </div>
          )}
          {libraryLoading && (
            <div className="mb-5 h-56 animate-pulse rounded-[24px] bg-neutral-100" />
          )}
          {!libraryLoading && category === "Tất cả" && !query && featured && (
            <Link
              href={`/dashboard/client/knowledge/${featured.slug}`}
              className="group mb-5 grid overflow-hidden rounded-[24px] border border-[#d7e1d8] bg-[#f5f8f3] shadow-sm transition-all duration-200 hover:border-[#b7c8ba] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4420] md:grid-cols-[1.1fr_.9fr]"
            >
              <div className="p-5 sm:p-7">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EED56D] px-3 py-1.5 text-xs font-extrabold text-[#2E5A44]">
                  <Sparkles size={10} />
                  Chuyên đề nổi bật
                </span>
                <h2 className="mt-5 text-xl font-extrabold tracking-tight text-neutral-900 sm:text-2xl">
                  {featured.title}
                </h2>
                <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                  {featured.excerpt}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#2E5A44]">
                  Đọc chuyên đề
                  <ArrowUpRight
                    size={14}
                    className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </span>
              </div>
              <div
                role="img"
                aria-label={`Ảnh bìa ${featured.title}`}
                className="min-h-56 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${featured.coverImage || FALLBACK_COVER_IMAGE})`,
                }}
              />
            </Link>
          )}

          <div className="mb-4 flex items-end justify-between gap-3">
            <span>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#75867a]">
                Thư viện đã kiểm duyệt
              </p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight text-neutral-900">
                {category === "Tất cả" ? "Tất cả bài viết" : category}
              </h2>
            </span>
            <small className="text-xs text-neutral-400">
              {visibleArticles.length} bài phù hợp
            </small>
          </div>

          {libraryLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-[22px] bg-neutral-100"
                />
              ))}
            </div>
          ) : visibleArticles.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center rounded-[22px] border border-dashed border-neutral-200 bg-white text-center">
              <span>
                <Sprout className="mx-auto text-neutral-300" size={32} />
                <b className="mt-4 block text-xs text-neutral-700">
                  Chưa tìm thấy bài viết
                </b>
                <p className="mt-1 text-xs text-neutral-400">
                  Thử từ khóa ngắn hơn hoặc chọn danh mục khác.
                </p>
              </span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
