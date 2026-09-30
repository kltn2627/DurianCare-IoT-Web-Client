"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Sprout } from "lucide-react";
import { KnowledgeApiError, knowledgeClient } from "@/lib/knowledge/client";
import type { KnowledgeArticle } from "@/lib/knowledge/types";
import { KnowledgeArticleReader } from "./KnowledgeArticleReader";

function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <div className="h-10 w-44 animate-pulse rounded-xl bg-neutral-100" />
      <div className="rounded-[24px] border border-[#dce7de] bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        <div className="h-7 w-32 animate-pulse rounded-full bg-neutral-100" />
        <div className="mt-6 h-10 w-5/6 animate-pulse rounded bg-neutral-100" />
        <div className="mt-3 h-10 w-3/5 animate-pulse rounded bg-neutral-100" />
        <div className="mt-5 h-6 w-4/5 animate-pulse rounded bg-neutral-100" />
        <div className="mt-7 flex gap-3">
          <div className="size-12 animate-pulse rounded-2xl bg-neutral-100" />
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
            <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
        <div className="mt-7 aspect-[16/7] animate-pulse rounded-[20px] bg-neutral-100" />
        <div className="mx-auto mt-9 max-w-[820px] space-y-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className={`h-4 animate-pulse rounded bg-neutral-100 ${
                index % 3 === 0 ? "w-11/12" : index % 3 === 1 ? "w-full" : "w-4/5"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StateCard({
  title,
  description,
  retry,
}: {
  title: string;
  description: string;
  retry?: () => void;
}) {
  return (
    <div className="grid min-h-96 place-items-center rounded-[24px] border border-[#dce7de] bg-white p-6 text-center shadow-sm">
      <span className="max-w-md">
        <Sprout className="mx-auto text-neutral-300" size={36} />
        <b className="mt-4 block text-lg text-neutral-900">{title}</b>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">{description}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {retry && (
            <button
              type="button"
              onClick={retry}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E5A44] px-4 text-sm font-extrabold text-white transition hover:bg-[#244a37]"
            >
              <RefreshCw size={15} />
              Thử lại
            </button>
          )}
          <Link
            href="/dashboard/client/knowledge"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce7de] bg-white px-4 text-sm font-extrabold text-[#2E5A44] transition hover:bg-[#f5faf5]"
          >
            <ArrowLeft size={15} />
            Quay lại thư viện kiến thức
          </Link>
        </div>
      </span>
    </div>
  );
}

export function KnowledgeArticlePageClient({ slug }: { slug: string }) {
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [related, setRelated] = useState<KnowledgeArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const result = await knowledgeClient.get(slug);
      setArticle(result);
      knowledgeClient
        .related(slug, 4)
        .then((page) => setRelated(page.articles))
        .catch(() => setRelated([]));
    } catch (exception) {
      setArticle(null);
      setRelated([]);
      if (exception instanceof KnowledgeApiError && exception.status === 404) {
        setNotFound(true);
      } else {
        setError(
          exception instanceof Error
            ? exception.message
            : "Đã xảy ra lỗi khi tải nội dung. Vui lòng thử lại.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <ArticleSkeleton />;

  if (notFound) {
    return (
      <StateCard
        title="Không tìm thấy bài viết"
        description="Bài viết có thể đã bị xóa, chưa được xuất bản hoặc đường dẫn không hợp lệ."
      />
    );
  }

  if (error || !article) {
    return (
      <StateCard
        title="Không thể tải bài viết"
        description={error || "Đã xảy ra lỗi khi tải nội dung. Vui lòng thử lại."}
        retry={() => void load()}
      />
    );
  }

  return <KnowledgeArticleReader article={article} relatedArticles={related} />;
}
