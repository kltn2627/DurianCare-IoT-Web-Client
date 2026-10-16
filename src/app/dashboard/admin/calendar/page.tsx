import type { Metadata } from "next";
import { CultivationCalendar } from "@/components/dashboard/CultivationCalendar";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Lịch canh tác" };

export default async function AdminCultivationCalendarPage() {
  return (
    <DashboardShell role="ADMIN">
      <CultivationCalendar role="ADMIN" />
    </DashboardShell>
  );
}


