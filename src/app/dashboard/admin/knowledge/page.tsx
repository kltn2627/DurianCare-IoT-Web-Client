import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KnowledgeReviewWorkspace } from "@/components/knowledge-admin/KnowledgeReviewWorkspace";

export const metadata: Metadata = {
  title: "Quản lý kiến thức",
  description: "Biên tập thư viện kiến thức kỹ thuật sầu riêng DurianCare.",
};

export default async function KnowledgeManagementPage() {
  return (
    <DashboardShell role="ADMIN">
      <KnowledgeReviewWorkspace />
    </DashboardShell>
  );
}
