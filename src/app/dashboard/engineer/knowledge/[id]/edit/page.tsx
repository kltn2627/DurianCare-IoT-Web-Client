import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KnowledgeArticleEditor } from "@/components/knowledge-authoring/KnowledgeAuthoringWorkspace";

export const metadata: Metadata = {
  title: "Chỉnh sửa bài kiến thức",
  description: "Kỹ sư chỉnh sửa bản nháp hoặc bài kiến thức bị từ chối.",
};

export default async function EngineerEditKnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DashboardShell role="ENGINEER">
      <KnowledgeArticleEditor role="ENGINEER" mode="edit" articleId={id} />
    </DashboardShell>
  );
}
