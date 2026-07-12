import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DiseaseDiagnosisWorkspace } from "@/components/ai/DiseaseDiagnosisWorkspace";

export const metadata: Metadata = { title: "Chẩn đoán AI" };

export default function ClientDiagnosisPage() {
  return (
    <DashboardShell role="OWNER">
      <DiseaseDiagnosisWorkspace />
    </DashboardShell>
  );
}
