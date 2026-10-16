import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CultivationCalendarWorkspace } from "@/features/cultivation-calendar/CultivationCalendarWorkspace";

export const metadata: Metadata = {
  title: "Lịch canh tác",
  description: "Điều phối công việc và chi phí vật tư cho vườn sầu riêng.",
};

export default function CultivationCalendarPage() {
  return (
    <DashboardShell role="OWNER">
      <CultivationCalendarWorkspace initialView="calendar" />
    </DashboardShell>
  );
}


