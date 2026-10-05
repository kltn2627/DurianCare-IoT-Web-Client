import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ExportCompliancePanel } from "@/components/export/ExportCompliancePanel";

export const metadata: Metadata = { title: "Đánh giá Xuất khẩu Sầu riêng" };

export default function ExportCompliancePage() {
  return (
    <DashboardShell role="OWNER">
      <ExportCompliancePanel />
    </DashboardShell>
  );
}
