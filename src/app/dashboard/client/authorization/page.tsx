import type { Metadata } from "next";
import { AuthorizationManager } from "@/components/dashboard/AuthorizationManager";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: "Ủy quyền vườn" };

export default function ClientAuthorizationPage() {
  return (
    <DashboardShell role="OWNER">
      <AuthorizationManager />
    </DashboardShell>
  );
}


