import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KnowledgeArticleEditor } from "@/components/knowledge-authoring/KnowledgeAuthoringWorkspace";

export const metadata: Metadata = {
  title: "Viết bài kiến thức",
  description: "Quản trị viên tạo bài kiến thức DurianCare.",
};

export default function AdminCreateKnowledgePage() {
  return (
    <DashboardShell role="ADMIN">
      <KnowledgeArticleEditor role="ADMIN" mode="create" />
    </DashboardShell>
  );
}
