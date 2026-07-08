import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DashboardShell,
  type DashboardRole,
} from "@/components/dashboard/DashboardShell";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { readSession } from "@/lib/auth/server";
import { toDashboardRole } from "@/lib/auth/types";

export const metadata: Metadata = {
  title: "Thông báo",
  description: "Hộp thư thông báo và cảnh báo hệ thống của DurianCare.",
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const session = readSession(cookieStore);
  if (!session) redirect("/login");
  const dashboardRole = toDashboardRole(session.role);
  if (!dashboardRole) redirect("/login");
  const role: DashboardRole = dashboardRole;

  return (
    <DashboardShell role={role} userName={session.profile.fullName}>
      <NotificationInbox />
    </DashboardShell>
  );
}
