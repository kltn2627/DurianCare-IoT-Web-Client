import type { Metadata } from "next";
import { CultivationCalendarWorkspace } from "@/features/cultivation-calendar/CultivationCalendarWorkspace";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Lịch canh tác" };

export default async function AdminCultivationCalendarPage() {
  return (
    <DashboardShell role="ADMIN">
      <CultivationCalendarWorkspace initialView="calendar" />
    </DashboardShell>
  );
}


