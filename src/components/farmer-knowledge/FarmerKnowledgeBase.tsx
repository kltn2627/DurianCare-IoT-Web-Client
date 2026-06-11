"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpenText,
  Clock3,
  Eye,
  Leaf,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sprout,
} from "lucide-react";
import {
  knowledgeArticles,
  knowledgeCategories,
} from "@/constants/durianMockData";
import type { FarmerKnowledgeArticle } from "./types";

const articles = (knowledgeArticles as FarmerKnowledgeArticle[]).filter(
  (article) => article.status === "PUBLISHED",
);

const farmerCategories = [
  "Tất cả",
  "Dinh dưỡng",
  "Sâu bệnh",
  "Kỹ thuật canh tác",
  "Kỹ thuật bón phân nghịch vụ",
  "Kỹ thuật cắt tỉa",
].filter((category) => knowledgeCategories.includes(category));

function ArticleCard({ article }: { article: FarmerKnowledgeArticle }) {
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
          style={{ backgroundImage: `url(${article.coverImage})` }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-white/25 bg-white/90 px-2.5 py-1.5 text-[7px] font-bold text-[#2E5A44] backdrop-blur-sm">
          {article.category}
        </span>
        {article.featured && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#EED56D] px-2.5 py-1.5 text-[7px] font-extrabold text-[#2E5A44]">
            <Sparkles size={10} />
            Nên đọc
          </span>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3 text-[7px] font-medium text-neutral-400">
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
        <p className="mt-2 line-clamp-3 text-[9px] leading-relaxed text-neutral-500">
          {article.excerpt}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <span className="min-w-0">
            <small className="block text-[7px] text-neutral-400">
              Biên soạn bởi
            </small>
            <b className="mt-1 block truncate text-[8px] text-neutral-700">
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

export function FarmerKnowledgeBase() {
  const [query, setQuery] = useState("");
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
  }, [category, query]);

  const featured = articles.find((article) => article.featured) ?? articles[0];

  return (
    <div className="space-y-5">
      <section className="grid-pattern overflow-hidden rounded-[26px] bg-[#294f3b] p-6 text-white sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_380px] lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.2em] text-[#EED56D]">
              <BookOpenText size={13} />
              VietGAP knowledge library
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Cẩm nang canh tác dành cho chủ vườn
            </h1>
            <p className="mt-2 text-[10px] leading-relaxed text-[#d0ddd4] sm:text-[11px]">
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
              className="h-12 w-full rounded-2xl border border-white/15 bg-white px-11 text-[10px] text-neutral-900 shadow-sm outline-none transition-all duration-200 placeholder:text-neutral-400 hover:border-white/40 focus-visible:ring-4 focus-visible:ring-[#EED56D]/25"
            />
          </label>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[22px] border border-neutral-100 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
            <SlidersHorizontal size={15} className="text-[#2E5A44]" />
            <span>
              <b className="block text-[10px] text-neutral-900">Danh mục</b>
              <small className="mt-0.5 block text-[7px] text-neutral-400">
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
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[9px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5A44] ${
                    active
                      ? "bg-[#edf3ee] text-[#2E5A44]"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <span>{item}</span>
                  <span
                    className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[7px] ${
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
            <b className="mt-4 block text-[10px]">Nguyên tắc VietGAP</b>
            <p className="mt-2 text-[8px] leading-relaxed text-[#d4dfd7]">
              Ghi chép đúng vật tư, thời gian cách ly và người thực hiện sau mỗi
              công việc.
            </p>
          </div>
        </aside>

        <main className="min-w-0">
          {category === "Tất cả" && !query && featured && (
            <Link
              href={`/dashboard/client/knowledge/${featured.slug}`}
              className="group mb-5 grid overflow-hidden rounded-[24px] border border-[#d7e1d8] bg-[#f5f8f3] shadow-sm transition-all duration-200 hover:border-[#b7c8ba] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2E5A4420] md:grid-cols-[1.1fr_.9fr]"
            >
              <div className="p-5 sm:p-7">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EED56D] px-3 py-1.5 text-[7px] font-extrabold text-[#2E5A44]">
                  <Sparkles size={10} />
                  Chuyên đề nổi bật
                </span>
                <h2 className="mt-5 text-xl font-extrabold tracking-tight text-neutral-900 sm:text-2xl">
                  {featured.title}
                </h2>
                <p className="mt-3 text-[10px] leading-relaxed text-neutral-500">
                  {featured.excerpt}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-[9px] font-bold text-[#2E5A44]">
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
                style={{ backgroundImage: `url(${featured.coverImage})` }}
              />
            </Link>
          )}

          <div className="mb-4 flex items-end justify-between gap-3">
            <span>
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#75867a]">
                Thư viện đã kiểm duyệt
              </p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight text-neutral-900">
                {category === "Tất cả" ? "Tất cả bài viết" : category}
              </h2>
            </span>
            <small className="text-[8px] text-neutral-400">
              {visibleArticles.length} bài phù hợp
            </small>
          </div>

          {visibleArticles.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center rounded-[22px] border border-dashed border-neutral-200 bg-white text-center">
              <span>
                <Sprout className="mx-auto text-neutral-300" size={32} />
                <b className="mt-4 block text-[11px] text-neutral-700">
                  Chưa tìm thấy bài viết
                </b>
                <p className="mt-1 text-[8px] text-neutral-400">
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
