import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DiagnosisLog } from "@/components/dashboard/DiagnosisLog";

export const metadata: Metadata = { title: "Nhật ký AI" };

export default function ClientDiagnosisPage() {
  return (
    <DashboardShell role="OWNER">
      <DiagnosisLog />
    </DashboardShell>
  );
}


