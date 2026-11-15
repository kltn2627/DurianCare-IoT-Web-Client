import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { TreeQrRedirect } from "@/components/trees/TreeQrRedirect";

type PageProps = { params: Promise<{ treeId: string }> };

export const metadata: Metadata = { title: "Mở cây từ mã QR" };

export default async function TreeQrPage({ params }: PageProps) {
  const { treeId } = await params;
  return (
    <DashboardShell role="OWNER">
      <TreeQrRedirect treeId={treeId} />
    </DashboardShell>
  );
}
