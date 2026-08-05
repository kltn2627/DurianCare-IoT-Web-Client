import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KnowledgeArticlePageClient } from "@/components/farmer-knowledge/KnowledgeArticlePageClient";

export const metadata: Metadata = {
  title: "Bài viết kiến thức",
  description: "Bài viết kiến thức đã được Admin DurianCare duyệt.",
};

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <DashboardShell role="OWNER">
      <KnowledgeArticlePageClient slug={slug} />
    </DashboardShell>
  );
}

