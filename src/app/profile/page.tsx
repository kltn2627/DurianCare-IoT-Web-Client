import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DashboardShell, type DashboardRole } from "@/components/dashboard/DashboardShell";
import { ProfileView } from "@/components/dashboard/ProfileView";
import { userProfiles } from "@/constants/durianMockData";

export const metadata: Metadata = { title: "Thông tin hồ sơ" };

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const cookieRole = cookieStore.get("durian-role")?.value;
  const role: DashboardRole = cookieRole === "OWNER" || cookieRole === "ENGINEER" ? cookieRole : "ADMIN";
  const profile = userProfiles[role];

  return (
    <DashboardShell role={role} userName={profile.name}>
      <ProfileView profile={profile} />
    </DashboardShell>
  );
}

