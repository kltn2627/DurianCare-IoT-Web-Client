import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ZoneTreesWorkspace } from "@/components/trees/ZoneTreesWorkspace";

type PageProps = { params: Promise<{ farmId: string; zoneId: string }> };

export const metadata: Metadata = { title: "Bản đồ cây" };

export default async function ZoneTreesPage({ params }: PageProps) {
  const { farmId, zoneId } = await params;
  return (
    <DashboardShell role="OWNER">
      <ZoneTreesWorkspace farmId={farmId} zoneId={zoneId} />
    </DashboardShell>
  );
}
