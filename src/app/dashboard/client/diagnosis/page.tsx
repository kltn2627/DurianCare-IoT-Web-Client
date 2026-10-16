import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DiseaseDiagnosisWorkspace } from "@/components/ai/DiseaseDiagnosisWorkspace";

export const metadata: Metadata = { title: "Chẩn đoán AI" };

interface Props {
  searchParams: Promise<{ treeId?: string; treeCode?: string }>;
}

export default async function ClientDiagnosisPage({ searchParams }: Props) {
  const { treeId, treeCode } = await searchParams;
  return (
    <DashboardShell role="OWNER">
      <DiseaseDiagnosisWorkspace treeId={treeId ?? null} treeCode={treeCode ?? null} />
    </DashboardShell>
  );
}
