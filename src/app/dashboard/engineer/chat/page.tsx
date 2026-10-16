import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ExpertChatWorkspace } from "@/components/expert-chat/ExpertChatWorkspace";

export const metadata: Metadata = {
  title: "Phòng chat kỹ sư",
  description: "Kỹ sư chat với nông hộ đã kết nối và gửi phác đồ điều trị.",
};

export default function EngineerChatPage() {
  return (
    <DashboardShell role="ENGINEER">
      <ExpertChatWorkspace />
    </DashboardShell>
  );
}
