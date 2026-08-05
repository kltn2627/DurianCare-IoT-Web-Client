import type { Metadata } from "next";
import { AdminChatDispatch } from "@/components/expert-chat/AdminChatDispatch";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Điều phối & tư vấn nhà vườn",
  description:
    "Không gian điều phối của Admin và workspace tư vấn dành cho Kỹ sư DurianCare.",
};

export default async function ExpertChatPage() {
  return (
    <DashboardShell role="ADMIN">
      <AdminChatDispatch />
    </DashboardShell>
  );
}
