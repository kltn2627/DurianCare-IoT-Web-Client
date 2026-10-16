import type { Metadata } from "next";
import { CultivationZoneDetail } from "@/components/cultivation-zones/CultivationZoneDetail";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

type PageProps = { params: Promise<{ zoneId: string }> };

export const metadata: Metadata = { title: "Chi tiết khu canh tác" };

export default async function CultivationZoneDetailPage({ params }: PageProps) {
  const { zoneId } = await params;
  return (
    <DashboardShell role="OWNER">
      <CultivationZoneDetail zoneId={zoneId} />
    </DashboardShell>
  );
}
