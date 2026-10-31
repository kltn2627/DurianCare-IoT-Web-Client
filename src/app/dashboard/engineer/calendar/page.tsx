import type { Metadata } from "next";
import { CultivationCalendarWorkspace } from "@/features/cultivation-calendar/CultivationCalendarWorkspace";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Lịch điều trị kỹ sư" };

export default function EngineerCalendarPage() {
  return (
    <DashboardShell role="ENGINEER">
      <CultivationCalendarWorkspace initialView="calendar" />
    </DashboardShell>
  );
}
