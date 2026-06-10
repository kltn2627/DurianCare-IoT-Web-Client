import type { Metadata } from "next";
import { CultivationCalendar } from "@/components/dashboard/CultivationCalendar";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Lịch canh tác" };

export default function ClientCultivationCalendarPage() {
  return (
    <DashboardShell role="OWNER">
      <CultivationCalendar role="OWNER" />
    </DashboardShell>
  );
}


