import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { FarmsWorkspace } from "@/components/trees/FarmsWorkspace";

export const metadata: Metadata = { title: "Bản đồ cây - Trang trại" };

export default function FarmsPage() {
  return (
    <DashboardShell role="OWNER">
      <FarmsWorkspace />
    </DashboardShell>
  );
}
