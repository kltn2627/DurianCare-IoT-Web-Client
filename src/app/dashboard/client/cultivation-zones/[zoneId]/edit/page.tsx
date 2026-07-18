import type { Metadata } from "next";
import { CreateCultivationZoneForm } from "@/components/cultivation-zones/CreateCultivationZoneForm";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

type PageProps = { params: Promise<{ zoneId: string }> };

export const metadata: Metadata = { title: "Sửa khu canh tác" };

export default async function EditCultivationZonePage({ params }: PageProps) {
  const { zoneId } = await params;
  return (
    <DashboardShell role="OWNER">
      <CreateCultivationZoneForm zoneId={zoneId} />
    </DashboardShell>
  );
}
