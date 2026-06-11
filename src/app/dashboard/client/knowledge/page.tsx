import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { FarmerKnowledgeBase } from "@/components/farmer-knowledge/FarmerKnowledgeBase";

export const metadata: Metadata = {
  title: "Cẩm nang VietGAP",
  description:
    "Kho kiến thức kỹ thuật sầu riêng dành cho chủ vườn DurianCare.",
};

export default function FarmerKnowledgePage() {
  return (
    <DashboardShell role="OWNER">
      <FarmerKnowledgeBase />
    </DashboardShell>
  );
}
