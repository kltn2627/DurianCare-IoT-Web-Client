import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CultivationCalendar } from "@/components/dashboard/CultivationCalendar";
import { DashboardShell, type DashboardRole } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Lịch canh tác" };

export default async function AdminCultivationCalendarPage() {
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get("durian-role")?.value;
  const role: DashboardRole = roleCookie === "ENGINEER" ? "ENGINEER" : "ADMIN";

  return (
    <DashboardShell role={role}>
      <CultivationCalendar role={role} />
    </DashboardShell>
  );
}


