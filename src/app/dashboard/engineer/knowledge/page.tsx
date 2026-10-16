import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KnowledgeWorkspace } from "@/components/knowledge/KnowledgeWorkspace";

export const metadata: Metadata = {
  title: "Tri thức kỹ sư",
  description: "Kỹ sư biên soạn và tham khảo thư viện kỹ thuật sầu riêng.",
};

export default function EngineerKnowledgePage() {
  return (
    <DashboardShell role="ENGINEER">
      <KnowledgeWorkspace role="ENGINEER" />
    </DashboardShell>
  );
}
