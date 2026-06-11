import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  DashboardShell,
  type DashboardRole,
} from "@/components/dashboard/DashboardShell";
import { KnowledgeWorkspace } from "@/components/knowledge/KnowledgeWorkspace";

export const metadata: Metadata = {
  title: "Quản lý kiến thức",
  description: "Biên tập thư viện kiến thức kỹ thuật sầu riêng DurianCare.",
};

export default async function KnowledgeManagementPage() {
  const cookieStore = await cookies();
  const cookieRole = cookieStore.get("durian-role")?.value;
  const role: DashboardRole = cookieRole === "ENGINEER" ? "ENGINEER" : "ADMIN";

  return (
    <DashboardShell role={role}>
      <KnowledgeWorkspace role={role} />
    </DashboardShell>
  );
}
