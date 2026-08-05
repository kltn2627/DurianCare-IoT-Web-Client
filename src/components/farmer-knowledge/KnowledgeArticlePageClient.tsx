"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sprout } from "lucide-react";
import { knowledgeClient } from "@/lib/knowledge/client";
import { KnowledgeArticleReader } from "./KnowledgeArticleReader";
import type { FarmerKnowledgeArticle } from "./types";

export function KnowledgeArticlePageClient({ slug }: { slug: string }) {
  const [article, setArticle] = useState<FarmerKnowledgeArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    knowledgeClient
      .get(slug)
      .then((result) => {
        if (active) setArticle(result as FarmerKnowledgeArticle);
      })
      .catch((exception: Error) => {
        if (active) setError(exception.message || "Không thể tải bài viết.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="grid min-h-96 place-items-center rounded-[22px] border border-neutral-100 bg-white text-center">
        <span>
          <Sprout className="mx-auto animate-pulse text-[#2E5A44]" size={32} />
          <b className="mt-4 block text-xs text-neutral-700">Đang tải bài viết</b>
        </span>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="grid min-h-96 place-items-center rounded-[22px] border border-neutral-100 bg-white text-center">
        <span>
          <Sprout className="mx-auto text-neutral-300" size={32} />
          <b className="mt-4 block text-xs text-neutral-700">Không tìm thấy bài viết</b>
          <p className="mt-1 text-xs text-neutral-400">{error}</p>
          <Link
            href="/dashboard/client/knowledge"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2E5A44] px-3 py-2 text-xs font-bold text-white"
          >
            <ArrowLeft size={14} />
            Trở lại trang kiến thức
          </Link>
        </span>
      </div>
    );
  }

  return (
    <KnowledgeArticleReader
      article={article}
      sections={[]}
    />
  );
}
