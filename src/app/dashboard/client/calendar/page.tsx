import type { Metadata } from "next";
import { CultivationCalendar } from "@/components/calendar/CultivationCalendar";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Lịch canh tác",
  description: "Điều phối công việc và chi phí vật tư cho vườn sầu riêng.",
};

export default function CultivationCalendarPage() {
  return (
    <DashboardShell role="OWNER">
      <CultivationCalendar />
    </DashboardShell>
  );
}


