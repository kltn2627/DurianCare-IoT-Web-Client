import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KnowledgeArticleReader } from "@/components/farmer-knowledge/KnowledgeArticleReader";
import type {
  FarmerKnowledgeArticle,
  KnowledgeSection,
} from "@/components/farmer-knowledge/types";
import {
  knowledgeArticleSections,
  knowledgeArticles,
} from "@/constants/durianMockData";

const articles = knowledgeArticles as FarmerKnowledgeArticle[];
const sectionMap = knowledgeArticleSections as Record<
  string,
  KnowledgeSection[]
>;

export function generateStaticParams() {
  return articles
    .filter((article) => article.status === "PUBLISHED")
    .map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find(
    (item) => item.slug === slug && item.status === "PUBLISHED",
  );
  return {
    title: article?.title ?? "Không tìm thấy bài viết",
    description: article?.excerpt,
  };
}

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles.find(
    (item) => item.slug === slug && item.status === "PUBLISHED",
  );

  if (!article) notFound();

  return (
    <DashboardShell role="OWNER">
      <KnowledgeArticleReader
        article={article}
        sections={sectionMap[article.slug] ?? []}
      />
    </DashboardShell>
  );
}
