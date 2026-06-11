import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { FarmerChatWorkspace } from "@/components/farmer-chat/FarmerChatWorkspace";

export const metadata: Metadata = {
  title: "Tư vấn AI & Kỹ sư",
  description:
    "Không gian hỏi đáp kỹ thuật và gửi yêu cầu cứu trợ của chủ vườn DurianCare.",
};

export default function FarmerChatPage() {
  return (
    <DashboardShell role="OWNER">
      <FarmerChatWorkspace />
    </DashboardShell>
  );
}
