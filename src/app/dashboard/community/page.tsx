import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CommunityWorkspace } from "@/components/community/CommunityWorkspace";
import { DashboardShell, type DashboardRole } from "@/components/dashboard/DashboardShell";
import { readSession } from "@/lib/auth/server";
import { toDashboardRole } from "@/lib/auth/types";

export const metadata: Metadata = {
  title: "Cộng đồng DurianCare",
  description: "Không gian hỏi đáp và chia sẻ kinh nghiệm trồng sầu riêng giữa nhà vườn và kỹ sư.",
};

export default async function CommunityPage() {
  const cookieStore = await cookies();
  const session = readSession(cookieStore);
  if (!session) redirect("/login");
  const dashboardRole = toDashboardRole(session.role);
  if (!dashboardRole) redirect("/login");
  const role: DashboardRole = dashboardRole;

  return (
    <DashboardShell role={role} userName={session.profile.fullName}>
      <CommunityWorkspace />
    </DashboardShell>
  );
}
