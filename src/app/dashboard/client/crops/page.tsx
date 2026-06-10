import type { Metadata } from "next";
import { CropQrBuilder } from "@/components/dashboard/CropQrBuilder";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Vụ mùa & QR" };

export default function ClientCropsPage() {
  return (
    <DashboardShell role="OWNER">
      <CropQrBuilder />
    </DashboardShell>
  );
}


