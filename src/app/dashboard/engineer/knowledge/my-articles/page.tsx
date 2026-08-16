import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KnowledgeMyArticles } from "@/components/knowledge-authoring/KnowledgeAuthoringWorkspace";

export const metadata: Metadata = {
  title: "Bài viết của tôi",
  description: "Kỹ sư quản lý bài kiến thức đã tạo.",
};

export default function EngineerMyKnowledgePage() {
  return (
    <DashboardShell role="ENGINEER">
      <KnowledgeMyArticles role="ENGINEER" />
    </DashboardShell>
  );
}
