import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KnowledgeMyArticles } from "@/components/knowledge-authoring/KnowledgeAuthoringWorkspace";

export const metadata: Metadata = {
  title: "Bài viết của tôi",
  description: "Quản trị viên quản lý bài kiến thức đã tạo.",
};

export default function AdminMyKnowledgePage() {
  return (
    <DashboardShell role="ADMIN">
      <KnowledgeMyArticles role="ADMIN" />
    </DashboardShell>
  );
}
