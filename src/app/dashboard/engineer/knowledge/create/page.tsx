import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KnowledgeArticleEditor } from "@/components/knowledge-authoring/KnowledgeAuthoringWorkspace";

export const metadata: Metadata = {
  title: "Viết bài kiến thức",
  description: "Kỹ sư tạo bài kiến thức gửi quản trị viên duyệt.",
};

export default function EngineerCreateKnowledgePage() {
  return (
    <DashboardShell role="ENGINEER">
      <KnowledgeArticleEditor role="ENGINEER" mode="create" />
    </DashboardShell>
  );
}
