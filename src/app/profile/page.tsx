import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell, type DashboardRole } from "@/components/dashboard/DashboardShell";
import { ProfileView } from "@/components/dashboard/ProfileView";
import { readSession } from "@/lib/auth/server";
import { toDashboardRole } from "@/lib/auth/types";

export const metadata: Metadata = { title: "Hồ sơ cá nhân" };

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const session = readSession(cookieStore);
  if (!session) redirect("/login");
  const dashboardRole = toDashboardRole(session.role);
  if (!dashboardRole) redirect("/login");
  const role: DashboardRole = dashboardRole;

  return (
    <DashboardShell role={role} userName={session.profile.fullName}>
      <ProfileView />
    </DashboardShell>
  );
}
