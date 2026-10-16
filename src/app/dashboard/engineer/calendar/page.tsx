import type { Metadata } from "next";
import { CultivationCalendar } from "@/components/dashboard/CultivationCalendar";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Lịch điều trị kỹ sư" };

export default function EngineerCalendarPage() {
  return (
    <DashboardShell role="ENGINEER">
      <CultivationCalendar role="ENGINEER" />
    </DashboardShell>
  );
}
