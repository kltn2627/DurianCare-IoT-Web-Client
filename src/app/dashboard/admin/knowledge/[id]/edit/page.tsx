import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KnowledgeArticleEditor } from "@/components/knowledge-authoring/KnowledgeAuthoringWorkspace";

export const metadata: Metadata = {
  title: "Chỉnh sửa bài kiến thức",
  description: "Quản trị viên chỉnh sửa bài kiến thức DurianCare.",
};

export default async function AdminEditKnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DashboardShell role="ADMIN">
      <KnowledgeArticleEditor role="ADMIN" mode="edit" articleId={id} />
    </DashboardShell>
  );
}
