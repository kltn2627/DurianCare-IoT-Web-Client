import type { Metadata } from "next";
import { CultivationZonesWorkspace } from "@/components/cultivation-zones/CultivationZonesWorkspace";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Khu canh tác" };

export default function CultivationZonesPage() {
  return (
    <DashboardShell role="OWNER">
      <CultivationZonesWorkspace />
    </DashboardShell>
  );
}
