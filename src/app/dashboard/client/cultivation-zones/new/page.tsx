import type { Metadata } from "next";
import { CreateCultivationZoneForm } from "@/components/cultivation-zones/CreateCultivationZoneForm";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Tạo khu canh tác" };

export default function CreateCultivationZonePage() {
  return (
    <DashboardShell role="OWNER">
      <CreateCultivationZoneForm />
    </DashboardShell>
  );
}
